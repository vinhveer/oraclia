import { sharedEmbedder, toVector } from '../../../_shared/embed.ts'
import type { Db } from '../../../_shared/db.ts'
import { OwnedRepository } from './base.ts'

export interface ReadingRecordRow {
  id: string
  conversation_id: string
  question: string
  kind: 'tarot' | 'playing' | 'iching'
  record: string
  synthesis: string
  created_at: string
}

/**
 * Các lượt đọc đã xong, để agent nhớ lại xuyên cuộc trò chuyện. Ghi bằng service
 * role (trình duyệt chỉ được đọc); tìm kiếm qua RPC chạy bằng client của người
 * gọi, vì RPC dựa vào RLS để chỉ trả lượt đọc của chính họ.
 */
export class ReadingRecordRepository extends OwnedRepository {
  constructor(
    service: Db,
    userId: string,
    private readonly asUser: Db,
  ) {
    super(service, userId)
  }

  async add(input: {
    userId: string
    conversationId: string
    runId: string
    messageId: string
    question: string
    kind: ReadingRecordRow['kind']
    record: string
    synthesis: string
    gistEn: string
  }): Promise<void> {
    const embedding = input.gistEn ? toVector(await sharedEmbedder.embed(input.gistEn)) : null
    const { error } = await this.insert('reading_records', {
      conversation_id: input.conversationId,
      run_id: input.runId,
      message_id: input.messageId,
      question: input.question,
      kind: input.kind,
      record: input.record,
      synthesis: input.synthesis,
      gist_en: input.gistEn,
      embedding,
    })
    if (error) throw new Error(`Không lưu được lượt đọc: ${error.message}`)
  }

  /** Vài lượt gần nhất ở các cuộc khác: đủ để model biết có chuyện cũ mà hỏi lại. */
  async recentElsewhere(conversationId: string, limit = 3): Promise<ReadingRecordRow[]> {
    const { data } = await this.select(
      'reading_records',
      'id, conversation_id, question, kind, record, synthesis, created_at',
    )
      .neq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data ?? []) as ReadingRecordRow[]
  }

  /**
   * Lượt cũ cho đầu lượt: lượt khớp chữ với câu hỏi đứng trước, lấp phần còn lại
   * bằng lượt gần nhất. Chỉ có nhánh chữ — lúc này chưa có truy vấn tiếng Anh cho
   * vector; muốn tìm theo nghĩa thì model gọi recall_readings.
   */
  async forQuestion(conversationId: string, question: string, limit = 4): Promise<ReadingRecordRow[]> {
    const [related, recent] = await Promise.all([
      this.search(question, '', conversationId, 2).catch(() => []),
      this.recentElsewhere(conversationId, limit),
    ])
    const seen = new Set<string>()
    return [...related, ...recent]
      .filter((row) => !seen.has(row.id) && seen.add(row.id))
      .slice(0, limit)
  }

  async search(queryVi: string, queryEn: string, excludeConversation: string, limit = 3) {
    const embedding = queryEn.trim() ? toVector(await sharedEmbedder.embed(queryEn)) : null
    const { data, error } = await this.asUser.rpc('match_readings', {
      query_text: queryVi,
      query_embedding: embedding,
      exclude_conversation: excludeConversation,
      match_count: limit,
    })
    if (error) throw new Error(`Không tra được lượt đọc cũ: ${error.message}`)
    return (data ?? []) as ReadingRecordRow[]
  }
}
