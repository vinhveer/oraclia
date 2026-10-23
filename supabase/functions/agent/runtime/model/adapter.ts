import type { ModelMessage, ModelToolCall, ToolDefinition } from '../../../_shared/types.ts'

/** Tinh chỉnh theo model, đọc từ biến môi trường. Trường nào trống thì không gửi. */
export interface ModelProfile {
  temperature?: number
  maxTokens?: number
  reasoningEffort?: string
}

export interface ModelUsage {
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  reasoningTokens: number
}

export interface ModelStep {
  content: string
  toolCalls: ModelToolCall[]
  /** `stop`, `tool_calls`, `length`… — `length` nghĩa là câu trả lời bị cắt cụt. */
  finishReason?: string
  usage?: ModelUsage
  /** Mili giây từ lúc gửi tới byte nội dung đầu tiên (chữ, reasoning hoặc tool call). */
  ttftMs?: number
  /** Model thật sự trả lời, khi khác model của adapter (model dự phòng). */
  model?: string
  /** Vì sao phải dùng model dự phòng. */
  fallbackReason?: string
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
