// Đo truy hồi kho tri thức: top-1 của match_knowledge cho từng truy vấn mẫu.
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/eval/retrieval.mjs [--drafts]
//
// Chạy lại mỗi khi kho tri thức lớn thêm hoặc đổi cách xếp hạng.
import { readFile } from 'node:fs/promises'

const url = need('SUPABASE_URL').replace(/\/$/, '')
const key = need('SUPABASE_SERVICE_ROLE_KEY')
const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }
const drafts = process.argv.includes('--drafts')
const cases = JSON.parse(await readFile(new URL('./retrieval-cases.json', import.meta.url), 'utf8'))

let top1 = 0
let top3 = 0
let family3 = 0
for (const item of cases) {
  let embedding = null
  if (item.en) {
    const response = await post('/functions/v1/kb-embed', { action: 'embed', text: item.en })
    embedding = `[${response.vector.join(',')}]`
  }
  const rows = await post('/rest/v1/rpc/match_knowledge', {
    query_text: item.vi,
    query_embedding: embedding,
    // Như model gọi search_knowledge: lọc theo bộ đang đọc khi ca có ghi.
    kinds: item.kinds ?? null,
    include_drafts: drafts,
    match_count: 3,
  })
  const ids = rows.map((row) => row.id)
  if (ids[0] === item.expect) top1 += 1
  if (ids.includes(item.expect)) top3 += 1
  if (ids.some((id) => family(id) === family(item.expect))) family3 += 1
  console.log(`${ids[0] === item.expect ? '✓' : '✗'} ${item.vi.padEnd(46)} → ${ids.join(', ')}`)
}
console.log(
  `\nTop-1: ${top1}/${cases.length} · Top-3: ${top3}/${cases.length} · ` +
    `Top-3 cùng lá/quẻ: ${family3}/${cases.length}`,
)

/** Cùng lá khác chiều, hay hào của đúng quẻ ấy, vẫn là tri thức dùng được. */
function family(id) {
  const [kind, a] = id.split(':')
  if (kind === 'card') return `card:${a}`
  if (kind === 'line') return `hexagram:${a}`
  return id
}

async function post(path, body) {
  const response = await fetch(`${url}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  const text = await response.text()
  if (!response.ok) throw new Error(`${path} → ${response.status}: ${text.slice(0, 200)}`)
  return JSON.parse(text)
}

function need(name) {
  if (!process.env[name]) {
    console.error(`Thiếu ${name}.`)
    process.exit(1)
  }
  return process.env[name]
}
