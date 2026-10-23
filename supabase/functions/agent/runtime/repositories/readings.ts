import type { Casting, DeckKind, DrawnCard, HiddenCard } from '../../../_shared/types.ts'
import { OwnedRepository } from './base.ts'

export interface ReadingRow {
  id: string
  positions: string[]
  deck: DeckKind
  tool_call_id: string | null
  status: 'pending' | 'revealed' | 'expired'
}

/**
 * Lượt rút bài. Cột `shuffled` (bộ bài úp) không bao giờ rời server trước khi lá
 * được chọn — trình duyệt không có quyền đọc bảng này, và mọi truy vấn ở đây đều
 * lọc theo chủ của lượt rút.
 */
export class ReadingRepository extends OwnedRepository {
  async createPending(input: {
    conversationId: string
    runId: string
    userId: string
    question: string
    positions: string[]
    reason: string
    deck: DeckKind
    toolCallId: string
    shuffled: HiddenCard[]
  }): Promise<string> {
    const { data, error } = await this.insert('readings', {
      conversation_id: input.conversationId,
      run_id: input.runId,
      question: input.question,
      positions: input.positions,
      reason: input.reason,
      deck: input.deck,
      tool_call_id: input.toolCallId,
      status: 'pending',
      shuffled: input.shuffled,
    })
      .select('id')
      .single()
    if (error) throw new Error(`Không tạo được lượt rút bài: ${error.message}`)
    return data.id
  }

  async pending(readingId: string, runId: string): Promise<ReadingRow | null> {
    const { data } = await this.select('readings', 'id, positions, deck, tool_call_id, status')
      .eq('id', readingId)
      .eq('run_id', runId)
      .maybeSingle()
    return (data as ReadingRow) ?? null
  }

  async deck(readingId: string): Promise<HiddenCard[]> {
    const { data } = await this.select('readings', 'shuffled')
      .eq('id', readingId)
      .maybeSingle()
    return (data?.shuffled ?? []) as HiddenCard[]
  }

  /** Các lá đã lật trong run này, để nối lại sau một lượt hỏi làm rõ. */
  async latestRevealed(runId: string): Promise<DrawnCard[] | null> {
    const { data } = await this.select('readings', 'revealed')
      .eq('run_id', runId)
      .eq('status', 'revealed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return (data?.revealed as DrawnCard[]) ?? null
  }

  async markRevealed(readingId: string, revealed: unknown): Promise<void> {
    await this.update('readings', { status: 'revealed', revealed }).eq('id', readingId)
  }
}

export class CastingRepository extends OwnedRepository {
  /** Quẻ vừa gieo trong run này, để nối lại sau một lượt hỏi làm rõ. */
  async latest(runId: string): Promise<Casting | null> {
    const { data } = await this.select('castings', 'payload')
      .eq('run_id', runId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return (data?.payload as Casting) ?? null
  }

  async create(input: {
    conversationId: string
    runId: string
    userId: string
    casting: Casting
  }): Promise<void> {
    const { casting } = input
    const { error } = await this.insert('castings', {
      conversation_id: input.conversationId,
      run_id: input.runId,
      question: casting.question,
      tosses: casting.tosses,
      primary_number: casting.primary.number,
      changed_number: casting.changed?.number ?? null,
      moving_lines: casting.movingLines,
      payload: casting,
    })
    if (error) throw new Error(`Không lưu được quẻ: ${error.message}`)
  }
}
