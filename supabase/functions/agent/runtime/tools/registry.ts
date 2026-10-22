import type { ModelToolCall, ToolDefinition } from '../../../_shared/types.ts'
import type { ToolCallRepository } from '../repositories/tool-calls.ts'
import { violationResult, type Violation } from '../policy.ts'
import { Tool, type ToolContext, type ToolOutcome } from './tool.ts'

/** Luật chạy trước tool; trả vi phạm thì tool không chạy. */
export type ToolGuard = (call: ModelToolCall, args: Record<string, unknown>) => Violation | null

/**
 * Giữ danh sách tool và lo phần chung quanh mỗi lần gọi: ghi lại vào bảng, phát
 * trạng thái cho UI, và biến mọi lỗi thành kết quả mà model còn gỡ được.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>()

  constructor(
    tools: Tool[],
    private readonly repository: ToolCallRepository,
  ) {
    for (const tool of tools) this.tools.set(tool.name, tool)
  }

  definitions(): ToolDefinition[] {
    return [...this.tools.values()].map((tool) => tool.definition)
  }

  async execute(
    call: ModelToolCall,
    context: ToolContext,
    guard?: ToolGuard,
  ): Promise<ToolOutcome> {
    const started = Date.now()
    const args = parseArguments(call.function.arguments)
    if (!args) {
      // Đoán thành `{}` thì tool chạy với tham số rỗng và model không biết mình
      // sai ở đâu; trả lỗi rõ để nó gọi lại cho đúng.
      const message = `Tham số của ${call.function.name} không phải JSON hợp lệ. Gọi lại với một object JSON đúng schema.`
      context.emit({ type: 'tool.failed', call_id: call.id, name: call.function.name, message })
      return { kind: 'result', content: JSON.stringify({ error: message }), summary: message }
    }

    const violation = guard?.(call, args)
    if (violation) {
      // Ghi lại để đo model hay phạm luật nào, nhưng không phát ra UI: người hỏi
      // không cần thấy một bước "thất bại" mà chính hệ thống tự gỡ.
      const rowId = await this.repository.start({
        runId: context.runId,
        userId: context.userId,
        callId: call.id,
        name: call.function.name,
        args,
      })
      await this.repository.finish(rowId, 'failed', { policy: violation }, 0)
      return { kind: 'result', content: violationResult(violation), summary: violation.error }
    }

    context.emit({
      type: 'tool.started',
      call_id: call.id,
      name: call.function.name,
      arguments: args,
    })

    const rowId = await this.repository.start({
      runId: context.runId,
      userId: context.userId,
      callId: call.id,
      name: call.function.name,
      args,
    })
    const finish = (status: string, result: unknown) =>
      this.repository.finish(rowId, status, result, Date.now() - started)

    const tool = this.tools.get(call.function.name)
    if (!tool) {
      const message = `Công cụ ${call.function.name} không tồn tại.`
      await finish('failed', { message })
      context.emit({ type: 'tool.failed', call_id: call.id, name: call.function.name, message })
      return { kind: 'result', content: JSON.stringify({ error: message }), summary: message }
    }

    try {
      const outcome = await tool.run(args, { ...context, callId: call.id })
      await finish(outcome.kind === 'interrupt' ? 'awaiting_input' : 'completed', {
        summary: outcome.summary,
      })
      context.emit({
        type: 'tool.completed',
        call_id: call.id,
        name: call.function.name,
        summary: outcome.summary,
      })
      return outcome
    } catch (exception) {
      const message = exception instanceof Error ? exception.message : 'Công cụ gặp lỗi.'
      await finish('failed', { message })
      context.emit({ type: 'tool.failed', call_id: call.id, name: call.function.name, message })
      return { kind: 'result', content: JSON.stringify({ error: message }), summary: message }
    }
  }
}

function parseArguments(raw: string): Record<string, unknown> | null {
  const asObject = (value: unknown) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  try {
    return asObject(JSON.parse(raw || '{}'))
  } catch {
    // Có provider bọc tham số trong văn xuôi hoặc dấu ```; vớt lấy object.
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return asObject(JSON.parse(match[0]))
    } catch {
      return null
    }
  }
}
