import type { Db } from '../../../_shared/db.ts'
import type { Casting, HiddenCard } from '../../../_shared/types.ts'
import { Repository } from './base.ts'

export interface ReadingRow {
  id: string
  positions: string[]
  status: 'pending' | 'revealed' | 'expired'
}

export class ReadingRepository extends Repository {
  /**
   * `serviceDb` chỉ dùng cho cột `shuffled` — cột duy nhất mà role của trình
   * duyệt không có quyền đọc, để lượt chọn bài úp mặt là thật.
   */
  constructor(
    db: Db,
    private readonly serviceDb: Db,
  ) {
    super(db)
  }

  async createPending(input: {
    conversationId: string
    runId: string
    userId: string
    question: string
    positions: string[]
    reason: string
    shuffled: HiddenCard[]
  }): Promise<string> {
    const { data, error } = await this.db
      .from('readings')
      .insert({
        conversation_id: input.conversationId,
        run_id: input.runId,
        user_id: input.userId,
        question: input.question,
        positions: input.positions,
        reason: input.reason,
        status: 'pending',
      })
      .select('id')
      .single()
    if (error) throw new Error(`Không tạo được lượt rút bài: ${error.message}`)

    const { error: deckError } = await this.serviceDb
      .from('readings')
      .update({ shuffled: input.shuffled })
      .eq('id', data.id)
    if (deckError) throw new Error(`Không lưu được bộ bài đã xáo: ${deckError.message}`)
    return data.id
  }

  async pending(readingId: string, runId: string): Promise<ReadingRow | null> {
    const { data } = await this.db
      .from('readings')
      .select('id, positions, status')
      .eq('id', readingId)
      .eq('run_id', runId)
      .maybeSingle()
    return (data as ReadingRow) ?? null
  }

  /** Quyền sở hữu phải được xác nhận bằng `pending()` trước khi gọi hàm này. */
  async deck(readingId: string): Promise<HiddenCard[]> {
    const { data } = await this.serviceDb
      .from('readings')
      .select('shuffled')
      .eq('id', readingId)
      .maybeSingle()
    return (data?.shuffled ?? []) as HiddenCard[]
  }

  async markRevealed(readingId: string, revealed: unknown): Promise<void> {
    await this.db.from('readings').update({ status: 'revealed', revealed }).eq('id', readingId)
  }
}

export class CastingRepository extends Repository {
  async create(input: {
    conversationId: string
    runId: string
    userId: string
    casting: Casting
  }): Promise<void> {
    const { casting } = input
    const { error } = await this.db.from('castings').insert({
      conversation_id: input.conversationId,
      run_id: input.runId,
      user_id: input.userId,
      question: casting.question,
      tosses: casting.tosses,
      primary_number: casting.primary.number,
      changed_number: casting.changed?.number ?? null,
      moving_lines: casting.movingLines,
    })
    if (error) throw new Error(`Không lưu được quẻ: ${error.message}`)
  }
}
