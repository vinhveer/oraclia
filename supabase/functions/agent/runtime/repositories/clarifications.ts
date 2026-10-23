import { OwnedRepository } from './base.ts'

export interface ClarificationRow {
  id: string
  question: string
  options: string[]
  allow_free_text: boolean
  status: 'pending' | 'answered' | 'skipped'
}

export class ClarificationRepository extends OwnedRepository {
  async create(input: {
    conversationId: string
    runId: string
    userId: string
    question: string
    basedOn: string
    options: string[]
    allowFreeText: boolean
  }): Promise<string> {
    const { data, error } = await this.insert('clarifications', {
        conversation_id: input.conversationId,
        run_id: input.runId,
        user_id: input.userId,
        question: input.question,
        based_on: input.basedOn,
        options: input.options,
        allow_free_text: input.allowFreeText,
        status: 'pending',
      })
      .select('id')
      .single()
    if (error) throw new Error(`Không tạo được câu hỏi làm rõ: ${error.message}`)
    return data.id
  }

  async pending(id: string, runId: string): Promise<ClarificationRow | null> {
    const { data } = await this.select('clarifications', 'id, question, options, allow_free_text, status')
      .eq('id', id)
      .eq('run_id', runId)
      .maybeSingle()
    return (data as ClarificationRow) ?? null
  }

  /**
   * Các câu đã hỏi gần đây. Dặn suông "đừng lặp mô típ" thì model không biết mô
   * típ của nó là gì; đưa thẳng câu cũ vào prompt mới có cái để tránh.
   */
  async recentQuestions(conversationId: string, limit = 4): Promise<string[]> {
    // Chỉ trong cuộc này: câu hỏi của chuyện tình cảm tuần trước chẳng liên quan
    // gì tới câu hỏi công việc hôm nay, đưa vào chỉ làm nhiễu.
    const { data } = await this.select('clarifications', 'question')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data ?? []).map((row) => row.question as string)
  }

  /** Đã hỏi mấy câu trong chính lượt này. */
  async countForRun(runId: string): Promise<number> {
    const { count } = await this.select('clarifications', 'id', { count: 'exact', head: true })
      .eq('run_id', runId)
    return count ?? 0
  }

  async answer(id: string, answer: string, skipped: boolean): Promise<void> {
    await this.update('clarifications', { answer, status: skipped ? 'skipped' : 'answered' })
      .eq('id', id)
  }
}
