import type { ModelMessage, ModelToolCall, ToolDefinition } from '../../../_shared/types.ts'
import {
  ModelAdapter,
  type ModelProfile,
  type ModelStep,
  type ModelUsage,
  type StepHandlers,
} from './adapter.ts'
import { isReasoningModel, strictTools } from './gpt.ts'
import { OpenAICompatibleAdapter } from './openai.ts'
import { ParamNegotiator, ProviderError, StreamInterrupted, Transport, parseLoose } from './transport.ts'

/** Tham số Responses API mà gateway / model có thể không nhận; bỏ riêng từng cái. */
const OPTIONAL_PARAMS = [
  'temperature',
  'max_output_tokens',
  'reasoning',
  'include',
  'store',
  'text',
  'parallel_tool_calls',
  'prompt_cache_key',
] as const

/**
 * Responses API của OpenAI — đường tốt nhất cho GPT-5.x:
 *
 * - Reasoning của mỗi bước (đã mã hoá, `store: false` nên OpenAI không giữ gì)
 *   được gửi lại ở bước sau. Một lượt đọc của Oraclia là 2-4 bước (rút bài → hỏi
 *   làm rõ → đọc); qua Chat Completions, GPT-5 suy luận lại từ đầu ở mỗi bước.
 * - Stream được bản tóm tắt suy luận, nên màn hình có "đang suy nghĩ" thật thay vì
 *   đứng im tới khi chữ đầu tiên ra.
 * - Tool strict: tham số luôn đúng schema.
 *
 * Gateway không có /responses thì tự lùi về Chat Completions, nhớ cho cả worker.
 */
export class OpenAIResponsesAdapter extends ModelAdapter {
  readonly demo = false
  private readonly transport: Transport
  private readonly params = new ParamNegotiator(OPTIONAL_PARAMS)
  private readonly reasoning: boolean
  private strict = true
  /** Đặt khi gateway không có /responses: từ đó mọi lượt đi đường Chat Completions. */
  private chat: OpenAICompatibleAdapter | null = null

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    readonly name: string,
    private readonly profile: ModelProfile = {},
  ) {
    super()
    this.transport = new Transport(baseUrl, apiKey, name)
    this.reasoning = isReasoningModel(name)
  }

  async step(
    messages: ModelMessage[],
    tools: ToolDefinition[],
    handlers: StepHandlers,
  ): Promise<ModelStep> {
    if (this.chat) return this.chat.step(messages, tools, handlers)
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
        // post() có thể vừa chuyển sang Chat Completions (gateway thiếu /responses).
        const chat = this.fallbackChat()
        if (chat) return chat.step(messages, tools, handlers)
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
    const response = await this.post(() => ({
      model: this.name,
      input: toResponsesInput(messages),
      ...(tools.length
        ? {
            tools: toResponsesTools(this.strict ? strictTools(tools) : tools),
            tool_choice: 'auto',
            // Một tool mỗi bước: tool ngắt (rút bài, hỏi lại) bỏ mọi call sau nó.
            parallel_tool_calls: false,
          }
        : {}),
      stream: true,
      ...this.tuning(),
    }))

    let content = ''
    let usage: ModelUsage | undefined
    let ttftMs: number | undefined
    let status = 'completed'
    let incompleteReason: string | undefined
    const toolCalls: ModelToolCall[] = []
    const providerItems: unknown[] = []
    const mark = () => (ttftMs ??= Date.now() - started)

    for await (const event of this.transport.readSse(response)) {
      switch (event?.type) {
        case 'response.output_text.delta':
          if (typeof event.delta === 'string' && event.delta) {
            mark()
            content += event.delta
            handlers.onDelta(event.delta)
          }
          break
        case 'response.reasoning_summary_text.delta':
        case 'response.reasoning_text.delta':
          if (typeof event.delta === 'string' && event.delta) {
            mark()
            handlers.onReasoning?.(event.delta)
          }
          break
        case 'response.reasoning_summary_part.done':
          // Giữa hai đoạn tóm tắt suy luận; không có thì các đoạn dính liền nhau.
          handlers.onReasoning?.('\n\n')
          break
        case 'response.output_item.added':
          if (event.item?.type === 'function_call') mark()
          break
        case 'response.output_item.done': {
          const item = event.item
          if (item?.type === 'function_call') {
            toolCalls.push({
              id: item.call_id ?? item.id,
              type: 'function',
              function: { name: item.name, arguments: item.arguments || '{}' },
            })
          } else if (item?.type === 'reasoning' && item.encrypted_content) {
            // Giữ nguyên để gửi trả ở bước sau: đây là mạch suy luận của model. Chỉ
            // giữ bản có mã hoá — với `store: false`, gửi lại item không kèm nó thì
            // OpenAI báo không tìm thấy item và cả lượt hỏng.
            providerItems.push(item)
          }
          break
        }
        case 'response.completed':
        case 'response.incomplete':
          status = event.response?.status ?? status
          incompleteReason = event.response?.incomplete_details?.reason
          if (event.response?.usage) usage = readUsage(event.response.usage)
          break
        case 'response.failed':
          throw new StreamInterrupted(
            event.response?.error?.message
              ? `Provider báo lỗi: ${String(event.response.error.message).slice(0, 200)}`
              : 'Provider dừng giữa chừng. Thử lại sau.',
          )
        case 'error':
          throw new StreamInterrupted(
            event.message ? `Provider báo lỗi: ${String(event.message).slice(0, 200)}` : 'Provider báo lỗi.',
          )
      }
    }

    const finishReason =
      status === 'incomplete'
        ? incompleteReason === 'max_output_tokens'
          ? 'length'
          : incompleteReason ?? 'incomplete'
        : toolCalls.length
          ? 'tool_calls'
          : 'stop'
    return {
      content,
      toolCalls,
      finishReason,
      usage,
      ttftMs,
      ...(providerItems.length ? { providerItems } : {}),
    }
  }

  async complete(messages: ModelMessage[]): Promise<string> {
    if (this.chat) return this.chat.complete(messages)
    try {
      const response = await this.post(() => ({
        model: this.name,
        input: toResponsesInput(messages),
        stream: false,
        ...this.tuning(0.2),
        // Việc nền (tiêu đề, tóm tắt) không cần nghĩ lâu.
        ...(this.reasoning ? { reasoning: { effort: 'low' } } : {}),
      }))
      return outputText(parseLoose(await this.transport.text(response)))
    } catch (exception) {
      const chat = this.fallbackChat()
      if (chat) return chat.complete(messages)
      throw exception
    }
  }

  /** Đọc qua hàm: TypeScript thu hẹp `this.chat` sai sau câu kiểm tra đầu hàm. */
  private fallbackChat(): OpenAICompatibleAdapter | null {
    return this.chat
  }

  private tuning(temperature = this.profile.temperature): Record<string, unknown> {
    const { maxTokens, reasoningEffort, verbosity } = this.profile
    return {
      ...(temperature !== undefined && this.profile.temperature !== undefined && !this.reasoning
        ? { temperature }
        : {}),
      ...(maxTokens ? { max_output_tokens: maxTokens } : {}),
      ...(this.reasoning
        ? {
            reasoning: { ...(reasoningEffort ? { effort: reasoningEffort } : {}), summary: 'auto' },
            // Không lưu ở OpenAI, nên reasoning phải đi kèm dạng mã hoá để gửi lại.
            include: ['reasoning.encrypted_content'],
          }
        : {}),
      store: false,
      ...(verbosity ? { text: { verbosity } } : {}),
      prompt_cache_key: 'oraclia-reader',
    }
  }

  private async post(build: () => Record<string, unknown>, tries = 0): Promise<Response> {
    const body = this.params.apply(build())
    try {
      return await this.transport.post('/responses', body)
    } catch (exception) {
      if (!(exception instanceof ProviderError) || tries > 3) throw exception
      // Gateway không có route /responses (404/405 không nhắc gì tới model): lùi
      // về Chat Completions cho cả phần đời còn lại của worker.
      if (
        (exception.httpStatus === 404 || exception.httpStatus === 405) &&
        !/model/i.test(exception.detail)
      ) {
        console.error(`${this.name}: gateway không có /responses, dùng Chat Completions`)
        this.chat = new OpenAICompatibleAdapter(this.baseUrl, this.apiKey, this.name, this.profile)
        throw exception
      }
      if (exception.httpStatus !== 400) throw exception
      if (this.params.learn(exception.detail, body)) return this.post(build, tries + 1)
      if (this.strict && /strict|schema|additionalproperties/i.test(exception.detail)) {
        this.strict = false
        return this.post(build, tries + 1)
      }
      throw exception
    }
  }
}

