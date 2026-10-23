// Sinh bản nháp tri thức bằng một model mạnh, theo đúng khuôn của các mục đã có.
// Mục sinh ra luôn là `draft`; chỉ dùng thật sau khi duyệt (scripts/kb/review.mjs).
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
//   KB_LLM_BASE_URL=… KB_LLM_API_KEY=… KB_LLM_MODEL=… \
//   node scripts/kb/generate.mjs --kind card [--limit 10] [--concurrency 4] [--dry-run]
//
// kind: card | playing | suit | hexagram | hexagram_line
import { env, loadFiles, saveFile, validate } from './entries.mjs'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : fallback
}
const kind = option('kind')
const limit = Number(option('limit', '1000'))
const concurrency = Number(option('concurrency', '4'))
const dryRun = args.includes('--dry-run')

const FILE_BY_KIND = {
  card: 'cards.json',
  playing: 'playing.json',
  suit: 'suits.json',
  hexagram: 'hexagrams.json',
  hexagram_line: 'lines.json',
}
if (!FILE_BY_KIND[kind]) {
  console.error(`--kind phải là một trong: ${Object.keys(FILE_BY_KIND).join(', ')}`)
  process.exit(1)
}

const supabase = env('SUPABASE_URL').replace(/\/$/, '')
const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')

const SHARED = `Bạn viết mục tri thức tham khảo cho Oraclia, một người đọc tarot, bài tây và
Kinh Dịch bằng tiếng Việt. Mục này được đưa cho một model khác đọc khi giải bài,
nên phải cụ thể, đời thường, có chiều sâu thật — không sáo rỗng, không văn dịch,
không hù dọa, không tiên tri chắc chắn. Viết như người đọc bài lâu năm giải thích
cho đồng nghiệp. Bám truyền thống Rider-Waite-Smith với tarot, Chu Dịch với quẻ.
Không bịa trích dẫn; với Hán văn chỉ dịch nghĩa và ghi rõ là bản dịch nháp.

Trả về đúng một object JSON, không kèm chữ nào khác:
{"title": "...", "keywords": ["..."], "body_vi": "...", "gist_en": "..."}
- body_vi: Markdown, cùng các đề mục in đậm và độ dài tương đương ví dụ.
- keywords: 4-6 cụm tiếng Việt ngắn.
- gist_en: tóm tắt tiếng Anh 40-60 từ, nêu tên lá/quẻ bằng tiếng Anh, dùng để tìm kiếm.`

const files = await loadFiles()
const existing = new Map([...files.values()].flat().map((entry) => [entry.id, entry]))
const examples = [...existing.values()]
  .filter((entry) => entry.kind === kind && entry.review_status !== 'rejected')
  .sort((a, b) => (a.review_status === 'approved' ? -1 : 1) - (b.review_status === 'approved' ? -1 : 1))
  .slice(0, 2)
if (!examples.length) {
  console.error(`Chưa có mục mẫu nào cho kind=${kind}; viết tay ít nhất một mục trước.`)
  process.exit(1)
}

const targets = (await buildTargets()).filter((target) => !existing.has(target.id)).slice(0, limit)
console.log(`${targets.length} mục cần sinh cho kind=${kind}.`)
if (dryRun) {
  for (const target of targets) console.log(`  ${target.id}  ${target.facts.split('\n')[0]}`)
  process.exit(0)
}

const file = FILE_BY_KIND[kind]
const output = files.get(file) ?? []
let done = 0
let failed = 0
const queue = [...targets]
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    for (let target = queue.shift(); target; target = queue.shift()) {
      try {
        const entry = await draft(target)
        output.push(entry)
        await saveFile(file, output)
        done += 1
        console.log(`✓ ${entry.id} (${done}/${targets.length})`)
      } catch (error) {
        failed += 1
        console.error(`✗ ${target.id}: ${error.message}`)
      }
    }
  }),
)
console.log(`Xong: ${done} mục mới, ${failed} lỗi. Duyệt bằng scripts/kb/review.mjs.`)

async function draft(target) {
  const shots = examples
    .map((entry) =>
      JSON.stringify({
        title: entry.title,
        keywords: entry.keywords,
        body_vi: entry.body_vi,
        gist_en: entry.gist_en,
      }),
    )
    .join('\n\n')
  const raw = await complete([
    { role: 'system', content: SHARED },
    {
      role: 'user',
      content: `Ví dụ đúng khuôn:\n${shots}\n\nViết mục cho:\n${target.facts}\n\nTiêu đề phải là: ${target.title}`,
    },
  ])
  const parsed = parseObject(raw)
  const entry = {
    id: target.id,
    kind,
    ref: target.ref,
    title: target.title,
    keywords: (parsed.keywords ?? []).map(String).slice(0, 6),
    body_vi: String(parsed.body_vi ?? '').trim(),
    gist_en: String(parsed.gist_en ?? '').trim(),
    source: `Nháp ${process.env.KB_LLM_MODEL} — cần duyệt`,
    review_status: 'draft',
  }
  const problems = validate(entry)
  if (problems.length) throw new Error(problems.join('; '))
  return entry
}

