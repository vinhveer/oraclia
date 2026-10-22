import type { ModelMessage, ModelToolCall, ToolDefinition } from '../../../_shared/types.ts'
import {
  ModelAdapter,
  type ModelProfile,
  type ModelStep,
  type ModelUsage,
  type StepHandlers,
} from './adapter.ts'

/**
 * Provider im lặng quá lâu — không byte nào, kể cả reasoning — thì coi như treo.
 * Đo theo khoảng lặng chứ không theo tổng thời gian, vì một bài đọc dài có reasoning
 * có thể chảy vài phút mà vẫn khoẻ.
 */
const IDLE_TIMEOUT_MS = 90_000

/**
 * Tham số không phải provider nào cũng nhận. Gặp 400 nhắc tới một trong số này
 * thì gửi lại không kèm chúng, và nhớ luôn cho các lượt sau của worker.
 */
const OPTIONAL_PARAMS = [
  'temperature',
  'max_tokens',
  'reasoning_effort',
  'parallel_tool_calls',
  'stream_options',
] as const

/** Stream đứt hoặc treo giữa chừng — thử lại được nếu chưa có chữ nào ra màn hình. */
class StreamInterrupted extends Error {}

/**
 * Bất kỳ provider nào tương thích OpenAI Chat Completions — OpenAI, OpenRouter,
 * endpoint compat của Gemini, gateway nội bộ. Chỉ vài biến môi trường phân biệt.
 */
