import { assertEquals, assertRejects } from 'jsr:@std/assert@1'
import type { ModelMessage, ToolDefinition } from '../../../_shared/types.ts'
import { ModelAdapter, type ModelStep, type StepHandlers } from './adapter.ts'
import { FallbackAdapter } from './fallback.ts'

class Scripted extends ModelAdapter {
  readonly demo = false
  calls = 0

  constructor(
    readonly name: string,
    private readonly behaviour: (handlers: StepHandlers) => ModelStep,
  ) {
    super()
  }

  step(_messages: ModelMessage[], _tools: ToolDefinition[], handlers: StepHandlers) {
    this.calls += 1
    return Promise.resolve().then(() => this.behaviour(handlers))
  }

  complete() {
    this.calls += 1
    return Promise.resolve().then(() => this.behaviour({ onDelta: () => undefined }).content)
  }
}

const answer = (text: string) => (handlers: StepHandlers): ModelStep => {
  handlers.onDelta(text)
  return { content: text, toolCalls: [] }
}
const broken = (): ModelStep => {
  throw new Error('Khóa API của provider không hợp lệ.')
}
const noop = { onDelta: () => undefined }

Deno.test('model chính hỏng trước khi ra chữ thì model dự phòng trả lời', async () => {
  const backup = new Scripted('backup', answer('xin chào'))
  const adapter = new FallbackAdapter(new Scripted('main', broken), backup)
  const shown: string[] = []
  const result = await adapter.step([], [], { onDelta: (text) => shown.push(text) })
  assertEquals(shown, ['xin chào'])
  assertEquals(result.model, 'backup')
  assertEquals(result.fallbackReason, 'Khóa API của provider không hợp lệ.')
})

Deno.test('đã ra chữ rồi mới hỏng thì không chuyển model', async () => {
  const backup = new Scripted('backup', answer('câu khác'))
  const main = new Scripted('main', (handlers) => {
    handlers.onDelta('nửa câu')
    throw new Error('Mất kết nối với provider')
  })
  const adapter = new FallbackAdapter(main, backup)
  await assertRejects(() => adapter.step([], [], noop), Error, 'Mất kết nối')
  assertEquals(backup.calls, 0)
})

Deno.test('model chính vừa hỏng thì được bỏ qua một lúc rồi thử lại', async () => {
  let clock = 0
  const main = new Scripted('main', broken)
  const backup = new Scripted('backup', answer('ok'))
  const adapter = new FallbackAdapter(main, backup, () => clock)

  await adapter.step([], [], noop)
  await adapter.step([], [], noop)
  assertEquals(main.calls, 1)

  clock = 61_000
  await adapter.step([], [], noop)
  assertEquals(main.calls, 2)
})

Deno.test('model chính khoẻ thì không đụng tới model dự phòng', async () => {
  const backup = new Scripted('backup', answer('dự phòng'))
  const adapter = new FallbackAdapter(new Scripted('main', answer('chính')), backup)
  const result = await adapter.step([], [], noop)
  assertEquals(result.content, 'chính')
  assertEquals(result.model, undefined)
  assertEquals(await adapter.complete([]), 'chính')
  assertEquals(backup.calls, 0)
})
