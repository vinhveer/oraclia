import type { ModelMessage, ModelToolCall, ToolDefinition } from '../../../_shared/types.ts'
import {
  ModelAdapter,
  type ModelProfile,
  type ModelStep,
  type ModelUsage,
  type StepHandlers,
} from './adapter.ts'
import { isOpenAIModel, isReasoningModel, strictTools } from './gpt.ts'
import { ParamNegotiator, ProviderError, StreamInterrupted, Transport, parseLoose } from './transport.ts'

/** Tham số không phải provider nào cũng nhận; bị từ chối thì bỏ riêng từng cái. */
const OPTIONAL_PARAMS = [
  'temperature',
  'max_tokens',
  'max_completion_tokens',
  'reasoning_effort',
  'parallel_tool_calls',
  'stream_options',
  'prompt_cache_key',
] as const

/**
 * Bất kỳ provider nào tương thích OpenAI Chat Completions — OpenAI, OpenRouter,
 * endpoint compat của Gemini, gateway nội bộ. Chỉ vài biến môi trường phân biệt.
 *
 * Với model GPT, Responses API (responses.ts) tốt hơn; adapter này là đường chung
 * cho mọi provider và là đường lui khi gateway không có /responses.
 */
export class OpenAICompatibleAdapter extends ModelAdapter {
  readonly demo = false
  private readonly transport: Transport
  private readonly params = new ParamNegotiator(OPTIONAL_PARAMS)
  private readonly reasoning: boolean
  /** Strict tool chỉ cho model OpenAI; provider khác từ chối thì tắt hẳn. */
  private strict: boolean

  constructor(
    baseUrl: string,
    apiKey: string,
    readonly name: string,
    private readonly profile: ModelProfile = {},
  ) {
    super()
    this.transport = new Transport(baseUrl, apiKey, name)
    this.reasoning = isReasoningModel(name)
    this.strict = isOpenAIModel(name, baseUrl)
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
    const response = await this.post(() => ({
      model: this.name,
      messages: toChatMessages(messages),
      tools: tools.length ? (this.strict ? strictTools(tools) : tools) : undefined,
      tool_choice: tools.length ? 'auto' : undefined,
      stream: true,
      ...this.tuning(),
      // Vòng lặp chạy tool lần lượt và một tool ngắt sẽ bỏ các call sau nó;
      // xin một call mỗi lượt thì không call nào bị vứt.
      ...(tools.length ? { parallel_tool_calls: false } : {}),
      stream_options: { include_usage: true },
    }))

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

    for await (const chunk of this.transport.readSse(response)) {
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
    const response = await this.post(() => ({
      model: this.name,
      messages: toChatMessages(messages),
      stream: false,
      ...this.tuning(0.2),
    }))
    const payload = parseLoose(await this.transport.text(response))
    return payload?.choices?.[0]?.message?.content ?? ''
  }

  /**
   * Tham số tinh chỉnh theo model. Model suy luận của OpenAI chỉ nhận temperature
   * mặc định và đòi `max_completion_tokens`; gửi sai là mỗi worker mất một lượt
   * gọi hỏng trước khi kịp học.
   */
  private tuning(temperature = this.profile.temperature): Record<string, unknown> {
    const { maxTokens, reasoningEffort } = this.profile
    return {
      ...(temperature !== undefined && this.profile.temperature !== undefined && !this.reasoning
        ? { temperature }
        : {}),
      ...(maxTokens
        ? this.reasoning
          ? { max_completion_tokens: maxTokens }
          : { max_tokens: maxTokens }
        : {}),
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
      // Định tuyến các lượt có cùng phần đầu (prompt hệ thống) về cùng cache.
      ...(this.strict ? { prompt_cache_key: 'oraclia-reader' } : {}),
    }
  }

  /** Gửi, và nếu provider từ chối một tham số tuỳ chọn thì bỏ riêng nó rồi gửi lại. */
  private async post(build: () => Record<string, unknown>, tries = 0): Promise<Response> {
    const body = this.params.apply(build())
    try {
      return await this.transport.post('/chat/completions', body)
    } catch (exception) {
      if (!(exception instanceof ProviderError) || exception.httpStatus !== 400 || tries > 3) {
        throw exception
      }
      if (this.params.learn(exception.detail, body)) return this.post(build, tries + 1)
      // Schema strict bị chê (provider không hỗ trợ, hoặc từ khoá schema lạ): tắt.
      if (this.strict && /strict|schema|additionalproperties/i.test(exception.detail)) {
        this.strict = false
        return this.post(build, tries + 1)
      }
      throw exception
    }
  }
}

/**
 * Chỉ các trường Chat Completions hiểu. Transcript còn mang `provider_items` của
 * Responses API (khi cùng run đi qua cả hai đường); gửi trường lạ là bị từ chối.
 */
export function toChatMessages(messages: ModelMessage[]) {
  return messages.map(({ role, content, tool_calls, tool_call_id }) => ({
    role,
    content,
    ...(tool_calls?.length ? { tool_calls } : {}),
    ...(tool_call_id ? { tool_call_id } : {}),
  }))
}

function readUsage(raw: any): ModelUsage {
  return {
    inputTokens: Number(raw.prompt_tokens ?? raw.input_tokens ?? 0),
    outputTokens: Number(raw.completion_tokens ?? raw.output_tokens ?? 0),
    cachedTokens: Number(raw.prompt_tokens_details?.cached_tokens ?? 0),
    reasoningTokens: Number(raw.completion_tokens_details?.reasoning_tokens ?? 0),
  }
}