async function buildTargets() {
  if (kind === 'card') {
    const cards = await rest('/rest/v1/cards?select=id,name,name_vi,keywords,upright,reversed&order=sort_order')
    return cards.flatMap((card) =>
      ['upright', 'reversed'].map((orientation) => ({
        id: `card:${card.id}:${orientation}`,
        ref: { card_id: card.id, orientation },
        title: `${card.name_vi} — ${orientation === 'upright' ? 'xuôi' : 'ngược'}`,
        facts:
          `${card.name} (${card.name_vi}), chiều ${orientation === 'upright' ? 'xuôi' : 'ngược'}.\n` +
          `Từ khóa sẵn có: ${card.keywords.join(', ')}.\n` +
          `Nghĩa một câu sẵn có: ${orientation === 'upright' ? card.upright : card.reversed}`,
      })),
    )
  }
  if (kind === 'playing') {
    const cards = await rest('/rest/v1/playing_cards?select=id,rank,suit,name_vi,keywords,meaning&order=sort_order')
    return cards.map((card) => ({
      id: `playing:${card.id}`,
      ref: { card_id: card.id },
      title: card.name_vi,
      facts: `Lá bài tây ${card.name_vi} (${card.id}). Bói bài tây không có chiều ngược.\nTừ khóa: ${card.keywords.join(', ')}.\nNghĩa sẵn có: ${card.meaning}`,
    }))
  }
  if (kind === 'suit') {
    const suits = { wands: 'Gậy (Lửa)', cups: 'Cốc (Nước)', swords: 'Kiếm (Khí)', pentacles: 'Tiền (Đất)' }
    return Object.entries(suits).map(([suit, name]) => ({
      id: `suit:${suit}`,
      ref: { suit },
      title: `Chất ${name.split(' ')[0]}`,
      facts: `Chất ${name} trong tarot (${suit}).`,
    }))
  }
  if (kind === 'hexagram') {
    const hexagrams = await rest('/rest/v1/hexagrams?select=number,name,full_name,lower_trigram,upper_trigram,keywords,meaning,advice&order=number')
    return hexagrams.map((item) => ({
      id: `hexagram:${item.number}`,
      ref: { hexagram: item.number },
      title: `Quẻ ${item.number} — ${item.full_name}`,
      facts:
        `Quẻ ${item.number} ${item.full_name} (${item.name}); quẻ dưới ${item.lower_trigram}, quẻ trên ${item.upper_trigram}.\n` +
        `Từ khóa: ${item.keywords.join(', ')}.\nNghĩa: ${item.meaning}\nLời khuyên: ${item.advice}`,
    }))
  }
  const [hexagrams, lines] = await Promise.all([
    rest('/rest/v1/hexagrams?select=number,name,full_name&order=number'),
    rest('/rest/v1/hexagram_lines?select=hexagram_number,line_number,source_text&order=hexagram_number,line_number'),
  ])
  const names = new Map(hexagrams.map((item) => [item.number, item]))
  return lines.map((line) => {
    const hexagram = names.get(line.hexagram_number)
    return {
      id: `line:${line.hexagram_number}:${line.line_number}`,
      ref: { hexagram: line.hexagram_number, line: line.line_number },
      title: `Quẻ ${line.hexagram_number} ${hexagram.name} — hào ${line.line_number}`,
      facts: `Quẻ ${line.hexagram_number} ${hexagram.full_name}, hào ${line.line_number}.\nNguyên văn: ${line.source_text}`,
    }
  })
}

async function complete(messages, attempt = 0) {
  const base = env('KB_LLM_BASE_URL').replace(/\/$/, '')
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env('KB_LLM_API_KEY')}` },
    body: JSON.stringify({ model: env('KB_LLM_MODEL'), messages }),
  })
  if (!response.ok) {
    const detail = await response.text()
    if (attempt < 2 && [429, 500, 502, 503, 504].includes(response.status)) {
      await new Promise((resolve) => setTimeout(resolve, 3000 * (attempt + 1)))
      return complete(messages, attempt + 1)
    }
    throw new Error(`LLM ${response.status}: ${detail.slice(0, 200)}`)
  }
  const payload = await response.json()
  return payload?.choices?.[0]?.message?.content ?? ''
}

function parseObject(raw) {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('Model không trả về JSON.')
  return JSON.parse(raw.slice(start, end + 1))
}

async function rest(path) {
  const response = await fetch(`${supabase}${path}`, {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
  })
  if (!response.ok) throw new Error(`${path} → ${response.status}`)
  return response.json()
}
