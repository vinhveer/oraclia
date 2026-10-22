import { assert, assertEquals } from 'jsr:@std/assert@1'
import type { ModelMessage, ModelToolCall } from '../../_shared/types.ts'
import { checkToolCall, clarifyResult, MAX_QUESTIONS, violationResult } from './policy.ts'

let counter = 0
function call(name: string, args: Record<string, unknown> = {}): ModelToolCall {
  counter += 1
  return { id: `c${counter}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }
}

/** Một lượt assistant gọi tool kèm kết quả của nó. */
function turn(name: string, result: string, args: Record<string, unknown> = {}): ModelMessage[] {
  const item = call(name, args)
  return [
    { role: 'assistant', content: null, tool_calls: [item] },
    { role: 'tool', tool_call_id: item.id, content: result },
  ]
}

const base: ModelMessage[] = [
  { role: 'system', content: 'prompt' },
  { role: 'user', content: 'Công việc sắp tới?' },
]
const names = ['Ba Kiếm', 'Three of Swords']

Deno.test('ask_user trước khi rút bài bị chặn', () => {
  const violation = checkToolCall(call('ask_user', { based_on: '' }), { based_on: '' }, {
    transcript: base,
    revealedNames: [],
  })
  assert(violation)
  assert(violation.hint.includes('Rút bài'))
})

Deno.test('ask_user sau khi rút bài, dựa đúng tên lá thì được', () => {
  const transcript = [...base, ...turn('draw_cards', 'kết quả rút')]
  const args = { based_on: 'Ba Kiếm', question: 'Có ai vừa nói gì làm bạn buồn?' }
  assertEquals(checkToolCall(call('ask_user', args), args, { transcript, revealedNames: names }), null)
})

Deno.test('based_on kèm chiều lá vẫn khớp', () => {
  const transcript = [...base, ...turn('draw_cards', 'kết quả rút')]
  const args = { based_on: 'Ba Kiếm (ngược)' }
  assertEquals(checkToolCall(call('ask_user', args), args, { transcript, revealedNames: names }), null)
})

Deno.test('based_on bịa tên lá bị chặn và gợi ý tên đúng', () => {
  const transcript = [...base, ...turn('draw_cards', 'kết quả rút')]
  const args = { based_on: 'Mặt Trời' }
  const violation = checkToolCall(call('ask_user', args), args, { transcript, revealedNames: names })
  assert(violation)
  assert(violation.hint.includes('Ba Kiếm'))
})

Deno.test('quá số câu làm rõ bị chặn', () => {
  const transcript = [...base, ...turn('draw_cards', 'kết quả rút')]
  for (let index = 1; index <= MAX_QUESTIONS; index += 1) {
    transcript.push(...turn('ask_user', clarifyResult('Đúng', false, index)))
  }
  const args = { based_on: 'Ba Kiếm' }
  const violation = checkToolCall(call('ask_user', args), args, { transcript, revealedNames: names })
  assert(violation)
})

Deno.test('người hỏi đã bỏ qua thì không hỏi nữa', () => {
  const transcript = [
    ...base,
    ...turn('draw_cards', 'kết quả rút'),
    ...turn('ask_user', clarifyResult('', true, 1)),
  ]
  const args = { based_on: 'Ba Kiếm' }
  assert(checkToolCall(call('ask_user', args), args, { transcript, revealedNames: names }))
})

Deno.test('kết quả dạng chữ cũ "Người hỏi bỏ qua" vẫn được nhận ra', () => {
  const transcript = [
    ...base,
    ...turn('draw_cards', 'kết quả rút'),
    ...turn('ask_user', 'Người hỏi bỏ qua câu này. Đừng hỏi nữa.'),
  ]
  const args = { based_on: 'Ba Kiếm' }
  assert(checkToolCall(call('ask_user', args), args, { transcript, revealedNames: names }))
})

Deno.test('rút lượt thứ ba bị chặn, lượt thứ hai thì được', () => {
  const once = [...base, ...turn('draw_cards', 'r1')]
  assertEquals(checkToolCall(call('draw_cards'), {}, { transcript: once, revealedNames: [] }), null)
  const twice = [...once, ...turn('cast_iching', 'r2')]
  assert(checkToolCall(call('draw_cards'), {}, { transcript: twice, revealedNames: [] }))
})

Deno.test('không gieo quẻ hai lần', () => {
  const transcript = [...base, ...turn('cast_iching', 'quẻ')]
  assert(checkToolCall(call('cast_iching'), {}, { transcript, revealedNames: [] }))
})

Deno.test('lời gọi đã bị luật chặn không tính vào hạn mức', () => {
  const blocked = violationResult({ error: 'x', hint: 'y' })
  const transcript = [...base, ...turn('draw_cards', blocked), ...turn('draw_cards', blocked)]
  assertEquals(checkToolCall(call('draw_cards'), {}, { transcript, revealedNames: [] }), null)
})

Deno.test('tool khác không bị luật đụng tới', () => {
  assertEquals(checkToolCall(call('lookup_cards'), {}, { transcript: base, revealedNames: [] }), null)
})
