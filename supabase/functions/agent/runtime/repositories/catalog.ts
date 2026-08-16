import type { Hexagram, HexagramLine, PlayingCard, TarotCard } from '../../../_shared/types.ts'
import { Repository } from './base.ts'

export class CatalogRepository extends Repository {
  async cards(): Promise<TarotCard[]> {
    const { data, error } = await this.db.from('cards').select('*').order('sort_order')
    if (error) throw new Error(`Không đọc được bộ bài: ${error.message}`)
    return (data ?? []) as TarotCard[]
  }

  async playingCards(): Promise<PlayingCard[]> {
    const { data, error } = await this.db.from('playing_cards').select('*').order('sort_order')
    if (error) throw new Error(`Không đọc được bộ bài tây: ${error.message}`)
    return (data ?? []) as PlayingCard[]
  }

  async hexagrams(): Promise<Hexagram[]> {
    const { data, error } = await this.db.from('hexagrams').select('*').order('number')
    if (error) throw new Error(`Không đọc được bảng quẻ: ${error.message}`)
    return (data ?? []) as Hexagram[]
  }

  async hexagramLines(number: number, lines: number[]): Promise<HexagramLine[]> {
    if (!lines.length) return []
    const { data, error } = await this.db
      .from('hexagram_lines')
      .select('*')
      .eq('hexagram_number', number)
      .in('line_number', lines)
      .order('line_number')
    if (error) throw new Error(`Không đọc được hào từ: ${error.message}`)
    return (data ?? []) as HexagramLine[]
  }
}
