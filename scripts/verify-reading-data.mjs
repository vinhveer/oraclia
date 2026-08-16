import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const [linesSql, v8, builder, iching] = await Promise.all([
  read('supabase/migrations/20260815002100_iching_lines.sql'),
  read('supabase/migrations/20260815002200_prompt_v8_reading_style.sql'),
  read('supabase/functions/agent/runtime/prompts/builder.ts'),
  read('supabase/functions/agent/runtime/tools/cast-iching.ts'),
])

const rows = [...linesSql.matchAll(/^  \((\d+), ([1-6]), '(.+)', null,/gm)].map((match) => ({
  hexagram: Number(match[1]),
  line: Number(match[2]),
  text: match[3],
}))
assert(rows.length === 384, `Cần 384 hào từ, tìm thấy ${rows.length}`)

for (let hexagram = 1; hexagram <= 64; hexagram += 1) {
  const found = rows.filter((row) => row.hexagram === hexagram)
  assert(found.length === 6, `Quẻ ${hexagram} có ${found.length} hào`)
  assert(new Set(found.map((row) => row.line)).size === 6, `Quẻ ${hexagram} trùng số hào`)
  assert(found.every((row) => row.text.length > 4), `Quẻ ${hexagram} có hào từ rỗng`)
}

for (const heading of ['Bức tranh chung', 'Từng lá', 'Tóm lại']) {
  assert(v8.includes(heading), `Prompt v8 thiếu ${heading}`)
  assert(builder.includes(heading), `Prompt kết quả rút bài thiếu ${heading}`)
}
for (const range of ['100-160', '180-300', '280-420', '180-240', '280-420', '420-600', '550-750']) {
  assert(builder.includes(range), `Thiếu ngân sách độ dài ${range}`)
}
assert(!builder.includes('180 + 160 * cards.length'), 'Còn công thức độ dài cũ')
assert(!builder.includes('2-4 đoạn'), 'Còn yêu cầu diễn giải dài cũ')
assert(iching.includes('Kết quả sáu lần gieo'), 'Chưa sửa nhãn sáu lần gieo')
assert(!iching.includes('Sáu hào từ dưới lên'), 'Còn nhãn hào từ sai')
assert(iching.includes('220-350 từ'), 'Thiếu giới hạn độ dài Kinh Dịch')
assert(iching.includes('translation_vi'), 'Runtime chưa dùng bản dịch Việt khi có')

console.log('Dữ liệu và prompt bài đọc hợp lệ: 64 quẻ, 384 hào, cấu trúc v8 đầy đủ.')
