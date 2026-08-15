/**
 * Hand-written mirror of `supabase/migrations`. Regenerate with
 * `npx supabase gen types typescript --local > supabase/client/database.types.ts`
 * once the local stack is running.
 */

export type Orientation = 'upright' | 'reversed'

export type DeckKind = 'tarot' | 'playing'

export type DrawnCard = {
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

export type Hexagram = {
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

export type Casting = {
  question: string
  tosses: number[]
  primary: Hexagram
  changed: Hexagram | null
  movingLines: number[]
}

export type MemoryRow = {
  id: string
  user_id: string
  conversation_id: string | null
  content: string
  created_at: string
}

export type UserSettingsRow = {
  user_id: string
  about_you: string
  response_style: string
  updated_at: string
}

export type ProfileRow = {
  id: string
  display_name: string
  role: 'user' | 'admin'
  created_at: string
}

export type CardRow = {
  id: string
  name: string
  name_vi: string
  arcana: string
  suit: string
  image: string
  keywords: string[]
  upright: string
  reversed: string
  sort_order: number
}

export type ConversationRow = {
  id: string
  user_id: string
  title: string
  context_summary: string
  compacted_until: string | null
  created_at: string
  updated_at: string
}

export type MessageRow = {
  id: string
  conversation_id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  cards: DrawnCard[] | null
  hexagram: Casting | null
  created_at: string
}

export type AgentRunRow = {
  id: string
  conversation_id: string
  user_id: string
  status: 'running' | 'awaiting_input' | 'completed' | 'failed'
  model: string
  prompt_version: string
  question: string
  step_count: number
  error: string | null
  created_at: string
  updated_at: string
}

export type ToolCallRow = {
  id: string
  run_id: string
  user_id: string
  call_id: string
  name: string
  arguments: Record<string, unknown>
  result: Record<string, unknown> | null
  status: 'running' | 'awaiting_input' | 'completed' | 'failed'
  duration_ms: number | null
  created_at: string
}

export type ReadingRow = {
  id: string
  conversation_id: string
  run_id: string | null
  user_id: string
  question: string
  positions: string[]
  reason: string
  revealed: DrawnCard[] | null
  status: 'pending' | 'revealed' | 'expired'
  created_at: string
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow>
      cards: Table<CardRow>
      conversations: Table<ConversationRow>
      messages: Table<MessageRow>
      agent_runs: Table<AgentRunRow>
      tool_calls: Table<ToolCallRow>
      readings: Table<ReadingRow>
      user_settings: Table<UserSettingsRow>
      memories: Table<MemoryRow>
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
