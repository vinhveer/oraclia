/**
 * Kiểu domain cho browser. Lược đồ bảng sinh tự động vào database.generated.ts
 * (`npm run db:types`); ở đây chỉ thêm phần generator không biết — hình dạng của
 * các cột jsonb — và đặt tên ngắn cho những hàng hay dùng.
 */
import type { Database as Generated } from './database.generated'

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

type Tables = Generated['public']['Tables']
type Row<T extends keyof Tables> = Tables[T]['Row']

export type ConversationRow = Row<'conversations'>
export type MessageRow = Omit<Row<'messages'>, 'cards' | 'hexagram' | 'role'> & {
  role: 'user' | 'assistant' | 'system'
  cards: DrawnCard[] | null
  hexagram: Casting | null
}
export type MemoryKind = 'profile' | 'preference' | 'life_event' | 'ongoing'
export type MemoryRow = Omit<Row<'memories'>, 'kind'> & { kind: MemoryKind }
export type UserSettingsRow = Row<'user_settings'>
export type ProfileRow = Omit<Row<'profiles'>, 'role'> & { role: 'user' | 'admin' }

export type Database = Generated
