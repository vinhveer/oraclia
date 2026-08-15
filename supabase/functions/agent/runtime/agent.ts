import type { Casting, DrawnCard, ModelMessage } from '../../_shared/types.ts'
import type { ModelAdapter } from './model/factory.ts'
import type { ConversationRepository } from './repositories/conversations.ts'
import type { RunRepository } from './repositories/runs.ts'
import type { ToolRegistry } from './tools/registry.ts'
import type { ToolContext } from './tools/tool.ts'
import type { StreamController } from './stream.ts'

const MAX_STEPS = 6

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
  /**
   * Lượt phản tư chạy sau lưng người dùng: nó chỉ gọi tool, và chữ nó viết ra
   * không phải câu trả lời nên không được lưu vào hội thoại.
   */
  persistMessage?: boolean
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
    let casting: Casting | null = null

    const toolContext: ToolContext = {
      ...run.toolContext,
      onCasting: (value) => {
        casting = value
      },
    }

    for (let step = 0; step < MAX_STEPS; step += 1) {
      if (stream.aborted) {
        await runs.save(run.runId, state, step, 'failed', 'Kết nối bị ngắt.')
        return
      }

      const result = await adapter.step(state, tools, (delta) => {
        stream.emit({ type: 'message.delta', content: delta })
      })

      const assistantTurn: ModelMessage = {
        role: 'assistant',
        content: result.content || null,
        ...(result.toolCalls.length ? { tool_calls: result.toolCalls } : {}),
      }
      state.push(assistantTurn)

      if (!result.toolCalls.length) {
        if (run.persistMessage !== false) {
          const messageId = await conversations.addMessage(
            run.conversationId,
            run.userId,
            'assistant',
            result.content,
            run.cards,
            casting,
          )
          stream.emit({ type: 'message.completed', message_id: messageId })
        }
        await runs.save(run.runId, state, step + 1, 'completed', null)
        stream.emit({ type: 'run.completed', run_id: run.runId, status: 'completed' })
        return
      }

      let interrupted = false
      const answered: typeof result.toolCalls = []
      for (const call of result.toolCalls) {
        answered.push(call)
        const outcome = await registry.execute(call, toolContext)
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
        await runs.save(run.runId, state, step + 1, 'awaiting_input', null)
        stream.emit({ type: 'run.completed', run_id: run.runId, status: 'awaiting_input' })
        return
      }
    }

    await runs.save(run.runId, state, MAX_STEPS, 'failed', 'Vòng lặp vượt quá số bước cho phép.')
    stream.emit({ type: 'run.error', message: 'Không thể hoàn tất lượt đọc này.' })
  }
}
