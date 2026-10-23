// Đọc / ghi các file nguồn tri thức trong supabase/knowledge. Dùng chung cho
// sync, review và generate để cả ba hiểu file theo cùng một cách.
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export const KNOWLEDGE_DIR = resolve('supabase/knowledge')

export const KINDS = [
  'card', 'playing', 'suit', 'court', 'number', 'hexagram', 'hexagram_line', 'combo', 'concept',
]

/** Map tên file -> danh sách mục. */
export async function loadFiles() {
  const files = (await readdir(KNOWLEDGE_DIR)).filter((name) => name.endsWith('.json')).sort()
  const result = new Map()
  for (const name of files) {
    result.set(name, JSON.parse(await readFile(join(KNOWLEDGE_DIR, name), 'utf8')))
  }
  return result
}

export async function saveFile(name, entries) {
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
  await writeFile(join(KNOWLEDGE_DIR, name), `${JSON.stringify(sorted, null, 2)}\n`)
}

// Lời tiên tri chắc chắn, hù dọa, mê tín: mục tri thức là nền cho người đọc bài,
// thứ gì ở đây cũng có thể lọt vào câu trả lời.
const FORBIDDEN = [
  /chắc chắn sẽ/i, /chắc chắn là/i, /\bsẽ chết\b/i, /cái chết của/i, /mang thai/i, /ung thư/i,
  /tai họa ập/i, /nghiệp chướng/i, /bùa/i, /giải hạn/i, /định mệnh đã an bài/i, /không thể tránh khỏi/i,
]

// Câu chữ đặc trưng của bản dịch Wilhelm/Baynes (còn bản quyền). gist_en của quẻ
// và hào từng chép gần nguyên văn bản này; viết bằng lời của mình.
const WILHELM =
  /no blame|furthers|perseverance|supreme success|great water|remorse|superior man|misfortune|good fortune|The (Creative|Receptive|Arousing|Gentle|Joyous|Clinging|Abysmal|Wanderer)\b|Marrying Maiden|Inner Truth|Darkening of the Light|After Completion|Before Completion/i

export function validate(entry) {
  const problems = []
  if (!entry.id || typeof entry.id !== 'string') problems.push('thiếu id')
  if (!KINDS.includes(entry.kind)) problems.push(`kind lạ: ${entry.kind}`)
  if (!entry.title) problems.push('thiếu title')
  if (!entry.body_vi || entry.body_vi.length < 80) problems.push('body_vi quá ngắn')
  for (const pattern of FORBIDDEN) {
    if (pattern.test(entry.body_vi ?? '')) problems.push(`body_vi có câu cấm: ${pattern}`)
  }
  if (!entry.gist_en) problems.push('thiếu gist_en')
  else if (entry.gist_en.split(/\s+/).length > 90) problems.push('gist_en quá dài (>90 từ)')
  else if (['hexagram', 'hexagram_line'].includes(entry.kind) && WILHELM.test(entry.gist_en)) {
    problems.push(`gist_en dùng câu chữ bản Wilhelm: ${entry.gist_en.match(WILHELM)[0]}`)
  }
  if (!['draft', 'approved', 'rejected'].includes(entry.review_status)) {
    problems.push(`review_status lạ: ${entry.review_status}`)
  }
  return problems
}

/** Đổi nội dung thì đổi hash, sync dựa vào đó để xoá vector cũ và embed lại. */
export function contentHash(entry) {
  return createHash('sha256')
    .update(JSON.stringify([entry.title, entry.keywords ?? [], entry.body_vi, entry.gist_en]))
    .digest('hex')
    .slice(0, 16)
}

/** Biến môi trường bắt buộc, báo rõ thiếu cái nào. */
export function env(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`Thiếu biến môi trường ${name}.`)
    process.exit(1)
  }
  return value
}
