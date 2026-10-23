import { assert, assertEquals } from 'jsr:@std/assert@1'
import type { ModelMessage, ToolDefinition } from '../../../_shared/types.ts'
import { AskUserTool } from '../tools/ask-user.ts'
import { RememberTool } from '../tools/remember.ts'
import { isReasoningModel, strictTools } from './gpt.ts'
import { OpenAICompatibleAdapter } from './openai.ts'
import { OpenAIResponsesAdapter, toResponsesInput } from './responses.ts'
import { ParamNegotiator } from './transport.ts'

// ---------------------------------------------------------------------------
// Server OpenAI giả: ghi lại body nhận được, trả lời theo kịch bản.
// ---------------------------------------------------------------------------

type Reply = (path: string, body: any) => Response

async function withServer(reply: Reply, run: (url: string, seen: { path: string; body: any }[]) => Promise<void>) {
  const seen: { path: string; body: any }[] = []
  const server = Deno.serve({ port: 0, hostname: '127.0.0.1', onListen() {} }, async (request) => {
    const path = new URL(request.url).pathname
    const body = await request.json()
    seen.push({ path, body })
    return reply(path, body)
  })
  try {
    await run(`http://127.0.0.1:${server.addr.port}/v1`, seen)
  } finally {
    await server.shutdown()
  }
}

function sse(events: unknown[]): Response {
  const text = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n\n'
  return new Response(text, { headers: { 'content-type': 'text/event-stream' } })
}

const noop = { onDelta: () => {} }
const tools: ToolDefinition[] = [new AskUserTool().definition]
const messages: ModelMessage[] = [
  { role: 'system', content: 'PROMPT' },
  { role: 'user', content: 'Công việc của tôi?' },
]

// ---------------------------------------------------------------------------

Deno.test('nhận diện model suy luận, kể cả tên qua router', () => {
  for (const name of ['gpt-5', 'gpt-5.4-mini', 'openai/gpt-5.2', 'o3', 'o4-mini', 'openai/o3-pro']) {
    assert(isReasoningModel(name), name)
  }
  for (const name of ['gpt-4.1-mini', 'gpt-4o', 'ds/deepseek-v4-flash', 'claude-opus-5-5']) {
    assert(!isReasoningModel(name), name)
  }
})

Deno.test('schema strict: mọi trường bắt buộc, trường tuỳ chọn cho null, không thuộc tính lạ', () => {
  const [ask] = strictTools(tools)
  const schema = ask.function.parameters as any
  assertEquals(ask.function.strict, true)
  assertEquals(schema.additionalProperties, false)
  assertEquals([...schema.required].sort(), Object.keys(schema.properties).sort())
  assertEquals(schema.properties.options.type, ['array', 'null'])
  assertEquals(schema.properties.question.type, 'string')

  const [remember] = strictTools([new RememberTool().definition])
  const item = (remember.function.parameters as any).properties.items.items
  assertEquals(item.additionalProperties, false)
  assertEquals([...item.required].sort(), Object.keys(item.properties).sort())
})

Deno.test('bị từ chối một tham số thì chỉ bỏ đúng tham số đó', () => {
  const params = new ParamNegotiator(['temperature', 'max_tokens', 'reasoning_effort'])
  const body = { temperature: 0.7, max_completion_tokens: 10, reasoning_effort: 'low' }
  assert(params.learn("Unsupported parameter: 'temperature' is not supported with this model.", body))
  assertEquals(params.apply(body), { max_completion_tokens: 10, reasoning_effort: 'low' })
  // `max_tokens` không được khớp nhầm bên trong `max_completion_tokens`.
  assert(!params.learn('max_completion_tokens must be positive', { max_tokens: 1 }))
})

Deno.test('Chat Completions + GPT-5: không gửi temperature, dùng max_completion_tokens, tool strict', async () => {
  await withServer(
    () =>
      sse([
        { choices: [{ delta: { content: 'Xin ' } }] },
        { choices: [{ delta: { content: 'chào' }, finish_reason: 'stop' }] },
        { choices: [], usage: { prompt_tokens: 12, completion_tokens: 3, prompt_tokens_details: { cached_tokens: 8 } } },
      ]),
    async (url, seen) => {
      const adapter = new OpenAICompatibleAdapter(url, 'k', 'gpt-5.4-mini', {
        temperature: 0.75,
        maxTokens: 900,
        reasoningEffort: 'medium',
      })
      const transcript: ModelMessage[] = [
        ...messages,
        { role: 'assistant', content: null, provider_items: [{ type: 'reasoning', encrypted_content: 'x' }] },
      ]
      const result = await adapter.step(transcript, tools, noop)
      assertEquals(result.content, 'Xin chào')
      assertEquals(result.usage?.cachedTokens, 8)
      const body = seen[0].body
      assertEquals(seen[0].path, '/v1/chat/completions')
      assert(!('temperature' in body))
      assertEquals(body.max_completion_tokens, 900)
      assert(!('max_tokens' in body))
      assertEquals(body.reasoning_effort, 'medium')
      assertEquals(body.parallel_tool_calls, false)
      assertEquals(body.tools[0].function.strict, true)
      // Trường nội bộ không bao giờ lọt ra provider.
      assert(body.messages.every((message: any) => !('provider_items' in message)))
    },
  )
})

