import { Repository } from './base.ts'

export interface MemoryRow {
  id: string
  content: string
  created_at: string
}

export class MemoryRepository extends Repository {
  async list(limit = 60): Promise<MemoryRow[]> {
    const { data } = await this.db
      .from('memories')
      .select('id, content, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data ?? []) as MemoryRow[]
  }

  async add(userId: string, conversationId: string, contents: string[]): Promise<number> {
    if (!contents.length) return 0
    const { error } = await this.db.from('memories').insert(
      contents.map((content) => ({
        user_id: userId,
        conversation_id: conversationId,
        content,
      })),
    )
    if (error) throw new Error(`Không lưu được trí nhớ: ${error.message}`)
    return contents.length
  }
}
