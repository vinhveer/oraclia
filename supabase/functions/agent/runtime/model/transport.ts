import { AgentError } from '../errors.ts'

/**
 * Provider im lặng quá lâu — không byte nào, kể cả reasoning — thì coi như treo.
 * Đo theo khoảng lặng chứ không theo tổng thời gian, vì một bài đọc dài có reasoning
 * có thể chảy vài phút mà vẫn khoẻ.
 */
const IDLE_TIMEOUT_MS = 90_000

/** Lỗi tạm thời: hết lượt, quá tải, gateway chập chờn. Thử lại một lần là đủ. */
const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504])

/** Stream đứt hoặc treo giữa chừng — thử lại được nếu chưa có chữ nào ra màn hình. */
export class StreamInterrupted extends AgentError {
  constructor(message: string) {
    super(502, message)
  }
}

/** Lỗi HTTP từ provider, giữ lại mã và nội dung để adapter quyết định bước tiếp. */
export class ProviderError extends AgentError {
  constructor(
    readonly httpStatus: number,
    readonly detail: string,
  ) {
    // Lời đã được viết lại cho người đọc (không chứa trang HTML hay khoá API).
    super(502, explain(httpStatus, detail))
  }
}

/**
 * Tham số tuỳ chọn mà provider có thể không nhận. Gặp 400 nhắc tới đúng tên một
 * tham số thì bỏ riêng tham số đó và gửi lại — nhớ cho các lượt sau của worker.
 *
 * Trước đây gặp một tham số lạ là bỏ hết cả nhóm: GPT-5 từ chối `temperature`, và
 * thế là mất luôn `reasoning_effort` lẫn `parallel_tool_calls: false`.
 */
export class ParamNegotiator {
  private readonly rejected = new Set<string>()

  constructor(private readonly optional: readonly string[]) {}

  apply(body: Record<string, unknown>): Record<string, unknown> {
    if (!this.rejected.size) return body
    const copy = { ...body }
    for (const key of this.rejected) delete copy[key]
    return copy
  }

  /** Trả true nếu đã bỏ được ít nhất một tham số mới nhờ thông báo lỗi này. */
  learn(detail: string, body: Record<string, unknown>): boolean {
    const text = detail.toLowerCase()
    let learned = false
    for (const key of this.optional) {
      if (key in body && !this.rejected.has(key) && mentions(text, key)) {
        this.rejected.add(key)
        learned = true
      }
    }
    return learned
  }

  isRejected(key: string): boolean {
    return this.rejected.has(key)
  }

  reject(key: string): void {
    this.rejected.add(key)
  }
}

/** Tên tham số xuất hiện như một từ riêng (`max_tokens` không khớp trong `max_completion_tokens`). */
function mentions(text: string, key: string): boolean {
  return new RegExp(`(^|[^a-z_])${key.toLowerCase()}([^a-z_]|$)`).test(text)
}

/**
 * HTTP + SSE dùng chung cho mọi adapter kiểu OpenAI: canh im lặng, thử lại lỗi
 * tạm thời, đọc stream không mất khung cuối.
 */
export class Transport {
  /** Bộ canh của từng response đang đọc, để mỗi khung đến là đặt lại đồng hồ. */
  private readonly watchdogs = new WeakMap<Response, IdleWatchdog>()

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly label: string,
  ) {}

  async post(path: string, body: Record<string, unknown>, attempt = 0): Promise<Response> {
    const watchdog = new IdleWatchdog(IDLE_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
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
    if (attempt === 0 && RETRYABLE.has(response.status)) {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      return this.post(path, body, attempt + 1)
    }
    throw new ProviderError(response.status, detail)
  }

  /** Đọc hết một response không streaming. */
  async text(response: Response): Promise<string> {
    return await response.text().finally(() => this.watchdogs.get(response)?.stop())
  }

  async *readSse(response: Response): AsyncGenerator<any> {
    const reader = response.body?.getReader()
    if (!reader) return
    const watchdog = this.watchdogs.get(response)
    const decoder = new TextDecoder()
    let buffer = ''
    let dropped = 0
    // Mỗi dòng `data:` là một khung JSON. Khung hỏng bị bỏ là mất chữ trên màn
    // hình, nên đếm lại để thấy trong log thay vì mất lặng lẽ.
    const parse = (line: string): unknown => {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) return undefined
      const payload = trimmed.slice(5).trim()
      if (!payload || payload === '[DONE]') return undefined
      try {
        return JSON.parse(payload)
      } catch {
        dropped += 1
        return undefined
      }
    }
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
        const frame = parse(line)
        if (frame !== undefined) yield frame
      }
    }
    // Có gateway đóng stream mà dòng cuối không kèm xuống dòng; bỏ qua phần còn
    // trong bộ đệm là mất mấy chữ cuối của bài đọc.
    const last = parse(buffer + decoder.decode())
    if (last !== undefined) yield last
    if (dropped) console.error(`${this.label}: bỏ ${dropped} khung stream không đọc được`)
  }
}

/**
 * Provider hỏng thường trả về trang HTML của CDN chứ không phải JSON. Đổ nguyên
 * đoạn đó ra màn hình thì người dùng nhận được một mớ thẻ `<!DOCTYPE html>`, nên
 * lỗi được quy về vài câu đọc được.
 */
export function explain(status: number, detail: string): string {
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

/** Có gateway nối thêm `data: [DONE]` vào cả lượt không streaming; cắt đúng object. */
export function parseLoose(raw: string): any {
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