export class OpenAICompatibleAdapter extends ModelAdapter {
  readonly demo = false
  /** Provider đã từ chối tham số tuỳ chọn một lần; từ đó chỉ gửi phần lõi. */
  private lean = false

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    readonly name: string,
    private readonly profile: ModelProfile = {},
  ) {
    super()
  }

  async step(
    messages: ModelMessage[],
    tools: ToolDefinition[],
    handlers: StepHandlers,
  ): Promise<ModelStep> {
    for (let attempt = 0; ; attempt += 1) {
      let shown = false
      try {
        return await this.streamStep(messages, tools, {
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
        // Đã có chữ trên màn hình thì thử lại sẽ in đè một câu trả lời khác lên;
        // để lỗi đi lên còn hơn.
        if (shown || attempt > 0 || !(exception instanceof StreamInterrupted)) throw exception
        await new Promise((resolve) => setTimeout(resolve, 800))
      }
    }
  }

  private async streamStep(
    messages: ModelMessage[],
    tools: ToolDefinition[],
    handlers: StepHandlers,
  ): Promise<ModelStep> {
    const started = Date.now()
    const response = await this.post({
      model: this.name,
      messages,
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? 'auto' : undefined,
      stream: true,
      ...this.tuning(),
      // Vòng lặp chạy tool lần lượt và một tool ngắt sẽ bỏ các call sau nó;
      // xin một call mỗi lượt thì không call nào bị vứt.
      ...(tools.length ? { parallel_tool_calls: false } : {}),
      stream_options: { include_usage: true },
    })

    let content = ''
    let finishReason: string | undefined
    let usage: ModelUsage | undefined
    let ttftMs: number | undefined
    const mark = () => (ttftMs ??= Date.now() - started)
    // Provider gửi tool call theo từng mẩu, đánh số bằng index; ghép lại theo ô.
    const partials = new Map<
      number,
      { id: string; name: string; arguments: string; extra?: unknown }
    >()

    for await (const chunk of this.readSse(response)) {
      if (chunk?.usage) usage = readUsage(chunk.usage)
      const choice = chunk?.choices?.[0]
      if (choice?.finish_reason) finishReason = choice.finish_reason
      const delta = choice?.delta
      if (!delta) continue
      if (typeof delta.content === 'string' && delta.content) {
        mark()
        content += delta.content
        handlers.onDelta(delta.content)
      }
      // Tên trường khác nhau tùy provider; nhận cả hai cách gọi phổ biến.
      const reasoning = delta.reasoning_content ?? delta.reasoning
      if (typeof reasoning === 'string' && reasoning) {
        mark()
        handlers.onReasoning?.(reasoning)
      }
      for (const call of delta.tool_calls ?? []) {
        mark()
        const slot = call.index ?? 0
        const current = partials.get(slot) ?? { id: '', name: '', arguments: '' }
        if (call.id) current.id = call.id
        if (call.function?.name) current.name = call.function.name
        if (call.function?.arguments) current.arguments += call.function.arguments
        if (call.extra_content) current.extra = call.extra_content
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
        ...(call.extra ? { extra_content: call.extra } : {}),
      }))

    return { content, toolCalls, finishReason, usage, ttftMs }
  }

  async complete(messages: ModelMessage[]): Promise<string> {
    const response = await this.post({
      model: this.name,
      messages,
      stream: false,
      ...this.tuning(0.2),
    })
    // Có gateway nối thêm `data: [DONE]` vào cả lượt không streaming, làm
    // .json() ném lỗi; đọc text rồi cắt đúng object.
    const raw = await response.text().finally(() => this.watchdogs.get(response)?.stop())
    const payload = parseLoose(raw)
    return payload?.choices?.[0]?.message?.content ?? ''
  }

  /** Tham số tinh chỉnh theo model; model reasoning thường chỉ nhận temperature mặc định. */
  private tuning(temperature = this.profile.temperature): Record<string, unknown> {
    return {
      ...(temperature !== undefined && this.profile.temperature !== undefined
        ? { temperature }
        : {}),
      ...(this.profile.maxTokens ? { max_tokens: this.profile.maxTokens } : {}),
      ...(this.profile.reasoningEffort ? { reasoning_effort: this.profile.reasoningEffort } : {}),
    }
  }

  /** Lỗi tạm thời: hết lượt, quá tải, gateway chập chờn. Thử lại một lần là đủ. */
  private static readonly RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504])

  private async post(input: Record<string, unknown>, attempt = 0): Promise<Response> {
    const body = this.lean ? withoutOptional(input) : input
    const watchdog = new IdleWatchdog(IDLE_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify(body),
        signal: watchdog.signal,
      })
    } catch (exception) {
      watchdog.stop()
      if (watchdog.fired) throw new StreamInterrupted('Provider không phản hồi. Thử lại sau ít phút.')
      throw exception
    }
    if (response.ok) {
      this.watchdogs.set(response, watchdog)
      return response
    }
    watchdog.stop()

    const detail = await response.text().catch(() => '')
    if (response.status === 400 && !this.lean && rejectsOptional(detail)) {
      this.lean = true
      return this.post(input, attempt)
    }
    if (attempt === 0 && OpenAICompatibleAdapter.RETRYABLE.has(response.status)) {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      return this.post(input, attempt + 1)
    }
    throw new Error(explain(response.status, detail))
  }

  /** Bộ canh của từng response đang đọc, để mỗi khung đến là đặt lại đồng hồ. */
  private readonly watchdogs = new WeakMap<Response, IdleWatchdog>()

  private async *readSse(response: Response): AsyncGenerator<any> {
    const reader = response.body?.getReader()
    if (!reader) return
    const watchdog = this.watchdogs.get(response)
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>
      try {
        chunk = await reader.read()
      } catch (exception) {
        watchdog?.stop()
        throw new StreamInterrupted(
          watchdog?.fired
            ? 'Provider ngừng trả lời giữa chừng. Thử lại sau.'
            : `Mất kết nối với provider: ${exception instanceof Error ? exception.message : ''}`,
        )
      }
      const { value, done } = chunk
      if (done) {
        watchdog?.stop()
        break
      }
      watchdog?.reset()
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

function readUsage(raw: any): ModelUsage {
  return {
    inputTokens: Number(raw.prompt_tokens ?? raw.input_tokens ?? 0),
    outputTokens: Number(raw.completion_tokens ?? raw.output_tokens ?? 0),
    cachedTokens: Number(raw.prompt_tokens_details?.cached_tokens ?? 0),
    reasoningTokens: Number(raw.completion_tokens_details?.reasoning_tokens ?? 0),
  }
}

function withoutOptional(input: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...input }
  for (const key of OPTIONAL_PARAMS) delete copy[key]
  return copy
}

function rejectsOptional(detail: string): boolean {
  const text = detail.toLowerCase()
  return OPTIONAL_PARAMS.some((key) => text.includes(key))
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

/** Huỷ request khi không có byte nào đến trong một khoảng; mỗi khung mới đặt lại đồng hồ. */
class IdleWatchdog {
  private readonly controller = new AbortController()
  private timer: ReturnType<typeof setTimeout> | undefined
  fired = false

  constructor(private readonly ms: number) {
    this.reset()
  }

  get signal(): AbortSignal {
    return this.controller.signal
  }

  reset(): void {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.fired = true
      this.controller.abort()
    }, this.ms)
  }

  stop(): void {
    clearTimeout(this.timer)
  }
}
