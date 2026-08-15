import type { ModelMessage, ModelToolCall, ToolDefinition } from '../../../_shared/types.ts'
import { ModelAdapter, type ModelStep } from './adapter.ts'

/**
 * Bất kỳ provider nào tương thích OpenAI Chat Completions — OpenAI, OpenRouter,
 * endpoint compat của Gemini, gateway nội bộ. Chỉ ba biến môi trường phân biệt.
 */
export class OpenAICompatibleAdapter extends ModelAdapter {
  readonly demo = false

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    readonly name: string,
  ) {
    super()
  }

  async step(
    messages: ModelMessage[],
    tools: ToolDefinition[],
    onDelta: (text: string) => void,
  ): Promise<ModelStep> {
    const response = await this.post({
      model: this.name,
      messages,
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? 'auto' : undefined,
      temperature: 0.75,
      stream: true,
    })

    let content = ''
    // Provider gửi tool call theo từng mẩu, đánh số bằng index; ghép lại theo ô.
    const partials = new Map<number, { id: string; name: string; arguments: string }>()

    for await (const chunk of this.readSse(response)) {
      const delta = chunk?.choices?.[0]?.delta
      if (!delta) continue
      if (typeof delta.content === 'string' && delta.content) {
        content += delta.content
        onDelta(delta.content)
      }
      for (const call of delta.tool_calls ?? []) {
        const slot = call.index ?? 0
        const current = partials.get(slot) ?? { id: '', name: '', arguments: '' }
        if (call.id) current.id = call.id
        if (call.function?.name) current.name = call.function.name
        if (call.function?.arguments) current.arguments += call.function.arguments
        partials.set(slot, current)
      }
    }

    const toolCalls: ModelToolCall[] = [...partials.entries()]
      .sort(([a], [b]) => a - b)
      .filter(([, call]) => call.name)
      .map(([slot, call]) => ({
        id: call.id || `call_${slot}`,
        type: 'function' as const,
        function: { name: call.name, arguments: call.arguments || '{}' },
      }))

    return { content, toolCalls }
  }

  async complete(messages: ModelMessage[]): Promise<string> {
    const response = await this.post({
      model: this.name,
      messages,
      temperature: 0.2,
      stream: false,
    })
    // Có gateway nối thêm `data: [DONE]` vào cả lượt không streaming, làm
    // .json() ném lỗi; đọc text rồi cắt đúng object.
    const payload = parseLoose(await response.text())
    return payload?.choices?.[0]?.message?.content ?? ''
  }

  private async post(body: unknown): Promise<Response> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`Provider trả về ${response.status}: ${detail.slice(0, 300)}`)
    }
    return response
  }

  private async *readSse(response: Response): AsyncGenerator<any> {
    const reader = response.body?.getReader()
    if (!reader) return
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          yield JSON.parse(payload)
        } catch {
          // Một khung bị cắt dở không đáng để bỏ cả lượt đọc.
        }
      }
    }
  }
}

function parseLoose(raw: string): any {
  try {
    return JSON.parse(raw)
  } catch {
    const end = raw.lastIndexOf('}')
    if (end < 0) return null
    try {
      return JSON.parse(raw.slice(raw.indexOf('{'), end + 1))
    } catch {
      return null
    }
  }
}
