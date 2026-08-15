import type { ModelMessage, ModelToolCall, ToolDefinition } from '../../../_shared/types.ts'
import { ModelAdapter, type ModelStep, type StepHandlers } from './adapter.ts'

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
    handlers: StepHandlers,
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
        handlers.onDelta(delta.content)
      }
      // Tên trường khác nhau tùy provider; nhận cả hai cách gọi phổ biến.
      const reasoning = delta.reasoning_content ?? delta.reasoning
      if (typeof reasoning === 'string' && reasoning) handlers.onReasoning?.(reasoning)
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

  /** Lỗi tạm thời: hết lượt, quá tải, gateway chập chờn. Thử lại một lần là đủ. */
  private static readonly RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504])

  private async post(body: unknown, attempt = 0): Promise<Response> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    })
    if (response.ok) return response

    const detail = await response.text().catch(() => '')
    if (attempt === 0 && OpenAICompatibleAdapter.RETRYABLE.has(response.status)) {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      return this.post(body, attempt + 1)
    }
    throw new Error(explain(response.status, detail))
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

/**
 * Provider hỏng thường trả về trang HTML của CDN chứ không phải JSON. Đổ nguyên
 * đoạn đó ra màn hình thì người dùng nhận được một mớ thẻ `<!DOCTYPE html>`, nên
 * lỗi được quy về vài câu đọc được.
 */
function explain(status: number, detail: string): string {
  const looksLikeHtml = /^\s*<(!doctype|html)/i.test(detail)
  const message = looksLikeHtml ? '' : extractMessage(detail)

  if (status === 401 || status === 403) return 'Khóa API của provider không hợp lệ.'
  if (status === 404) return 'Model đang chọn không tồn tại ở provider này.'
  if (status === 429) return 'Provider đang giới hạn lượt gọi. Thử lại sau ít phút.'
  if (status >= 500 || status === 409) return 'Provider đang quá tải. Thử lại sau ít phút.'
  return message
    ? `Provider từ chối yêu cầu: ${message.slice(0, 200)}`
    : `Provider trả về lỗi ${status}.`
}

function extractMessage(detail: string): string {
  try {
    const parsed = JSON.parse(detail)
    const message = parsed?.error?.message ?? parsed?.message
    return typeof message === 'string' ? message : ''
  } catch {
    return detail.slice(0, 200)
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
