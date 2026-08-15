import { supabase } from './client'
import type { MessageRow } from './database.types'

/**
 * Keeps a second tab (or a run resumed from another device) in sync. The SSE
 * stream drives the active tab; Realtime is what everything else listens to.
 */
export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: MessageRow) => void,
): () => void {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(payload.new as MessageRow),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
