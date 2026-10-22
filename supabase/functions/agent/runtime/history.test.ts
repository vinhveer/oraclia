import { assert, assertEquals } from 'jsr:@std/assert@1'
import type { DrawnCard } from '../../_shared/types.ts'
import { assistantContent, buildHistory, type HistoryRow } from './history.ts'

function card(position: string, name_vi: string, orientation: 'upright' | 'reversed'): DrawnCard {
  return {
    id: name_vi,
    deck: 'tarot',
    name: name_vi,
    name_vi,
    arcana: 'minor',
    suit: 'swords',
    image: '',
    orientation,
    position,
    keywords: [],
    meaning: '',
  }
}

function row(role: string, content: string, extra: Partial<HistoryRow> = {}): HistoryRow {
  return { role, content, cards: null, hexagram: null, created_at: '', ...extra }
}

Deno.test('lịch sử là lượt chat thật, theo thứ tự', () => {
  const { turns, overflow } = buildHistory([row('user', 'Hỏi 1'), row('assistant', 'Đáp 1')])
  assertEquals(turns, [
    { role: 'user', content: 'Hỏi 1' },
    { role: 'assistant', content: 'Đáp 1' },
  ])
  assertEquals(overflow, 0)
})

Deno.test('vượt ngân sách thì bỏ phần cũ và báo overflow', () => {
  const rows = [
    row('user', 'a'.repeat(50)),
    row('assistant', 'b'.repeat(50)),
    row('user', 'c'.repeat(50)),
    row('assistant', 'd'.repeat(50)),
  ]
  const { turns, overflow } = buildHistory(rows, 120)
  assertEquals(turns.map((turn) => turn.content?.[0]), ['c', 'd'])
  assertEquals(overflow, 2)
})

Deno.test('không mở lịch sử bằng lượt assistant mồ côi', () => {
  const rows = [row('user', 'x'.repeat(100)), row('assistant', 'y'.repeat(30)), row('user', 'z')]
  const { turns } = buildHistory(rows, 40)
  assertEquals(turns[0].role, 'user')
})

Deno.test('tin dài hơn cả ngân sách vẫn giữ tin mới nhất', () => {
  const { turns } = buildHistory([row('user', 'q'.repeat(500))], 100)
  assertEquals(turns.length, 1)
})

Deno.test('bài đọc cũ có dòng ghi lá và mã [[card:N]] thành tên lá', () => {
  const cards = [card('Nguồn cơn', 'Ba Kiếm', 'reversed'), card('Hướng mở', 'Mặt Trời', 'upright')]
  const text = assistantContent(row('assistant', '[[card:1]]\nĐau lòng.\n[[card:2]]\nSáng sủa.', { cards }))
  assert(text.startsWith('[Trải bài đã rút: Nguồn cơn → Ba Kiếm (ngược); Hướng mở → Mặt Trời (xuôi)]'))
  assert(text.includes('(Ba Kiếm)\nĐau lòng.'))
  assert(!text.includes('[[card:'))
})
