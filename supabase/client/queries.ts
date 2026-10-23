import { supabase } from './client'
import type {
  ConversationRow,
  MemoryKind,
  MemoryRow,
  MessageRow,
  UserSettingsRow,
} from './database.types'

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
  // Cột jsonb về dưới dạng Json chung chung; hình dạng thật do agent ghi.
  return ((data ?? []) as unknown as Message[]).filter((message) => message.role !== 'system')
}

/**
 * Tìm cả trong tiêu đề lẫn nội dung tin nhắn. Hai truy vấn rồi hợp nhất, vì
 * PostgREST không lọc bảng cha theo điều kiện của bảng con trong một lần gọi.
 */
export async function searchConversations(
  term: string,
  signal?: AbortSignal,
): Promise<Conversation[]> {
  const needle = term.trim()
  if (!needle) return listConversations()
  const pattern = `%${needle.replace(/[%_]/g, (match) => `\\${match}`)}%`
  // Gõ nhanh thì yêu cầu cũ bị huỷ, kết quả về muộn không đè lên kết quả mới.
  const abortable = <T extends { abortSignal: (s: AbortSignal) => T }>(query: T) =>
    signal ? query.abortSignal(signal) : query

  const [byTitle, byContent] = await Promise.all([
    abortable(supabase.from('conversations').select('id, title, updated_at').ilike('title', pattern)),
    abortable(supabase.from('messages').select('conversation_id').ilike('content', pattern).limit(200)),
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

/**
 * Dùng cho hỏi lại và sửa câu hỏi: cắt bỏ tin nhắn này và mọi tin sau nó. Server
 * tự so giờ của chính nó, nên lệch đồng hồ ở máy người dùng không cắt sai.
 */
export async function deleteMessagesFrom(messageId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_messages_from', { message_id: messageId })
  if (error) throw new Error(error.message)
}

export type Memory = Pick<MemoryRow, 'id' | 'content' | 'kind' | 'importance' | 'created_at'>

export async function listMemories(): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('id, content, kind, importance, created_at')
    .order('importance', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Memory[]
}

export async function updateMemory(
  id: string,
  patch: { content?: string; kind?: MemoryKind; importance?: number },
): Promise<void> {
  const { error } = await supabase
    .from('memories')
    .update({
      ...patch,
      // Sửa tay thì bản tiếng Anh và vector cũ không còn khớp; để trống cho
      // lượt phản tư sau viết lại, còn hơn để tìm kiếm trỏ sai nghĩa.
      ...(patch.content ? { gist_en: '', embedding: null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteMemory(id: string): Promise<void> {
  const { error } = await supabase.from('memories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export interface Forgotten {
  memories: number
  readings: number
  summaries: number
}

/**
 * Quên mọi thứ Oraclia tự nhớ: điều đã ghi nhớ, trí nhớ về các lượt xem cũ, bản
 * tóm tắt của mọi cuộc trò chuyện. Giữ phần "Về bạn" và các cuộc trò chuyện.
 */
export async function forgetEverything(): Promise<Forgotten> {
  const { data, error } = await supabase.rpc('forget_everything')
  if (error) throw new Error(error.message)
  return data as unknown as Forgotten
}

export type Rating = 1 | -1

/** Một đánh giá cho mỗi câu trả lời; bấm lại thì ghi đè. */
export async function rateMessage(messageId: string, rating: Rating, note = ''): Promise<void> {
  const { data: session } = await supabase.auth.getUser()
  if (!session.user) throw new Error('Phiên đăng nhập đã hết hạn.')
  const { error } = await supabase.from('message_feedback').upsert(
    {
      user_id: session.user.id,
      message_id: messageId,
      rating,
      note,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,message_id' },
  )
  if (error) throw new Error(error.message)
}

export async function listRatings(conversationId: string): Promise<Record<string, Rating>> {
  const { data, error } = await supabase
    .from('message_feedback')
    .select('message_id, rating, messages!inner(conversation_id)')
    .eq('messages.conversation_id', conversationId)
  if (error) return {}
  return Object.fromEntries((data ?? []).map((row) => [row.message_id, row.rating as Rating]))
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
