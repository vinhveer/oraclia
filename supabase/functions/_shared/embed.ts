/**
 * Embedding chạy ngay trong edge runtime (Supabase.ai, model gte-small, 384
 * chiều) — không gọi ra ngoài, không tốn tiền. Đặt sau interface để đổi sang
 * provider khác chỉ cần một class mới, một migration đổi số chiều và embed lại.
 */
export interface Embedder {
  readonly model: string
  readonly dims: number
  embed(text: string): Promise<number[]>
}

interface AiSession {
  run(input: string, options: { mean_pool: boolean; normalize: boolean }): Promise<unknown>
}

declare const Supabase: { ai: { Session: new (model: string) => AiSession } }

/** gte-small nhận tối đa 512 token; cắt theo ký tự cho chắc, tiếng Việt tốn token. */
const MAX_CHARS = 1200

export class GteSmallEmbedder implements Embedder {
  readonly model = 'gte-small'
  readonly dims = 384
  private session: AiSession | null = null

  async embed(text: string): Promise<number[]> {
    this.session ??= new Supabase.ai.Session('gte-small')
    const output = await this.session.run(text.slice(0, MAX_CHARS), {
      mean_pool: true,
      normalize: true,
    })
    return Array.from(output as ArrayLike<number>)
  }
}

/** Định dạng pgvector nhận qua PostgREST. */
export function toVector(values: number[]): string {
  return `[${values.join(',')}]`
}
