import type { Hexagram, TarotCard } from '../../../_shared/types.ts'
import { Repository } from './base.ts'

export class CatalogRepository extends Repository {
  async cards(): Promise<TarotCard[]> {
    const { data, error } = await this.db.from('cards').select('*').order('sort_order')
    if (error) throw new Error(`Không đọc được bộ bài: ${error.message}`)
    return (data ?? []) as TarotCard[]
  }

  async hexagrams(): Promise<Hexagram[]> {
    const { data, error } = await this.db.from('hexagrams').select('*').order('number')
    if (error) throw new Error(`Không đọc được bảng quẻ: ${error.message}`)
    return (data ?? []) as Hexagram[]
  }
}
