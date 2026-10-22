export type Orientation = 'upright' | 'reversed'

export interface TarotCard {
  id: string
  name: string
  name_vi: string
  arcana: string
  suit: string
  image: string
  keywords: string[]
  upright: string
  reversed: string
}

export interface PlayingCard {
  id: string
  rank: string
  suit: string
  name_vi: string
  image: string
  keywords: string[]
  meaning: string
}

export type DeckKind = 'tarot' | 'playing'

export interface DrawnCard {
  id: string
  deck: DeckKind
  name: string
  name_vi: string
  arcana: string
  suit: string
  image: string
  orientation: Orientation
  position: string
  keywords: string[]
  meaning: string
}

/** A face-down slot: which card sits there and which way up, locked at shuffle time. */
export interface HiddenCard {
  card_id: string
  orientation: Orientation
}

export interface Hexagram {
  number: number
  lines: string
  name: string
  full_name: string
  lower_trigram: string
  upper_trigram: string
  keywords: string[]
  meaning: string
  advice: string
}

export interface HexagramLine {
  hexagram_number: number
  line_number: number
  source_text: string
  translation_vi: string | null
  source_name: string
  source_url: string
  review_status: 'source_only' | 'draft' | 'reviewed'
}

/** 6 = lão âm, 7 = thiếu dương, 8 = thiếu âm, 9 = lão dương. */
export type TossValue = 6 | 7 | 8 | 9

export interface Casting {
  question: string
  tosses: TossValue[]
  primary: Hexagram
  changed: Hexagram | null
  movingLines: number[]
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/** Provider-shaped message. Kept OpenAI-compatible so any adapter can replay it. */
export interface ModelMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ModelToolCall[]
  tool_call_id?: string
}

export interface ModelToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
  /**
   * Dữ liệu riêng của provider gắn trên tool call (vd. thought signature của
   * Gemini). Phải gửi trả nguyên vẹn ở lượt sau, nếu không provider từ chối.
   */
  extra_content?: unknown
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

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
  | {
      type: 'clarify.requested'
      run_id: string
      clarification_id: string
      question: string
      based_on: string
      options: string[]
      allow_free_text: boolean
    }
  | { type: 'cards.revealed'; cards: DrawnCard[] }
  | { type: 'iching.cast'; casting: Casting }
  | { type: 'conversation.titled'; conversation_id: string; title: string }
  | { type: 'memory.saved'; facts: string[] }
  | { type: 'history.compacted'; length: number }
  | { type: 'message.completed'; message_id: string }
  | { type: 'run.completed'; run_id: string; status: string }
  | { type: 'run.error'; message: string }
