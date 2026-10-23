// Gom các câu trả lời bị người đọc chê thành case eval, để bộ eval lớn lên từ lỗi
// thật chứ không chỉ từ câu hỏi tự nghĩ ra.
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/eval/from-feedback.mjs [--since 2026-10-01]
//
// Ghi thêm vào cases-feedback.json (không trùng câu hỏi đã có), chạy bằng
// `npm run eval:readings -- --set feedback`. Ghi chú của người đọc đi theo case để
// lúc xem kết quả biết họ chê điều gì.
import { readFile, writeFile } from 'node:fs/promises'

const url = need('SUPABASE_URL').replace(/\/$/, '')
const key = need('SUPABASE_SERVICE_ROLE_KEY')
const args = process.argv.slice(2)
const since = args.includes('--since') ? args[args.indexOf('--since') + 1] : null

const query = new URLSearchParams({
  select: 'message_id,note,created_at,messages(run_id,agent_runs(question,prompt_version,model))',
  rating: 'eq.-1',
  order: 'created_at.desc',
})
if (since) query.append('created_at', `gte.${since}`)
const response = await fetch(`${url}/rest/v1/message_feedback?${query}`, {
  headers: { apikey: key, authorization: `Bearer ${key}` },
})
if (!response.ok) throw new Error(`message_feedback → ${response.status}: ${(await response.text()).slice(0, 200)}`)
const rows = await response.json()

const file = new URL('./cases-feedback.json', import.meta.url)
const existing = await readFile(file, 'utf8').then(JSON.parse, () => [])
const known = new Set(existing.map((item) => item.question))
const added = []
for (const row of rows) {
  const run = row.messages?.agent_runs
  const question = run?.question?.trim()
  // Lượt phản tư không phải câu hỏi của người đọc.
  if (!question || question === '(reflect)' || known.has(question)) continue
  known.add(question)
  added.push({
    id: `fb-${row.message_id.slice(0, 8)}`,
    category: 'phản hồi',
    question,
    note: row.note || '',
    seen_with: `${run.prompt_version} · ${run.model}`,
  })
}

await writeFile(file, `${JSON.stringify([...existing, ...added], null, 2)}\n`)
console.log(`${rows.length} phản hồi chê, thêm ${added.length} case mới → ${file.pathname}`)

function need(name) {
  if (!process.env[name]) {
    console.error(`Thiếu ${name}.`)
    process.exit(1)
  }
  return process.env[name]
}
