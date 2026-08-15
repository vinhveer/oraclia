import { accessToken, functionsUrl } from './client'
import type { Casting, DeckKind, DrawnCard } from './database.types'

export type AgentEvent =
  | { type: 'run.started'; run_id: string; conversation_id: string }
  | { type: 'message.delta'; content: string }
  | { type: 'thinking.delta'; content: string }
  | { type: 'tool.started'; call_id: string; name: string; arguments: Record<string, unknown> }
  | { type: 'tool.completed'; call_id: string; name: string; summary: string }
  | { type: 'tool.failed'; call_id: string; name: string; message: string }
  | {
      type: 'draw.requested'
      run_id: string
      reading_id: string
      deck: DeckKind
      deck_size: number
      pick_count: number
      positions: string[]
      reason: string
    }
  | { type: 'cards.revealed'; cards: DrawnCard[] }
  | { type: 'iching.cast'; casting: Casting }
  | { type: 'conversation.titled'; conversation_id: string; title: string }
  | { type: 'memory.saved'; facts: string[] }
  | { type: 'history.compacted'; length: number }
  | { type: 'message.completed'; message_id: string }
  | { type: 'run.completed'; run_id: string; status: string }
  | { type: 'run.error'; message: string }

export interface AskInput {
  conversationId: string | null
  question: string
}

export interface SelectInput {
  runId: string
  readingId: string
  indices: number[]
}

export function ask(input: AskInput, onEvent: (event: AgentEvent) => void, signal: AbortSignal) {
  return call(
    { action: 'message', conversation_id: input.conversationId, question: input.question },
    onEvent,
    signal,
  )
}

export function selectCards(
  input: SelectInput,
  onEvent: (event: AgentEvent) => void,
  signal: AbortSignal,
) {
  return call(
    {
      action: 'select_cards',
      run_id: input.runId,
      reading_id: input.readingId,
      indices: input.indices,
    },
    onEvent,
    signal,
  )
}

/**
 * Lượt phản tư chạy sau lưng: agent tự quyết định ghi nhớ hay cô đọng. Gọi khi
 * người dùng ngừng gõ một lúc, và im lặng bỏ qua nếu không có gì mới.
 */
export function reflect(
  conversationId: string,
  onEvent: (event: AgentEvent) => void,
  signal: AbortSignal,
) {
  return call({ action: 'reflect', conversation_id: conversationId }, onEvent, signal)
}

async function call(
  body: Record<string, unknown>,
  onEvent: (event: AgentEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const token = await accessToken()
  const response = await fetch(`${functionsUrl}/agent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? `Yêu cầu thất bại (${response.status}).`)
  }
  if (!response.body) throw new Error('Trình duyệt không hỗ trợ streaming.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // SSE frames are separated by a blank line; a partial frame stays buffered.
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''
    for (const frame of frames) {
      const line = frame.split('\n').find((part) => part.startsWith('data:'))
      if (!line) continue
      try {
        onEvent(JSON.parse(line.slice(5).trim()) as AgentEvent)
      } catch {
        // Ignore a malformed frame rather than dropping the whole reading.
      }
    }
  }
}
