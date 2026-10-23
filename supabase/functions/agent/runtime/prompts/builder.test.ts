import { assert, assertEquals } from 'jsr:@std/assert@1'
import type { DrawnCard } from '../../../_shared/types.ts'
import type { KnowledgeEntry } from '../repositories/knowledge.ts'
import { PromptBuilder } from './builder.ts'

function card(id: string, name_vi: string, suit: string, position: string): DrawnCard {
  return {
    id,
    deck: 'tarot',
    name: id,
    name_vi,
    arcana: suit === 'major' ? 'major' : 'minor',
    suit,
    image: '',
    orientation: 'upright',
    position,
    keywords: ['a', 'b'],
    meaning: 'Một câu nghĩa.',
  }
}

const cards = [
  card('swords-03', 'Ba Kiếm', 'swords', 'Nguồn cơn'),
  card('swords-09', 'Chín Kiếm', 'swords', 'Hiện tại'),
  card('major-17', 'Ngôi Sao', 'major', 'Hướng mở'),
]

Deno.test('kết quả rút bài có đủ ba tiêu đề và mỗi lá một mã chèn', () => {
  const text = PromptBuilder.drawResult('Chuyện tình cảm?', cards)
  for (const heading of ['### Bức tranh chung', '### Từng lá', '### Tóm lại']) {
    assert(text.includes(heading), heading)
  }
  for (const index of [1, 2, 3]) {
    assertEquals(text.split(`[[card:${index}]]`).length - 1, 1, `[[card:${index}]] một lần`)
  }
  assert(!text.includes('[[card:4]]'))
})

Deno.test('tri thức được chèn đúng lá, hồ sơ chất chỉ khi có mặt', () => {
  const knowledge = new Map<string, KnowledgeEntry>([
    ['card:swords-03:upright', { id: 'card:swords-03:upright', kind: 'card', title: 'Ba Kiếm', body_vi: 'TRI-THỨC-BA-KIẾM' }],
    ['suit:swords', { id: 'suit:swords', kind: 'suit', title: 'Chất Kiếm', body_vi: 'TRI-THỨC-CHẤT' }],
  ])
  const text = PromptBuilder.drawResult('Chuyện tình cảm?', cards, knowledge)
  const first = text.indexOf('Nguồn cơn')
  const second = text.indexOf('Hiện tại')
  const deep = text.indexOf('TRI-THỨC-BA-KIẾM')
  assert(deep > first && deep < second, 'tri thức nằm dưới đúng lá')
  assert(text.includes('Hồ sơ chất xuất hiện nhiều'))
  assert(text.includes('không phải văn để chép'))

  const bare = PromptBuilder.drawResult('Chuyện tình cảm?', cards)
  assert(!bare.includes('Tri thức về lá này'))
  assert(!bare.includes('không phải văn để chép'))
})

Deno.test('ngữ cảnh gom vào một khối, lịch sử là lượt thật, câu hỏi đứng cuối', () => {
  const builder = new PromptBuilder(
    'PROMPT',
    { aboutYou: 'Tên Lan', responseStyle: '' },
    ['Làm thiết kế'],
    [],
    ['2026-10-01 — "Công việc" — [Trải bài đã rút: ...]'],
  )
  const messages = builder.runMessages(
    'Tóm tắt cũ',
    [
      { role: 'user', content: 'Hỏi trước' },
      { role: 'assistant', content: 'Đáp trước' },
    ],
    'Câu hỏi mới',
  )
  assertEquals(messages[0], { role: 'system', content: 'PROMPT' })
  assertEquals(messages.filter((message) => message.role === 'system').length, 2)
  const context = messages[1].content ?? ''
  for (const tag of ['<about_user>', '<memories>', '<past_readings>', '<conversation_summary>']) {
    assert(context.includes(tag), tag)
  }
  assert(!context.includes('<response_style>'), 'mục rỗng thì bỏ')
  assertEquals(messages.slice(2).map((message) => message.role), ['user', 'assistant', 'user'])
  assertEquals(messages.at(-1)?.content, 'Câu hỏi mới')
})
