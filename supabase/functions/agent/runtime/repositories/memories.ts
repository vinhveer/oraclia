import { sharedEmbedder, toVector } from '../../../_shared/embed.ts'
import { Repository } from './base.ts'

export type MemoryKind = 'profile' | 'preference' | 'life_event' | 'ongoing'
export const MEMORY_KINDS: MemoryKind[] = ['profile', 'preference', 'life_event', 'ongoing']

export interface MemoryRow {
  id: string
  content: string
  kind: MemoryKind
  importance: number
  /** Lần cuối điều này được ghi hay sửa — để model biết điều nào mới hơn khi hai điều lệch nhau. */
  updated_at: string
}

export interface NewMemory {
  content: string
  kind: MemoryKind
  importance: number
  gist_en: string
}

/**
 * Đo với gte-small trên gist tiếng Anh: cùng một điều viết gần như cùng chữ
 * 0.978, viết khác chữ 0.884; hai điều KHÁC nhau cùng chủ đề ("designer" và
 * "software engineer") đã lên 0.851. Khe hẹp, nên chỉ chặn trùng gần nguyên văn —
 * bỏ sót một bản trùng thì reflector gộp được, nuốt nhầm một điều thật thì mất.
 */
const DUPLICATE_SIMILARITY = 0.9

/** Dưới ngưỡng này đưa mọi điều nhớ vào context — chừng ấy dòng ngắn chưa tới 5k ký tự. */
const ALL_IN_CONTEXT = 30

export class MemoryRepository extends Repository {
  async list(limit = 60): Promise<MemoryRow[]> {
    const { data } = await this.db
      .from('memories')
      .select('id, content, kind, importance, updated_at')
      .order('importance', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(limit)
    return (data ?? []) as MemoryRow[]
  }

  /**
   * Trí nhớ cho một câu hỏi. Còn ít thì đưa hết: model tự nhận ra điều nào liên
   * quan tốt hơn mọi cách xếp hạng, còn nhánh vector chưa chạy được ở đầu lượt vì
   * chưa có truy vấn tiếng Anh — xếp theo chữ thì "công việc dạo này" không kéo
   * được "vừa bị cắt giảm nhân sự". Nhiều rồi mới chọn: hồ sơ và điều quan trọng
   * nhất, điều khớp chữ với câu hỏi, vài điều gần đây.
   */
  async recall(question: string, limit = 16): Promise<MemoryRow[]> {
    const all = await this.list(ALL_IN_CONTEXT + 1)
    if (all.length <= ALL_IN_CONTEXT) return this.touched(all)

    const { data, error } = await this.db.rpc('recall_memories', {
      query_text: question,
      match_count: limit,
    })
    if (error) {
      console.error('recall_memories lỗi, dùng điều nhớ mới nhất:', error.message)
      return all.slice(0, limit)
    }
    return this.touched((data ?? []) as MemoryRow[])
  }

  /** Không chờ: chỉ là dấu vết để sau này biết điều nào không còn được dùng. */
  private touched(rows: MemoryRow[]): MemoryRow[] {
    if (rows.length) {
      this.db
        .from('memories')
        .update({ last_used_at: new Date().toISOString() })
        .in('id', rows.map((row) => row.id))
        .then(
          () => undefined,
          () => undefined,
        )
    }
    return rows
  }

  /** Thêm các điều mới, bỏ điều đã có (trùng chữ hoặc trùng nghĩa). Trả về điều thật sự được lưu. */
  async add(userId: string, conversationId: string, items: NewMemory[]): Promise<NewMemory[]> {
    const existing = new Set((await this.list(200)).map((row) => normalise(row.content)))
    const saved: NewMemory[] = []
    for (const item of items) {
      if (existing.has(normalise(item.content))) continue
      const embedding = item.gist_en ? toVector(await sharedEmbedder.embed(item.gist_en)) : null
      if (embedding) {
        const { data } = await this.db.rpc('similar_memory', { query_embedding: embedding })
        const nearest = (data ?? [])[0] as { similarity: number } | undefined
        if (nearest && nearest.similarity >= DUPLICATE_SIMILARITY) continue
      }
      const { error } = await this.db.from('memories').insert({
        user_id: userId,
        conversation_id: conversationId,
        content: item.content,
        kind: item.kind,
        importance: item.importance,
        gist_en: item.gist_en,
        embedding,
      })
      if (error) throw new Error(`Không lưu được trí nhớ: ${error.message}`)
      existing.add(normalise(item.content))
      saved.push(item)
    }
    return saved
  }

  /** Tìm theo tiền tố id (8 ký tự đầu) — model chỉ thấy id rút gọn. */
  async resolve(prefix: string): Promise<MemoryRow | null> {
    const clean = prefix.trim().toLowerCase().replace(/[^0-9a-f-]/g, '')
    if (clean.length < 6) return null
    const rows = (await this.list(200)).filter((row) => row.id.startsWith(clean))
    return rows.length === 1 ? rows[0] : null
  }

  async update(id: string, fields: Partial<NewMemory>): Promise<void> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (fields.content) patch.content = fields.content
    if (fields.kind) patch.kind = fields.kind
    if (fields.importance) patch.importance = fields.importance
    if (fields.gist_en) {
      patch.gist_en = fields.gist_en
      patch.embedding = toVector(await sharedEmbedder.embed(fields.gist_en))
    }
    const { error } = await this.db.from('memories').update(patch).eq('id', id)
    if (error) throw new Error(`Không sửa được trí nhớ: ${error.message}`)
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('memories').delete().eq('id', id)
    if (error) throw new Error(`Không xoá được trí nhớ: ${error.message}`)
  }
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[.,;:!?"'()]/g, '').split(/\s+/).join(' ').trim()
}
