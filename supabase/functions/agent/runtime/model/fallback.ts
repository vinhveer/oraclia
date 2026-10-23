import type { ModelMessage, ToolDefinition } from '../../../_shared/types.ts'
import { ModelAdapter, type ModelStep, type StepHandlers } from './adapter.ts'

/** Model chính vừa hỏng thì bỏ qua nó một lúc, khỏi mỗi lượt lại mất một lần gọi hỏng. */
const COOLDOWN_MS = 60_000

/**
 * Model chính hỏng trước khi ra chữ nào — khoá hết hạn, router mất credential, quá
 * tải sau khi đã thử lại — thì chuyển sang model dự phòng thay vì trả lỗi cho người
 * hỏi. Đã có chữ (kể cả reasoning) trên màn hình thì không chuyển: model khác viết
 * tiếp là ghép hai câu trả lời làm một.
 */
export class FallbackAdapter extends ModelAdapter {
  readonly demo = false
  private downUntil = 0

  constructor(
    private readonly primary: ModelAdapter,
    private readonly backup: ModelAdapter,
    private readonly now: () => number = Date.now,
  ) {
    super()
  }

  get name(): string {
    return this.primary.name
  }

  async step(
    messages: ModelMessage[],
    tools: ToolDefinition[],
    handlers: StepHandlers,
  ): Promise<ModelStep> {
    if (this.now() < this.downUntil) {
      return this.viaBackup(this.backup.step(messages, tools, handlers), 'model chính đang tạm nghỉ')
    }
    let shown = false
    try {
      return await this.primary.step(messages, tools, {
        onDelta: (text) => {
          shown = true
          handlers.onDelta(text)
        },
        onReasoning: (text) => {
          shown = true
          handlers.onReasoning?.(text)
        },
      })
    } catch (exception) {
      if (shown) throw exception
      return this.viaBackup(this.backup.step(messages, tools, handlers), this.markDown(exception))
    }
  }

  async complete(messages: ModelMessage[]): Promise<string> {
    if (this.now() < this.downUntil) return this.backup.complete(messages)
    try {
      return await this.primary.complete(messages)
    } catch (exception) {
      this.markDown(exception)
      return this.backup.complete(messages)
    }
  }

  private markDown(exception: unknown): string {
    this.downUntil = this.now() + COOLDOWN_MS
    const reason = exception instanceof Error ? exception.message : String(exception)
    console.error(`Model ${this.primary.name} hỏng, chuyển sang ${this.backup.name}: ${reason}`)
    return reason
  }

  private async viaBackup(pending: Promise<ModelStep>, reason: string): Promise<ModelStep> {
    return { ...(await pending), model: this.backup.name, fallbackReason: reason }
  }
}
