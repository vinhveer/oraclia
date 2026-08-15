import { supabase } from './client'
import type { ConversationRow, MessageRow, UserSettingsRow } from './database.types'

export type Conversation = Pick<ConversationRow, 'id' | 'title' | 'updated_at'>
export type Message = Pick<
  MessageRow,
  'id' | 'role' | 'content' | 'cards' | 'hexagram' | 'created_at'
>

export async function listConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createConversation(): Promise<Conversation> {
  const { data: session } = await supabase.auth.getUser()
  if (!session.user) throw new Error('Phiên đăng nhập đã hết hạn.')
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: session.user.id })
    .select('id, title, updated_at')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase.from('conversations').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, cards, hexagram, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).filter((message) => message.role !== 'system')
}

/**
 * Tìm cả trong tiêu đề lẫn nội dung tin nhắn. Hai truy vấn rồi hợp nhất, vì
 * PostgREST không lọc bảng cha theo điều kiện của bảng con trong một lần gọi.
 */
export async function searchConversations(term: string): Promise<Conversation[]> {
  const needle = term.trim()
  if (!needle) return listConversations()
  const pattern = `%${needle.replace(/[%_]/g, (match) => `\\${match}`)}%`

  const [byTitle, byContent] = await Promise.all([
    supabase.from('conversations').select('id, title, updated_at').ilike('title', pattern),
    supabase.from('messages').select('conversation_id').ilike('content', pattern).limit(200),
  ])
  if (byTitle.error) throw new Error(byTitle.error.message)

  const ids = [...new Set((byContent.data ?? []).map((row) => row.conversation_id))]
  const extra = ids.length
    ? await supabase.from('conversations').select('id, title, updated_at').in('id', ids)
    : { data: [], error: null }

  const merged = new Map<string, Conversation>()
  for (const row of [...(byTitle.data ?? []), ...(extra.data ?? [])]) merged.set(row.id, row)
  return [...merged.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

/** Dùng cho hỏi lại và sửa câu hỏi: cắt bỏ mọi tin nhắn từ mốc đó trở đi. */
export async function deleteMessagesFrom(
  conversationId: string,
  fromCreatedAt: string,
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId)
    .gte('created_at', fromCreatedAt)
  if (error) throw new Error(error.message)
}

export interface Memory {
  id: string
  content: string
  created_at: string
}

export async function listMemories(): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('id, content, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Memory[]
}

export async function deleteMemory(id: string): Promise<void> {
  const { error } = await supabase.from('memories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export type UserSettings = Pick<UserSettingsRow, 'about_you' | 'response_style'>

export async function getUserSettings(): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('about_you, response_style')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ?? { about_you: '', response_style: '' }
}

export async function saveUserSettings(patch: Partial<UserSettings>): Promise<void> {
  const { data: session } = await supabase.auth.getUser()
  if (!session.user) throw new Error('Phiên đăng nhập đã hết hạn.')
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: session.user.id, ...patch, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

/** Bộ nhớ tự động: tóm tắt mà agent đã cô đọng từ các cuộc trò chuyện. */
export async function listRememberedSummaries(): Promise<{ title: string; summary: string }[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('title, context_summary')
    .neq('context_summary', '')
    .order('updated_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({ title: row.title, summary: row.context_summary }))
}
