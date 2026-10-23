// So cặp hai lần chạy eval (vd. v18 với v19) trên cùng các case.
//
//   JUDGE_BASE_URL=… JUDGE_API_KEY=… JUDGE_MODEL=… \
//   node scripts/eval/pairwise.mjs results/v18-….json results/v19-….json
//
// Điểm 1-5 của từng bài trôi theo tâm trạng judge; hỏi thẳng "bài nào tốt hơn"
// nhạy hơn nhiều với khác biệt nhỏ. Judge có thiên vị vị trí, nên mỗi cặp hỏi
// hai lần với thứ tự đảo: chỉ tính thắng khi cả hai lần cùng chọn một bài, lệch
// nhau thì ghi "không chắc". Nên dùng judge khác họ với model đọc bài — model hay
// chấm cao chữ của chính nó.
import { readFile, writeFile } from 'node:fs/promises'

const [fileA, fileB] = process.argv.slice(2)
if (!fileA || !fileB) {
  console.error('Cần hai file kết quả: pairwise.mjs <a.json> <b.json>')
  process.exit(1)
}
const [a, b] = await Promise.all([fileA, fileB].map(async (file) => JSON.parse(await readFile(file, 'utf8'))))
const byId = new Map(b.results.map((result) => [result.id, result]))
const pairs = a.results
  .filter((result) => result.text && byId.get(result.id)?.text)
  .map((result) => [result, byId.get(result.id)])

const PROMPT = `Bạn so hai bài đọc tarot / bài tây / Kinh Dịch tiếng Việt cho cùng một câu hỏi.
Bài tốt hơn là bài: bám chi tiết câu hỏi; nghĩa từng lá / hào gắn với vị trí và nối thành một câu
chuyện; không bịa lá, hào, nghĩa hay chuyện riêng của người hỏi; dùng đúng điều đã biết về người
hỏi khi nó liên quan; kết luận rõ, việc nên làm cụ thể; tiếng Việt tự nhiên; không tiên tri chắc
chắn, không hù dọa. Dài hơn không có nghĩa là tốt hơn. Hai bài có thể ra lá khác nhau; chấm cách
đọc, không chấm lá nào "đẹp" hơn.
Trả về đúng JSON: {"winner":"1"|"2"|"tie","reason":"một câu"}`

const verdicts = []
for (const [left, right] of pairs) {
  const first = await ask(left, right)
  const second = await ask(right, left)
  // Lần hai đảo thứ tự: "1" của lần hai là bài B.
  const flipped = second === '1' ? '2' : second === '2' ? '1' : second
  const outcome = first === flipped ? { 1: 'a', 2: 'b', tie: 'tie' }[first] ?? 'uncertain' : 'uncertain'
  verdicts.push({ id: left.id, category: left.category, outcome, first, second })
  console.log(`${outcome.padEnd(9)} ${left.id}`)
}

const count = (rows, outcome) => rows.filter((row) => row.outcome === outcome).length
const tally = (rows) => ({
  a: count(rows, 'a'),
  b: count(rows, 'b'),
  tie: count(rows, 'tie'),
  uncertain: count(rows, 'uncertain'),
})
const categories = [...new Set(verdicts.map((row) => row.category))]
const summary = {
  a: a.label,
  b: b.label,
  pairs: verdicts.length,
  overall: tally(verdicts),
  by_category: Object.fromEntries(
    categories.map((category) => [category, tally(verdicts.filter((row) => row.category === category))]),
  ),
}
console.log('\n' + JSON.stringify(summary, null, 2))
const out = new URL(`./results/pairwise-${a.label}-vs-${b.label}.json`, import.meta.url)
await writeFile(out, JSON.stringify({ summary, verdicts }, null, 2))
console.log(`\nĐã lưu ${out.pathname}`)

async function ask(one, two) {
  const show = (result) => {
    const drawn = result.cards
      ? result.cards.map((card) => `${card.position}: ${card.name_vi} (${card.orientation})`).join('; ')
      : result.casting
        ? `${result.casting.primary}, hào động ${result.casting.moving.join(', ') || 'không'}`
        : '(không rút)'
    return `Đã ra: ${drawn}\n${result.text}`
  }
  const memories = (one.memories ?? []).map((memory) => memory.content).join('; ')
  try {
    const response = await fetch(`${need('JUDGE_BASE_URL').replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${need('JUDGE_API_KEY')}` },
      body: JSON.stringify({
        model: need('JUDGE_MODEL'),
        messages: [
          { role: 'system', content: PROMPT },
          {
            role: 'user',
            content:
              `Câu hỏi: ${one.question}\nTrí nhớ về người hỏi: ${memories || '(không có)'}\n\n` +
              `=== Bài 1 ===\n${show(one)}\n\n=== Bài 2 ===\n${show(two)}`,
          },
        ],
      }),
    })
    const raw = (await response.json())?.choices?.[0]?.message?.content ?? ''
    const winner = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)).winner
    return ['1', '2', 'tie'].includes(String(winner)) ? String(winner) : 'error'
  } catch {
    return 'error'
  }
}

function need(name) {
  if (!process.env[name]) {
    console.error(`Thiếu ${name}.`)
    process.exit(1)
  }
  return process.env[name]
}
