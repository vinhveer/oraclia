import type { Casting, DrawnCard, ModelMessage } from '../../_shared/types.ts'

/**
 * Lịch sử đưa cho model tính theo ký tự chứ không theo số tin: một bài đọc năm lá
 * dài gấp mười một câu "ừ". ~24k ký tự tiếng Việt vào khoảng 8-10k token — đủ cho
 * cả chục lượt đọc mà không đè lên phần prompt.
 */
export const HISTORY_CHAR_BUDGET = 24_000

export interface HistoryRow {
  role: string
  content: string
  cards: DrawnCard[] | null
  hexagram: Casting | null
  created_at: string
}

export interface History {
  turns: ModelMessage[]
  /** Số tin chưa cô đọng không nhét vừa ngân sách — lớn hơn 0 là cần cô đọng ngay. */
  overflow: number
}

/**
 * Dựng lịch sử thành các lượt chat thật (user/assistant) thay vì một chuỗi
 * "role: content" nhét trong system: model phân biệt được ai nói gì, và provider
 * cache được phần đầu ổn định.
 *
 * `rows` theo thứ tự thời gian, chỉ gồm phần chưa cô đọng.
 */
export function buildHistory(rows: HistoryRow[], budget = HISTORY_CHAR_BUDGET): History {
  const turns: ModelMessage[] = []
  let used = 0
  let kept = 0
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index]
    if (row.role !== 'user' && row.role !== 'assistant') {
      kept += 1
      continue
    }
    const content = row.role === 'assistant' ? assistantContent(row) : row.content
    if (used + content.length > budget && turns.length) break
    used += content.length
    kept += 1
    turns.unshift({ role: row.role, content })
  }
  // Lịch sử phải mở bằng lượt user; một lượt assistant mồ côi ở đầu khiến vài
  // provider từ chối hoặc model tưởng mình đang nói tiếp.
  while (turns[0]?.role === 'assistant') turns.shift()
  return { turns, overflow: rows.length - kept }
}

/**
 * Bài đọc cũ trong lịch sử: chèn một dòng ghi lá/quẻ đã ra và thay mã [[card:N]]
 * bằng tên lá. Ra khỏi lượt của nó thì [[card:N]] vô nghĩa với model, còn dòng
 * ghi này cho nó biết chính xác đã đọc gì để nối tiếp.
 */
export function assistantContent(row: HistoryRow): string {
  const record = readingRecord(row.cards, row.hexagram)
  const cards = row.cards ?? []
  const text = row.content.replace(/\[\[card:(\d+)\]\]/g, (match, raw) => {
    const card = cards[Number(raw) - 1]
    return card ? `(${card.name_vi})` : match
  })
  return record ? `${record}\n\n${text}` : text
}

export function readingRecord(cards: DrawnCard[] | null, casting: Casting | null): string {
  const parts: string[] = []
  if (cards?.length) {
    const playing = cards.every((card) => card.deck === 'playing')
    const list = cards
      .map(
        (card) =>
          `${card.position} → ${card.name_vi}` +
          (playing ? '' : card.orientation === 'reversed' ? ' (ngược)' : ' (xuôi)'),
      )
      .join('; ')
    parts.push(`[${playing ? 'Bài tây' : 'Trải bài'} đã rút: ${list}]`)
  }
  if (casting) {
    const moving = casting.movingLines.length
      ? `, hào động ${casting.movingLines.join(', ')}`
      : ', không hào động'
    const changed = casting.changed ? ` → biến ${casting.changed.full_name}` : ''
    parts.push(`[Quẻ đã gieo: ${casting.primary.full_name}${moving}${changed}]`)
  }
  return parts.join('\n')
}
