import type { Casting, ChatTurn, DrawnCard } from '../../../_shared/types.ts'
import { Repository } from './base.ts'

export interface ConversationState {
  id: string
  title: string
  summary: string
  recent: ChatTurn[]
}

const WINDOW = 8

export class ConversationRepository extends Repository {
  /** Trả về id cuộc trò chuyện, tạo mới nếu chưa có hoặc id không thuộc về người gọi. */
  async ensure(userId: string, conversationId: string | null): Promise<string> {
    if (conversationId) {
      const { data, error } = await this.db
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (data) return data.id
    }
    const { data, error } = await this.db
      .from('conversations')
      .insert({ user_id: userId })
      .select('id')
      .single()
    if (error) throw new Error(`Không tạo được cuộc trò chuyện: ${error.message}`)
    return data.id
  }

  async state(conversationId: string): Promise<ConversationState> {
    const { data, error } = await this.db
      .from('conversations')
      .select('id, title, context_summary')
      .eq('id', conversationId)
      .single()
    if (error) throw new Error('Không tìm thấy cuộc trò chuyện.')

    const { data: rows } = await this.db
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(WINDOW)

    return {
      id: data.id,
      title: data.title,
      summary: data.context_summary ?? '',
      recent: (rows ?? [])
        .reverse()
        .filter((row) => row.role !== 'system')
        .map((row) => ({ role: row.role as ChatTurn['role'], content: row.content })),
    }
  }

  async titleState(conversationId: string) {
    const { data } = await this.db
      .from('conversations')
      .select('title, title_generated')
      .eq('id', conversationId)
      .maybeSingle()
    return data
  }

  async rename(conversationId: string, title: string, generated = false): Promise<void> {
    await this.db
      .from('conversations')
      .update({ title, ...(generated ? { title_generated: true } : {}) })
      .eq('id', conversationId)
  }

  async addMessage(
    conversationId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    cards: DrawnCard[] | null = null,
    hexagram: Casting | null = null,
  ): Promise<string> {
    const { data, error } = await this.db
      .from('messages')
      .insert({ conversation_id: conversationId, user_id: userId, role, content, cards, hexagram })
      .select('id')
      .single()
    if (error) throw new Error(`Không lưu được tin nhắn: ${error.message}`)
    return data.id
  }

  /** Mốc lượt phản tư gần nhất, và tin nhắn mới nhất để biết có gì mới không. */
  async reflectionMarker(conversationId: string) {
    const { data } = await this.db
      .from('conversations')
      .select('reflected_at, context_summary')
      .eq('id', conversationId)
      .maybeSingle()
    return data
  }

  async markReflected(conversationId: string): Promise<void> {
    await this.db
      .from('conversations')
      .update({ reflected_at: new Date().toISOString() })
      .eq('id', conversationId)
  }

  async recentTurns(conversationId: string, limit: number): Promise<ChatTurn[]> {
    const { data } = await this.db
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data ?? [])
      .reverse()
      .filter((row) => row.role !== 'system')
      .map((row) => ({ role: row.role as ChatTurn['role'], content: row.content }))
  }

  async newestMessageAt(conversationId: string): Promise<string | null> {
    const { data } = await this.db
      .from('messages')
      .select('created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data?.created_at ?? null
  }

  /** Đếm không tải dữ liệu, để dùng được trên đường đi chính mà không tốn gì. */
  async uncompactedCount(conversationId: string): Promise<number> {
    const marker = await this.summaryMarker(conversationId)
    let query = this.db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
    if (marker?.compacted_until) query = query.gt('created_at', marker.compacted_until)
    const { count } = await query
    return count ?? 0
  }

  async pendingSince(conversationId: string, since: string | null) {
    let query = this.db
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (since) query = query.gt('created_at', since)
    const { data } = await query
    return data ?? []
  }

  async summaryMarker(conversationId: string) {
    const { data } = await this.db
      .from('conversations')
      .select('context_summary, compacted_until')
      .eq('id', conversationId)
      .single()
    return data
  }

  async saveSummary(conversationId: string, summary: string, until: string | null) {
    await this.db
      .from('conversations')
      .update({ context_summary: summary, compacted_until: until })
      .eq('id', conversationId)
  }
}
