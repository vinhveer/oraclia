// Kiểm dữ liệu đọc bài: đủ 384 hào từ, và kho tri thức trỏ đúng lá / quẻ / hào
// có thật. Cấu trúc prompt thì do deno test lo (npm run test:functions).
import { readFile } from 'node:fs/promises'
import { loadFiles, validate } from './kb/entries.mjs'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const problems = []
const assert = (condition, message) => condition || problems.push(message)

const [linesSql, cardsSql, playingSql] = await Promise.all([
  read('supabase/migrations/20260815002100_iching_lines.sql'),
  read('supabase/migrations/20260815000200_seed_cards.sql'),
  read('supabase/migrations/20260815001600_playing_cards.sql'),
])

const lines = [...linesSql.matchAll(/^  \((\d+), ([1-6]), '(.+)', null,/gm)].map((match) => ({
  hexagram: Number(match[1]),
  line: Number(match[2]),
  text: match[3],
}))
assert(lines.length === 384, `Cần 384 hào từ, tìm thấy ${lines.length}`)
for (let hexagram = 1; hexagram <= 64; hexagram += 1) {
  const found = lines.filter((row) => row.hexagram === hexagram)
  assert(found.length === 6, `Quẻ ${hexagram} có ${found.length} hào`)
  assert(new Set(found.map((row) => row.line)).size === 6, `Quẻ ${hexagram} trùng số hào`)
}

const cardIds = new Set([...cardsSql.matchAll(/\('((?:major|wands|cups|swords|pentacles)-\d{2})'/g)].map((m) => m[1]))
const playingIds = new Set([...playingSql.matchAll(/^  \('([0-9AJQK]{1,2}[CDHS])', /gm)].map((m) => m[1]))
assert(cardIds.size === 78, `Cần 78 lá tarot trong seed, tìm thấy ${cardIds.size}`)
assert(playingIds.size === 52, `Cần 52 lá bài tây trong seed, tìm thấy ${playingIds.size}`)

const files = await loadFiles()
const seen = new Set()
for (const entry of [...files.values()].flat()) {
  for (const problem of validate(entry)) problems.push(`${entry.id}: ${problem}`)
  assert(!seen.has(entry.id), `${entry.id}: trùng id`)
  seen.add(entry.id)
  const [kind, a, b] = entry.id.split(':')
  if (kind === 'card') {
    assert(cardIds.has(a), `${entry.id}: không có lá ${a}`)
    assert(['upright', 'reversed'].includes(b), `${entry.id}: chiều lá lạ`)
    assert(entry.ref?.card_id === a && entry.ref?.orientation === b, `${entry.id}: ref lệch với id`)
  }
  if (kind === 'playing') assert(playingIds.has(a), `${entry.id}: không có lá bài tây ${a}`)
  if (kind === 'hexagram') assert(Number(a) >= 1 && Number(a) <= 64, `${entry.id}: số quẻ lạ`)
  if (kind === 'line') {
    const source = lines.find((row) => row.hexagram === Number(a) && row.line === Number(b))
    assert(source, `${entry.id}: không có hào này`)
    if (source) assert(entry.body_vi.includes(source.text), `${entry.id}: thiếu đúng nguyên văn hào từ`)
  }
}

if (problems.length) {
  for (const problem of problems) console.error(`✗ ${problem}`)
  process.exit(1)
}
console.log(`Dữ liệu hợp lệ: 64 quẻ, 384 hào, ${cardIds.size} lá tarot, ${playingIds.size} lá bài tây; ${seen.size} mục tri thức trỏ đúng.`)
