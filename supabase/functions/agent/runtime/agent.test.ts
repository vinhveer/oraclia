import { assert, assertEquals } from 'jsr:@std/assert@1'
import type { ModelMessage } from '../../_shared/types.ts'
import { Agent, type AgentDeps } from './agent.ts'
import { ModelAdapter, type ModelStep, type StepHandlers } from './model/adapter.ts'

/** Model giả trả lần lượt các bước đã soạn, stream chữ của từng bước ra handler. */
class Scripted extends ModelAdapter {
  readonly name = 'scripted'
  readonly demo = false
  readonly seen: ModelMessage[][] = []

  constructor(private readonly steps: ModelStep[]) {
    super()
  }

  step(messages: ModelMessage[], _tools: unknown[], handlers: StepHandlers) {
    this.seen.push([...messages])
    const next = this.steps.shift()!
    handlers.onDelta(next.content)
    return Promise.resolve(next)
  }

  complete() {
    return Promise.resolve('')
  }
}

function harness(steps: ModelStep[]) {
  const adapter = new Scripted(steps)
  const saved: string[] = []
  const shown: string[] = []
  const deps = {
    adapter,
    registry: { definitions: () => [] },
    runs: { recordCall: () => Promise.resolve(), save: () => Promise.resolve() },
    conversations: {
      addMessage: (_c: string, _u: string, _r: string, content: string) => {
        saved.push(content)
        return Promise.resolve('message-1')
      },
    },
    stream: {
      aborted: false,
      emit: (event: { type: string; content?: string }) => {
        if (event.type === 'message.delta') shown.push(event.content ?? '')
        if (event.type === 'draft.discarded') shown.length = 0
      },
    },
  } as unknown as AgentDeps
  const agent = new Agent(deps)
  const run = () =>
    agent.run(
      { runId: 'run-1', conversationId: 'c-1', userId: 'u-1', cards: null, toolContext: {} as never },
      [{ role: 'user', content: 'Hỏi' }],
    )
  return { adapter, saved, shown, run }
}

Deno.test('bị cắt vì trần độ dài thì viết tiếp một lần, lưu thành một bài liền', async () => {
  const { adapter, saved, shown, run } = harness([
    { content: 'Phần đầu của bài đọc, ', toolCalls: [], finishReason: 'length' },
    { content: 'phần cuối trọn ý.', toolCalls: [], finishReason: 'stop' },
  ])
  await run()
  assertEquals(saved, ['Phần đầu của bài đọc, phần cuối trọn ý.'])
  assertEquals(shown.join(''), 'Phần đầu của bài đọc, phần cuối trọn ý.')
  // Lượt viết tiếp thấy phần đã viết và lời nhắc viết tiếp.
  const second = adapter.seen[1]
  assertEquals(second.at(-2)?.content, 'Phần đầu của bài đọc, ')
  assert(String(second.at(-1)?.content).includes('Viết tiếp'))
})

Deno.test('viết tiếp vẫn bị cắt thì lưu kèm lời báo, không viết tiếp mãi', async () => {
  const { saved, run } = harness([
    { content: 'Một, ', toolCalls: [], finishReason: 'length' },
    { content: 'hai, ', toolCalls: [], finishReason: 'length' },
  ])
  await run()
  assertEquals(saved.length, 1)
  assert(saved[0].startsWith('Một, hai, '))
  assert(saved[0].includes('bị cắt'))
})