Deno.test('Chat Completions: provider chê một tham số thì gửi lại thiếu đúng tham số đó', async () => {
  await withServer(
    (_path, body) =>
      'prompt_cache_key' in body
        ? new Response(JSON.stringify({ error: { message: 'Unrecognized request argument: prompt_cache_key' } }), {
            status: 400,
          })
        : sse([{ choices: [{ delta: { content: 'ok' }, finish_reason: 'stop' }] }]),
    async (url, seen) => {
      const adapter = new OpenAICompatibleAdapter(url, 'k', 'gpt-4.1-mini', { temperature: 0.75, reasoningEffort: 'low' })
      await adapter.step(messages, tools, noop)
      assertEquals(seen.length, 2)
      const retry = seen[1].body
      assert(!('prompt_cache_key' in retry))
      // Trước đây cả nhóm tham số bị bỏ theo; giờ phải còn nguyên.
      assertEquals(retry.temperature, 0.75)
      assertEquals(retry.reasoning_effort, 'low')
      assertEquals(retry.parallel_tool_calls, false)
    },
  )
})

Deno.test('Responses API: stream chữ, suy luận, tool call; giữ reasoning mã hoá để gửi lại', async () => {
  const reasoning = { type: 'reasoning', id: 'rs_1', encrypted_content: 'ENC', summary: [] }
  await withServer(
    () =>
      sse([
        { type: 'response.reasoning_summary_text.delta', delta: 'Xem câu hỏi về công việc…' },
        { type: 'response.output_item.done', item: reasoning },
        {
          type: 'response.output_item.done',
          item: { type: 'function_call', call_id: 'call_1', name: 'draw_cards', arguments: '{"positions":["Hiện tại"]}' },
        },
        {
          type: 'response.completed',
          response: {
            status: 'completed',
            usage: {
              input_tokens: 2000,
              output_tokens: 150,
              input_tokens_details: { cached_tokens: 1800 },
              output_tokens_details: { reasoning_tokens: 120 },
            },
          },
        },
      ]),
    async (url, seen) => {
      const thoughts: string[] = []
      const adapter = new OpenAIResponsesAdapter(url, 'k', 'gpt-5.4', { temperature: 0.75, reasoningEffort: 'medium' })
      const result = await adapter.step(messages, tools, { onDelta: () => {}, onReasoning: (t) => thoughts.push(t) })

      assertEquals(thoughts.join(''), 'Xem câu hỏi về công việc…')
      assertEquals(result.toolCalls[0].id, 'call_1')
      assertEquals(result.toolCalls[0].function.name, 'draw_cards')
      assertEquals(result.finishReason, 'tool_calls')
      assertEquals(result.providerItems, [reasoning])
      assertEquals(result.usage?.cachedTokens, 1800)
      assertEquals(result.usage?.reasoningTokens, 120)

      const body = seen[0].body
      assertEquals(seen[0].path, '/v1/responses')
      assertEquals(body.store, false)
      assertEquals(body.include, ['reasoning.encrypted_content'])
      assertEquals(body.reasoning, { effort: 'medium', summary: 'auto' })
      assert(!('temperature' in body))
      assertEquals(body.parallel_tool_calls, false)
      assertEquals(body.tools[0].strict, true)
      assertEquals(body.tools[0].name, 'ask_user')
      assertEquals(body.input[0], { role: 'developer', content: 'PROMPT' })
    },
  )
})

Deno.test('Responses API: bước sau gửi trả reasoning ngay trước tool call của nó, rồi kết quả tool', () => {
  const reasoning = { type: 'reasoning', id: 'rs_1', encrypted_content: 'ENC' }
  const input = toResponsesInput([
    ...messages,
    {
      role: 'assistant',
      content: null,
      provider_items: [reasoning],
      tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'draw_cards', arguments: '{}' } }],
    },
    { role: 'tool', tool_call_id: 'call_1', content: 'Ba Kiếm' },
  ]) as any[]
  assertEquals(input.slice(2), [
    reasoning,
    { type: 'function_call', call_id: 'call_1', name: 'draw_cards', arguments: '{}' },
    { type: 'function_call_output', call_id: 'call_1', output: 'Ba Kiếm' },
  ])
})

Deno.test('Responses API: hết max_output_tokens thì báo length để vòng lặp viết tiếp', async () => {
  await withServer(
    () =>
      sse([
        { type: 'response.output_text.delta', delta: 'Bài đọc dở' },
        { type: 'response.incomplete', response: { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } } },
      ]),
    async (url) => {
      const adapter = new OpenAIResponsesAdapter(url, 'k', 'gpt-5.4', {})
      const result = await adapter.step(messages, [], noop)
      assertEquals(result.content, 'Bài đọc dở')
      assertEquals(result.finishReason, 'length')
    },
  )
})

Deno.test('Responses API: reasoning không có bản mã hoá thì không giữ (gửi lại sẽ hỏng)', async () => {
  await withServer(
    () =>
      sse([
        { type: 'response.output_item.done', item: { type: 'reasoning', id: 'rs_1', summary: [] } },
        { type: 'response.output_text.delta', delta: 'ok' },
        { type: 'response.completed', response: { status: 'completed' } },
      ]),
    async (url) => {
      const result = await new OpenAIResponsesAdapter(url, 'k', 'gpt-5.4', {}).step(messages, [], noop)
      assertEquals(result.providerItems, undefined)
    },
  )
})

Deno.test('Responses API: gateway không có /responses thì tự lùi về Chat Completions', async () => {
  await withServer(
    (path) =>
      path.endsWith('/responses')
        ? new Response('404 page not found', { status: 404 })
        : sse([{ choices: [{ delta: { content: 'qua chat' }, finish_reason: 'stop' }] }]),
    async (url, seen) => {
      const adapter = new OpenAIResponsesAdapter(url, 'k', 'openai/gpt-5.4', {})
      const first = await adapter.step(messages, tools, noop)
      assertEquals(first.content, 'qua chat')
      await adapter.step(messages, tools, noop)
      // Lần sau đi thẳng Chat Completions, không thử /responses nữa.
      assertEquals(
        seen.map((item) => item.path),
        ['/v1/responses', '/v1/chat/completions', '/v1/chat/completions'],
      )
    },
  )
})