/**
 * Transcript chung (dạng Chat Completions) → `input` của Responses API. Lượt trợ
 * lý mang `provider_items` (reasoning mã hoá) được gửi trả đúng chỗ, ngay trước
 * chữ và tool call của chính lượt đó.
 */
export function toResponsesInput(messages: ModelMessage[]): unknown[] {
  const input: unknown[] = []
  for (const message of messages) {
    if (message.role === 'system') {
      // `developer` là vai của chỉ dẫn hệ thống với model suy luận; nhận cả model thường.
      input.push({ role: 'developer', content: message.content ?? '' })
    } else if (message.role === 'user') {
      input.push({ role: 'user', content: message.content ?? '' })
    } else if (message.role === 'assistant') {
      for (const item of message.provider_items ?? []) input.push(item)
      if (message.content) input.push({ role: 'assistant', content: message.content })
      for (const call of message.tool_calls ?? []) {
        input.push({
          type: 'function_call',
          call_id: call.id,
          name: call.function.name,
          arguments: call.function.arguments,
        })
      }
    } else if (message.role === 'tool' && message.tool_call_id) {
      input.push({
        type: 'function_call_output',
        call_id: message.tool_call_id,
        output: message.content ?? '',
      })
    }
  }
  return input
}

/** Responses API khai báo tool phẳng: không bọc trong `function`. */
function toResponsesTools(tools: ToolDefinition[]): unknown[] {
  return tools.map((tool) => ({
    type: 'function',
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
    ...(tool.function.strict ? { strict: true } : {}),
  }))
}

/** Chữ của một response không streaming: gộp mọi phần `output_text`. */
function outputText(payload: any): string {
  if (typeof payload?.output_text === 'string') return payload.output_text
  const parts: string[] = []
  for (const item of payload?.output ?? []) {
    if (item?.type !== 'message') continue
    for (const part of item.content ?? []) {
      if (part?.type === 'output_text' && typeof part.text === 'string') parts.push(part.text)
    }
  }
  return parts.join('')
}

function readUsage(raw: any): ModelUsage {
  return {
    inputTokens: Number(raw.input_tokens ?? 0),
    outputTokens: Number(raw.output_tokens ?? 0),
    cachedTokens: Number(raw.input_tokens_details?.cached_tokens ?? 0),
    reasoningTokens: Number(raw.output_tokens_details?.reasoning_tokens ?? 0),
  }
}
