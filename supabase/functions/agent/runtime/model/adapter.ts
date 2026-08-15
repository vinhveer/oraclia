import type { ModelMessage, ModelToolCall, ToolDefinition } from '../../../_shared/types.ts'

export interface ModelStep {
  content: string
  toolCalls: ModelToolCall[]
}

export abstract class ModelAdapter {
  abstract readonly name: string
  abstract readonly demo: boolean

  /** Chạy một lượt của trợ lý, đẩy từng mẩu chữ ra và trả về quyết định của model. */
  abstract step(
    messages: ModelMessage[],
    tools: ToolDefinition[],
    onDelta: (text: string) => void,
  ): Promise<ModelStep>

  /** Một lượt không streaming, dùng để cô đọng ngữ cảnh. */
  abstract complete(messages: ModelMessage[]): Promise<string>
}
