import type { Casting, DrawnCard } from '../../../_shared/types.ts'
import { GteSmallEmbedder, toVector, type Embedder } from '../../../_shared/embed.ts'
import { Repository } from './base.ts'

export interface KnowledgeEntry {
  id: string
  kind: string
  title: string
  body_vi: string
}

/** Một worker một session embedding: nạp model tốn hơn chạy nó nhiều. */
const embedder: Embedder = new GteSmallEmbedder()

/**
 * Bản nháp chỉ dùng khi dev bật KB_INCLUDE_DRAFTS — để thử tri thức mới trước
 * khi duyệt. Production chỉ đọc mục đã duyệt.
 */
const includeDrafts = () => Deno.env.get('KB_INCLUDE_DRAFTS') === 'true'

export class KnowledgeRepository extends Repository {
  /**
   * Tri thức cho đúng các lá vừa rút: tra thẳng theo khoá, không cần tìm. Kèm hồ
   * sơ chất khi một chất xuất hiện từ hai lá trở lên — lúc đó chất ấy là một
   * phần của câu trả lời chứ không chỉ là màu của từng lá.
   */
  async forCards(cards: DrawnCard[]): Promise<Map<string, KnowledgeEntry>> {
    const ids = cards.map((card) =>
      card.deck === 'playing' ? `playing:${card.id}` : `card:${card.id}:${card.orientation}`,
    )
    const suitCounts = new Map<string, number>()
    for (const card of cards) {
      if (card.deck === 'tarot' && card.arcana === 'minor') {
        suitCounts.set(card.suit, (suitCounts.get(card.suit) ?? 0) + 1)
      }
    }
    for (const [suit, count] of suitCounts) if (count >= 2) ids.push(`suit:${suit}`)
    return this.byIds(ids)
  }

  /** Thoán từ, tượng của quẻ chính và quẻ biến, cùng lời các hào động. */
  async forCasting(casting: Casting): Promise<Map<string, KnowledgeEntry>> {
    const ids = [
      `hexagram:${casting.primary.number}`,
      ...casting.movingLines.map((line) => `line:${casting.primary.number}:${line}`),
    ]
    if (casting.changed) ids.push(`hexagram:${casting.changed.number}`)
    return this.byIds(ids)
  }

  /**
   * Tìm theo câu hỏi mở. `queryVi` qua full-text + trigram; `queryEn` (nếu có)
   * qua vector — gte-small chỉ phân biệt được nghĩa câu tiếng Anh.
   */
  async search(queryVi: string, queryEn: string, kinds: string[] | null, limit = 5) {
    const embedding = queryEn.trim() ? toVector(await embedder.embed(queryEn)) : null
    const { data, error } = await this.db.rpc('match_knowledge', {
      query_text: queryVi,
      query_embedding: embedding,
      kinds: kinds?.length ? kinds : null,
      include_drafts: includeDrafts(),
      match_count: limit,
    })
    if (error) throw new Error(`Không tra được tri thức: ${error.message}`)
    return (data ?? []) as (KnowledgeEntry & { score: number })[]
  }

  private async byIds(ids: string[]): Promise<Map<string, KnowledgeEntry>> {
    if (!ids.length) return new Map()
    const statuses = includeDrafts() ? ['approved', 'draft'] : ['approved']
    const { data } = await this.db
      .from('knowledge_entries')
      .select('id, kind, title, body_vi')
      .in('id', ids)
      .in('review_status', statuses)
    // Thiếu tri thức không được làm hỏng lượt đọc: vẫn còn nghĩa một câu.
    return new Map(((data ?? []) as KnowledgeEntry[]).map((entry) => [entry.id, entry]))
  }
}
