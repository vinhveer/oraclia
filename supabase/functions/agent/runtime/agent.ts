import type { Casting, DrawnCard, ModelMessage } from '../../_shared/types.ts'
import type { ModelAdapter } from './model/factory.ts'
import type { ConversationRepository } from './repositories/conversations.ts'
import type { RunRepository } from './repositories/runs.ts'
import { checkToolCall } from './policy.ts'
import type { ToolRegistry } from './tools/registry.ts'
import type { ToolContext } from './tools/tool.ts'
import type { StreamController } from './stream.ts'

/** Số lượt model tối đa trong một request. */
const MAX_STEPS = 6
/**
 * Trần cho cả run, cộng dồn qua mọi lần nối tiếp (lật bài, trả lời làm rõ).
 * Thiếu nó thì mỗi request lại được 6 bước mới và một run có thể chạy mãi.
 */
const MAX_RUN_STEPS = 14

export interface AgentDeps {
  adapter: ModelAdapter
  registry: ToolRegistry
  runs: RunRepository
  conversations: ConversationRepository
  stream: StreamController
}

export interface AgentRun {
  runId: string
  conversationId: string
  userId: string
  /** Các lá đã lật trong run này, gắn vào tin nhắn của trợ lý khi lưu. */
  cards: DrawnCard[] | null
  /** Quẻ đã gieo trước đó trong cùng run, khi lượt này chỉ là phần nối tiếp. */
  casting?: Casting | null
  /**
   * Lượt phản tư chạy sau lưng người dùng: nó chỉ gọi tool, và chữ nó viết ra
   * không phải câu trả lời nên không được lưu vào hội thoại.
   */
  persistMessage?: boolean
  /** Số bước run đã đi ở các request trước, đọc từ `agent_runs.step_count`. */
  stepsTaken?: number
  /** Gọi sau khi câu trả lời đã lưu; dùng cho việc nền như ghi lại lượt đọc. */
  onCompleted?: (completed: {
    messageId: string
    content: string
    cards: DrawnCard[] | null
    casting: Casting | null
  }) => void
  toolContext: Omit<ToolContext, 'onCasting'>
}

/**
 * Vòng lặp agent. Mỗi lượt model hoặc trả lời — kết thúc run — hoặc gọi tool.
 * Một tool có thể ngắt, khi đó run đỗ ở `awaiting_input` với transcript đã lưu,
 * để một request sau nối tiếp đúng mạch nghĩ đang dở.
 */
export class Agent {
  constructor(private readonly deps: AgentDeps) {}

