// Embed các bản ghi tri thức còn thiếu vector. Chỉ service role gọi được: chạy từ
// script đồng bộ tri thức (scripts/kb/sync.mjs), không bao giờ từ trình duyệt.
//
//   { action: 'sync' }            -> embed tối đa BATCH bản ghi, trả về còn lại bao nhiêu
//   { action: 'probe', texts: [] } -> ma trận cosine, để đo chất lượng embedding
//   { action: 'embed', text }      -> vector của một câu, cho script eval truy hồi

import { serviceClient } from '../_shared/db.ts'
import { GteSmallEmbedder, toVector } from '../_shared/embed.ts'

const BATCH = 48
const embedder = new GteSmallEmbedder()

Deno.serve(async (request) => {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!key || request.headers.get('authorization') !== `Bearer ${key}`) {
    return json({ error: 'Chỉ service role được gọi.' }, 403)
  }
  const payload = await request.json().catch(() => ({}))

  if (payload.action === 'probe') {
    const texts: string[] = Array.isArray(payload.texts) ? payload.texts.map(String) : []
    const vectors = await Promise.all(texts.map((text) => embedder.embed(text)))
    const matrix = vectors.map((a) => vectors.map((b) => round(dot(a, b))))
    return json({ model: embedder.model, dims: vectors[0]?.length ?? 0, matrix })
  }

  if (payload.action === 'embed') {
    return json({ vector: await embedder.embed(String(payload.text ?? '')) })
  }

  const db = serviceClient()
  const { data: rows, error } = await db
    .from('knowledge_entries')
    .select('id, gist_en')
    .is('embedding', null)
    .limit(BATCH)
  if (error) return json({ error: error.message }, 500)

  for (const row of rows ?? []) {
    // Chỉ embed phần tiếng Anh: gte-small không phân biệt được nghĩa câu tiếng
    // Việt (đo: mọi cặp ~0.85-0.91 cosine), tiếng Việt đã có full-text lo.
    const vector = await embedder.embed(row.gist_en)
    const { error: updateError } = await db
      .from('knowledge_entries')
      .update({ embedding: toVector(vector), embedding_model: embedder.model })
      .eq('id', row.id)
    if (updateError) return json({ error: updateError.message }, 500)
  }

  const { count } = await db
    .from('knowledge_entries')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null)
  return json({ embedded: rows?.length ?? 0, remaining: count ?? 0 })
})

function dot(a: number[], b: number[]): number {
  let sum = 0
  for (let index = 0; index < a.length; index += 1) sum += a[index] * b[index]
  return sum
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
