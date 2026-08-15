import type { ModelMessage, ModelToolCall, ToolDefinition } from '../../../_shared/types.ts'

export interface ModelStep {
  content: string
  toolCalls: ModelToolCall[]
}

export interface StepHandlers {
  onDelta: (text: string) => void
  /**
   * Model có reasoning phát `reasoning_content` trước khi nói câu nào. Bỏ qua
   * kênh này là màn hình đứng im hàng chục giây rồi câu trả lời đổ ra một cục.
   */
  onReasoning?: (text: string) => void
}

export abstract class ModelAdapter {
  abstract readonly name: string
  abstract readonly demo: boolean

  /** Chạy một lượt của trợ lý, đẩy từng mẩu chữ ra và trả về quyết định của model. */
  abstract step(
    messages: ModelMessage[],
    tools: ToolDefinition[],
    handlers: StepHandlers,
  ): Promise<ModelStep>

  /** Một lượt không streaming, dùng để cô đọng ngữ cảnh. */
  abstract complete(messages: ModelMessage[]): Promise<string>
}