  async run(run: AgentRun, messages: ModelMessage[]): Promise<void> {
    const { adapter, registry, runs, conversations, stream } = this.deps
    const tools = registry.definitions()
    const state = [...messages]
    // Giữ lại quẻ đã gieo ở lượt trước của cùng run: một lượt hỏi làm rõ xen vào
    // giữa sẽ cắt run làm hai request, và nếu không mang theo thì tin nhắn cuối
    // mất quẻ.
    let casting: Casting | null = run.casting ?? null

    const toolContext: ToolContext = {
      ...run.toolContext,
      onCasting: (value) => {
        casting = value
      },
    }

    let steps = run.stepsTaken ?? 0
    const budget = Math.min(steps + MAX_STEPS, MAX_RUN_STEPS)

    try {
      while (steps < budget) {
        if (stream.aborted) {
          await runs.save(run.runId, state, steps, 'failed', 'Kết nối bị ngắt.')
          return
        }

        const stepStarted = Date.now()
        const result = await adapter.step(state, tools, {
          onDelta: (delta) => stream.emit({ type: 'message.delta', content: delta }),
          onReasoning: (delta) => stream.emit({ type: 'thinking.delta', content: delta }),
        })
        steps += 1
        void runs.recordCall({
          runId: run.runId,
          userId: run.userId,
          step: steps,
          model: adapter.name,
          latencyMs: Date.now() - stepStarted,
          result,
        })

        // Mỗi bước một tool. Đã xin parallel_tool_calls=false, nhưng không phải
        // provider nào cũng nghe; call thứ hai trở đi bị bỏ ngay từ đây để
        // transcript không có call nào thiếu kết quả.
        const calls = result.toolCalls.slice(0, 1)
        const assistantTurn: ModelMessage = {
          role: 'assistant',
          content: result.content || null,
          ...(calls.length ? { tool_calls: calls } : {}),
        }
        state.push(assistantTurn)
        if (calls.length && result.content) {
          // Chữ viết ra trước một tool call là câu dở dang; báo client bỏ bản nháp.
          stream.emit({ type: 'draft.discarded' })
        }

        if (!calls.length) {
          if (run.persistMessage !== false) {
            // Chạm trần max_tokens: lưu phần đã có nhưng nói rõ là bị cắt, để người
            // đọc không tưởng bài đọc kết thúc lửng là cố ý.
            let content = result.content
            if (result.finishReason === 'length') {
              const notice = '\n\n*(Bài đọc bị cắt vì vượt giới hạn độ dài.)*'
              content += notice
              stream.emit({ type: 'message.delta', content: notice })
            }
            const messageId = await conversations.addMessage(
              run.conversationId,
              run.userId,
              'assistant',
              content,
              run.cards,
              casting,
              run.runId,
            )
            stream.emit({ type: 'message.completed', message_id: messageId })
            run.onCompleted?.({ messageId, content, cards: run.cards, casting })
          }
          await runs.save(run.runId, state, steps, 'completed', null)
          stream.emit({ type: 'run.completed', run_id: run.runId, status: 'completed' })
          return
        }

        let interrupted = false
        const answered: typeof calls = []
        const guard = (call: (typeof calls)[number], args: Record<string, unknown>) =>
          checkToolCall(call, args, {
            transcript: state,
            revealedNames: revealedNames(run.cards, casting),
          })
        for (const call of calls) {
          answered.push(call)
          const outcome = await registry.execute(call, toolContext, guard)
          if (outcome.kind === 'interrupt') {
            interrupted = true
            break
          }
          state.push({ role: 'tool', tool_call_id: call.id, content: outcome.content })
        }

        if (interrupted) {
          // Mọi tool call còn nằm trong transcript đều phải có kết quả tương ứng,
          // nếu không provider sẽ từ chối request nối tiếp. Những call xếp sau
          // chỗ ngắt thì chưa chạy, nên bỏ đi.
          assistantTurn.tool_calls = answered
          await runs.save(run.runId, state, steps, 'awaiting_input', null)
          stream.emit({ type: 'run.completed', run_id: run.runId, status: 'awaiting_input' })
          return
        }

        // Checkpoint sau mỗi vòng tool: worker chết ở bước sau thì transcript
        // tới đây vẫn còn, và updated_at mới cho biết run vẫn đang sống.
        await runs.save(run.runId, state, steps, 'running', null)
      }
    } catch (exception) {
      // Lỗi giữa chừng phải khép run lại; để nguyên `running` thì nó treo tới
      // khi bị quét, còn người hỏi không biết vì sao.
      const message = exception instanceof Error ? exception.message : 'Không thể đọc bài lúc này.'
      await runs.save(run.runId, state, steps, 'failed', message).catch(() => undefined)
      stream.emit({ type: 'run.error', message })
      return
    }

    await runs.save(run.runId, state, steps, 'failed', 'Vòng lặp vượt quá số bước cho phép.')
    stream.emit({ type: 'run.error', message: 'Không thể hoàn tất lượt đọc này.' })
  }
}

function revealedNames(cards: DrawnCard[] | null, casting: Casting | null): string[] {
  const names = (cards ?? []).flatMap((card) => [card.name_vi, card.name])
  if (casting) {
    names.push(casting.primary.name, casting.primary.full_name)
    if (casting.changed) names.push(casting.changed.name, casting.changed.full_name)
  }
  return names.filter(Boolean)
}
