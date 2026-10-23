// Đẩy supabase/knowledge/*.json vào bảng knowledge_entries rồi embed phần thay đổi.
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/kb/sync.mjs [--prune]
//
// --prune xoá các hàng trong DB không còn trong file.
import { contentHash, env, loadFiles, validate } from './entries.mjs'

const url = env('SUPABASE_URL').replace(/\/$/, '')
const key = env('SUPABASE_SERVICE_ROLE_KEY')
const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }
const prune = process.argv.includes('--prune')

const files = await loadFiles()
const entries = [...files.values()].flat()
const seen = new Set()
let invalid = 0
for (const entry of entries) {
  const problems = validate(entry)
  if (seen.has(entry.id)) problems.push('trùng id')
  seen.add(entry.id)
  if (problems.length) {
    invalid += 1
    console.error(`✗ ${entry.id}: ${problems.join('; ')}`)
  }
}
if (invalid) process.exit(1)

const existing = await rest('GET', '/rest/v1/knowledge_entries?select=id,content_hash')
const hashes = new Map(existing.map((row) => [row.id, row.content_hash]))

const changed = []
for (const entry of entries) {
  const hash = contentHash(entry)
  const row = {
    id: entry.id,
    kind: entry.kind,
    ref: entry.ref ?? {},
    title: entry.title,
    body_vi: entry.body_vi,
    gist_en: entry.gist_en,
    keywords: entry.keywords ?? [],
    source: entry.source ?? '',
    review_status: entry.review_status,
    content_hash: hash,
    updated_at: new Date().toISOString(),
  }
  // Nội dung đổi thì vector cũ không còn đúng; chỉ đổi trạng thái duyệt thì giữ.
  if (hashes.get(entry.id) !== hash) {
    row.embedding = null
    row.embedding_model = null
  }
  changed.push(row)
}

for (let index = 0; index < changed.length; index += 200) {
  const batch = changed.slice(index, index + 200)
  // PostgREST upsert cần mọi hàng có cùng tập cột.
  const withVector = batch.filter((row) => 'embedding' in row)
  const without = batch.filter((row) => !('embedding' in row))
  for (const group of [withVector, without]) {
    if (group.length) {
      await rest('POST', '/rest/v1/knowledge_entries?on_conflict=id', group, {
        prefer: 'resolution=merge-duplicates',
      })
    }
  }
}
const reembed = changed.filter((row) => 'embedding' in row).length
console.log(`Đồng bộ ${entries.length} mục (${reembed} cần embed lại).`)

if (prune) {
  const stale = existing.map((row) => row.id).filter((id) => !seen.has(id))
  for (const id of stale) {
    await rest('DELETE', `/rest/v1/knowledge_entries?id=eq.${encodeURIComponent(id)}`)
  }
  console.log(`Xoá ${stale.length} mục không còn trong file.`)
}

for (;;) {
  const result = await rest('POST', '/functions/v1/kb-embed', { action: 'sync' })
  if (result.error) throw new Error(result.error)
  console.log(`Embed ${result.embedded}, còn ${result.remaining}.`)
  if (!result.remaining || !result.embedded) break
}

async function rest(method, path, body, extra = {}) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: { ...headers, ...extra },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}
