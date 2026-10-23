import type { Casting, DrawnCard } from '../../_shared/types.ts'
import { readingRecord } from './history.ts'
import type { ModelAdapter } from './model/factory.ts'
import type { ReadingRecordRepository } from './repositories/reading-records.ts'
import { clip } from './text.ts'

const SYSTEM = `Bạn tóm tắt một lượt xem bói vừa xong để lưu vào trí nhớ dài hạn.
Trả về đúng một object JSON, không kèm chữ nào khác:
{"synthesis": "2-3 câu tiếng Việt: kết luận chính và lời khuyên của bài đọc, gắn với câu hỏi",
 "gist_en": "one English sentence: the question topic, cards or hexagram drawn, and the conclusion"}`

/**
 * Ghi lại mỗi lượt đọc đã xong, chạy nền sau khi câu trả lời đã tới người hỏi.
 * Model nhanh viết bản tóm và câu tiếng Anh để tìm theo nghĩa; model lỗi thì vẫn
 * lưu với phần kết luận cắt từ chính bài đọc — mất gist chứ không mất lượt đọc.
 */
export class ReadingRecorder {
  constructor(
    private readonly records: ReadingRecordRepository,
    private readonly adapter: ModelAdapter,
  ) {}

  async record(input: {
    userId: string
    conversationId: string
    runId: string
    messageId: string
    question: string
    cards: DrawnCard[] | null
    casting: Casting | null
    answer: string
  }): Promise<void> {
    const record = readingRecord(input.cards, input.casting)
    if (!record) return
    const kind = input.casting
      ? 'iching'
      : input.cards?.every((card) => card.deck === 'playing')
        ? 'playing'
        : 'tarot'

    let synthesis = conclusion(input.answer)
    let gistEn = ''
    try {
      const raw = await this.adapter.complete([
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Câu hỏi: ${input.question}\n${record}\n\nBài đọc:\n${clip(input.answer, 6000)}`,
        },
      ])
      const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
      if (typeof parsed.synthesis === 'string' && parsed.synthesis.trim()) {
        synthesis = clip(parsed.synthesis.trim(), 600)
      }
      if (typeof parsed.gist_en === 'string') gistEn = clip(parsed.gist_en.trim(), 400)
    } catch {
      // Giữ phần kết luận cắt từ bài đọc.
    }

    await this.records.add({
      userId: input.userId,
      conversationId: input.conversationId,
      runId: input.runId,
      messageId: input.messageId,
      question: input.question,
      kind,
      record,
      synthesis,
      gistEn,
    })
  }
}

/** Phần chốt của bài đọc: mục "Tóm lại" / "Nên làm", không có thì đoạn cuối. */
export function conclusion(answer: string): string {
  const match = answer.match(/###\s*(Tóm lại|Nên làm)\s*\n+([\s\S]*?)(?=\n###|$)/)
  const text = (match?.[2] ?? answer.trim().split(/\n{2,}/).at(-1) ?? '').trim()
  return clip(text.replace(/\[\[card:\d+\]\]/g, '').split(/\s+/).join(' '), 500)
}
