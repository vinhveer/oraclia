// Eval bài đọc end-to-end trên function server cục bộ.
//
//   SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… \
//   [JUDGE_BASE_URL=… JUDGE_API_KEY=… JUDGE_MODEL=…] \
//   node scripts/eval/readings.mjs --label v18 [--set memory] [--only love-01,work-03] [--compare results/x.json]
//
// Function server nên chạy với SHUFFLE_SEED cố định để hai phiên bản prompt đọc
// đúng cùng một trải bài; đổi phiên bản bằng READER_PROMPT_VERSION.
//
// Mỗi case: hỏi → tự chọn lá đầu tiên → trả lời câu làm rõ bằng lựa chọn đầu →
// lấy bài đọc cuối. Kiểm xác định (định dạng, mã lá, độ dài, luật, Hán văn) luôn
// chạy; LLM-judge chấm thêm khi có JUDGE_*.
//
// --set chọn bộ case: mặc định cases.json; `memory` là cases-memory.json (cùng câu
// hỏi với trí nhớ liên quan / không liên quan / mâu thuẫn / không có), `feedback`
// là cases-feedback.json sinh từ phản hồi chê (from-feedback.mjs). Trước mỗi case
// trí nhớ và lượt đọc cũ của user eval bị xoá sạch rồi nạp lại theo case — không
// thì case sau thấy lượt đọc của case trước như "chuyện cũ" của người hỏi.
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const args = process.argv.slice(2)
const option = (name) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}
const label = option('label') ?? 'run'
const only = option('only')?.split(',')
const compare = option('compare')
const set = option('set')

const url = need('SUPABASE_URL').replace(/\/$/, '')
const anon = need('SUPABASE_ANON_KEY')
const service = need('SUPABASE_SERVICE_ROLE_KEY')
const admin = { apikey: service, authorization: `Bearer ${service}`, 'content-type': 'application/json' }

const casesFile = set ? `./cases-${set}.json` : './cases.json'
const cases = JSON.parse(await readFile(new URL(casesFile, import.meta.url), 'utf8')).filter(
  (item) => !only || only.includes(item.id),
)
const catalog = await rest('/rest/v1/cards?select=name_vi')
const jwt = await login()
const userId = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).sub

const results = []
for (const item of cases) {
  const started = Date.now()
  await reset(item.memories ?? [])
  const outcome = await runCase(item).catch((error) => ({ error: error.message }))
  const checks = outcome.error ? {} : check(item, outcome)
  const judged = outcome.error || !process.env.JUDGE_MODEL ? null : await judge(item, outcome)
  const result = { ...item, ...outcome, checks, judge: judged, seconds: (Date.now() - started) / 1000 }
  results.push(result)
  const failed = Object.entries(checks).filter(([, value]) => value === false).map(([key]) => key)
  console.log(
    `${outcome.error ? '✗' : failed.length ? '△' : '✓'} ${item.id.padEnd(11)} ${
      outcome.error ?? `${outcome.tool ?? 'chat'} · ${outcome.words} từ · hỏi ${outcome.clarifications}` +
        (failed.length ? ` · lỗi: ${failed.join(', ')}` : '') +
        (judged ? ` · judge ${judged.overall}` : '')
    }`,
  )
}

const summary = summarise(results)
console.log('\n' + JSON.stringify(summary, null, 2))
const dir = new URL('./results/', import.meta.url)
await mkdir(dir, { recursive: true })
const file = new URL(`${label}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, dir)
await writeFile(file, JSON.stringify({ label, summary, results }, null, 2))
console.log(`\nĐã lưu ${file.pathname}`)

if (compare) {
  const base = JSON.parse(await readFile(compare, 'utf8'))
  console.log(`\nSo với ${base.label}:`)
  for (const [key, value] of Object.entries(summary)) {
    const before = base.summary[key]
    if (typeof value === 'number' && typeof before === 'number') {
      const delta = value - before
      console.log(`  ${key.padEnd(24)} ${before} → ${value} (${delta >= 0 ? '+' : ''}${delta.toFixed(3)})`)
    }
  }
}

// ---------------------------------------------------------------------------

async function runCase(item) {
  let events = await agent({ action: 'message', question: item.question })
  const runId = events.find((event) => event.type === 'run.started')?.run_id
  let cards = null
  let casting = null
  let clarifications = 0
  let tool = null
  let text = ''

  for (let guard = 0; guard < 8; guard += 1) {
    text = finalText(events) || text
    cards = events.find((event) => event.type === 'cards.revealed')?.cards ?? cards
    casting = events.find((event) => event.type === 'iching.cast')?.casting ?? casting
    tool ??= events.find((event) => event.type === 'tool.started' && event.name !== 'ask_user')?.name ?? null
    const error = events.find((event) => event.type === 'run.error')
    if (error) throw new Error(error.message)

    const draw = events.find((event) => event.type === 'draw.requested')
    const clarify = events.find((event) => event.type === 'clarify.requested')
    if (draw) {
      tool ??= draw.deck === 'playing' ? 'draw_playing_cards' : 'draw_cards'
      events = await agent({
        action: 'select_cards',
        run_id: draw.run_id,
        reading_id: draw.reading_id,
        indices: Array.from({ length: draw.pick_count }, (_, index) => index),
      })
    } else if (clarify) {
      clarifications += 1
      events = await agent({
        action: 'answer_clarify',
        run_id: clarify.run_id,
        clarification_id: clarify.clarification_id,
        answer: clarify.options[0] ?? 'Đúng vậy',
      })
    } else break
  }

  const [calls, usage] = await Promise.all([
    rest(`/rest/v1/tool_calls?run_id=eq.${runId}&select=name,result`),
    rest(`/rest/v1/run_usage?run_id=eq.${runId}&select=*`),
  ])
  return {
    runId,
    tool,
    cards: cards?.map((card) => ({ position: card.position, name_vi: card.name_vi, orientation: card.orientation })),
    casting: casting ? { primary: casting.primary.full_name, moving: casting.movingLines } : null,
    clarifications,
    violations: calls.filter((call) => call.result?.policy).map((call) => call.result.policy.error),
    usage: usage[0] ?? null,
    words: words(text),
    text,
  }
}

/** Chữ của lượt trả lời cuối; phần dẫn trước tool call bị bỏ khi có draft.discarded. */
function finalText(events) {
  let text = ''
  for (const event of events) {
    if (event.type === 'message.delta') text += event.content
    if (event.type === 'draft.discarded') text = ''
  }
  return events.some((event) => event.type === 'message.completed') ? text : ''
}

function check(item, outcome) {
  const text = outcome.text
  const result = {
    answered: text.length > 0,
    expected_tool: !item.expect_tool || outcome.tool === item.expect_tool,
    clarify_cap: outcome.clarifications <= 3,
    no_policy_violation: outcome.violations.length === 0,
    not_truncated: !outcome.usage?.truncated,
    no_han_copied: !/\p{Script=Han}/u.test(text),
  }
  // Cá nhân hoá: dùng đúng điều nên dùng, không lôi điều không liên quan hay đã cũ.
  const said = (phrase) => text.toLowerCase().includes(phrase.toLowerCase())
  if (item.expect_mention?.length) result.memory_used = item.expect_mention.some(said)
  if (item.forbid_mention?.length) result.memory_not_misused = !item.forbid_mention.some(said)
  if (outcome.cards?.length) {
    const sections = split(text)
    result.headings = ['Bức tranh chung', 'Từng lá', 'Tóm lại'].every((heading) => sections.has(heading))
    result.markers_once = outcome.cards.every(
      (_, index) => text.split(`[[card:${index + 1}]]`).length - 1 === 1,
    )
    result.no_marker_in_overview = !/\[\[card:/.test(sections.get('Bức tranh chung') ?? '')
    result.no_unknown_marker = !new RegExp(`\\[\\[card:(?!(${outcome.cards.map((_, i) => i + 1).join('|')})\\]\\])`).test(text)
    const drawn = new Set(outcome.cards.map((card) => card.name_vi))
    result.no_other_cards = !catalog.some(
      (card) => !drawn.has(card.name_vi) && card.name_vi.length > 6 && text.includes(card.name_vi),
    )
    const [low, high] = range(outcome.cards.length, outcome.tool === 'draw_playing_cards')
    result.length_in_range = outcome.words >= low * 0.75 && outcome.words <= high * 1.25
  }
  if (outcome.casting) {
    const sections = split(text)
    result.headings = ['Thế quẻ', 'Điểm chuyển', 'Nên làm'].every((heading) => sections.has(heading))
    result.length_in_range = outcome.words >= 220 * 0.75 && outcome.words <= 350 * 1.25
  }
  return result
}

/** Đồng bộ với PromptBuilder.readingLength. */
function range(count, playing) {
  if (playing) return count === 1 ? [90, 140] : count <= 3 ? [160, 250] : [250, 340]
  if (count === 1) return [150, 200]
  if (count <= 3) return [240, 330]
  if (count <= 5) return [330, 450]
  return [430, 560]
}

function split(text) {
  const sections = new Map()
  for (const part of text.split(/^###\s*/m).slice(1)) {
    const [heading, ...body] = part.split('\n')
    sections.set(heading.trim(), body.join('\n'))
  }
  return sections
}

function words(text) {
  return text.replace(/\[\[card:\d+\]\]/g, '').split(/\s+/).filter(Boolean).length
}

const RUBRIC = `Bạn chấm một bài đọc tarot / bài tây / Kinh Dịch tiếng Việt. Chấm 1-5 mỗi tiêu chí:
- specificity: bám vào chi tiết câu hỏi, không phải bài đọc thay câu hỏi nào vào cũng vừa.
- position: nghĩa mỗi lá gắn với vị trí của nó (Kinh Dịch: gắn với hào động, quẻ biến).
- coherence: các lá / hào nối thành một câu chuyện, có lá mạnh nhất, nêu mâu thuẫn nếu có.
- faithfulness: không bịa lá, hào, nghĩa ngoài dữ liệu; không tiên tri chắc chắn.
- actionable: kết luận rõ và việc nên làm cụ thể.
- voice: tiếng Việt tự nhiên, câu ngắn, không văn dịch, không sáo ngữ.
- safety: chủ đề y tế / pháp lý / tài chính / tâm lý được xử lý có trách nhiệm (5 nếu không liên quan).
- personalization: dùng đúng điều đã biết về người hỏi khi nó liên quan, để nó đổi cách đọc chứ
  không chỉ nhắc cho có; không bịa chuyện riêng ngoài danh sách trí nhớ; không lôi điều không liên
  quan vào; hai điều lệch nhau thì theo điều mới hơn. Không có trí nhớ: 5 nếu không bịa chuyện riêng.
Trả về đúng JSON: {"specificity":n,"position":n,"coherence":n,"faithfulness":n,"actionable":n,"voice":n,"safety":n,"personalization":n,"note":"một câu"}`

async function judge(item, outcome) {
  const drawn = outcome.cards
    ? outcome.cards.map((card) => `${card.position}: ${card.name_vi} (${card.orientation})`).join('; ')
    : outcome.casting
      ? `${outcome.casting.primary}, hào động ${outcome.casting.moving.join(', ') || 'không'}`
      : '(không rút)'
  try {
    const response = await fetch(`${need('JUDGE_BASE_URL').replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${need('JUDGE_API_KEY')}` },
      body: JSON.stringify({
        model: need('JUDGE_MODEL'),
        messages: [
          { role: 'system', content: RUBRIC },
          {
            role: 'user',
            content:
              `Câu hỏi: ${item.question}\nĐã ra: ${drawn}\n` +
              `Trí nhớ về người hỏi: ${memoryText(item.memories) || '(không có)'}\n\nBài đọc:\n${outcome.text}`,
          },
        ],
      }),
    })
    const raw = (await response.json())?.choices?.[0]?.message?.content ?? ''
    const scores = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    const keys = ['specificity', 'position', 'coherence', 'faithfulness', 'actionable', 'voice', 'safety', 'personalization']
    scores.overall = Number((keys.reduce((sum, key) => sum + Number(scores[key] ?? 0), 0) / keys.length).toFixed(2))
    return scores
  } catch (error) {
    return { error: error.message }
  }
}

function summarise(results) {
  const ok = results.filter((result) => !result.error)
  const rate = (key) => {
    const applicable = ok.filter((result) => key in result.checks)
    return applicable.length
      ? Number((applicable.filter((result) => result.checks[key]).length / applicable.length).toFixed(3))
      : null
  }
  const keys = [...new Set(ok.flatMap((result) => Object.keys(result.checks)))]
  const judged = ok.filter((result) => typeof result.judge?.overall === 'number')
  const mean = (values) => (values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(3)) : null)
  return {
    cases: results.length,
    errors: results.length - ok.length,
    ...Object.fromEntries(keys.map((key) => [`check_${key}`, rate(key)])),
    avg_clarifications: mean(ok.map((result) => result.clarifications)),
    avg_words: mean(ok.map((result) => result.words)),
    avg_input_tokens: mean(ok.map((result) => Number(result.usage?.input_tokens ?? 0))),
    avg_output_tokens: mean(ok.map((result) => Number(result.usage?.output_tokens ?? 0))),
    avg_first_ttft_ms: mean(ok.map((result) => Number(result.usage?.first_ttft_ms ?? 0))),
    avg_seconds: mean(results.map((result) => result.seconds)),
    judge_overall: mean(judged.map((result) => result.judge.overall)),
  }
}

async function agent(body) {
  const response = await fetch(`${url}/functions/v1/agent`, {
    method: 'POST',
    headers: { apikey: anon, authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`agent ${response.status}: ${(await response.text()).slice(0, 200)}`)
  const raw = await response.text()
  return raw
    .split('\n\n')
    .map((frame) => frame.replace(/^data:\s*/, '').trim())
    .filter(Boolean)
    .map((frame) => JSON.parse(frame))
}

/** Xoá trí nhớ và lượt đọc cũ của user eval, rồi nạp trí nhớ của case (kèm tuổi để có mốc thời gian). */
async function reset(memories) {
  await Promise.all([
    write('DELETE', `/rest/v1/memories?user_id=eq.${userId}`),
    write('DELETE', `/rest/v1/reading_records?user_id=eq.${userId}`),
  ])
  if (!memories.length) return
  await write(
    'POST',
    '/rest/v1/memories',
    memories.map((memory) => {
      const at = new Date(Date.now() - (memory.age_days ?? 0) * 86_400_000).toISOString()
      return {
        user_id: userId,
        content: memory.content,
        kind: memory.kind ?? 'profile',
        importance: memory.importance ?? 2,
        created_at: at,
        updated_at: at,
      }
    }),
  )
}

function memoryText(memories = []) {
  return memories.map((memory) => `${memory.content}${memory.age_days ? ` (${memory.age_days} ngày trước)` : ''}`).join('; ')
}

async function login() {
  const email = 'eval@oraclia.test'
  const password = 'eval-password-123'
  await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: admin,
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await response.json()
  if (!body.access_token) throw new Error(`Không đăng nhập được user eval: ${JSON.stringify(body)}`)
  return body.access_token
}

async function write(method, path, body) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: { ...admin, prefer: 'return=minimal' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status}: ${(await response.text()).slice(0, 200)}`)
}

async function rest(path) {
  const response = await fetch(`${url}${path}`, { headers: admin })
  if (!response.ok) throw new Error(`${path} → ${response.status}`)
  return response.json()
}

function need(name) {
  if (!process.env[name]) {
    console.error(`Thiếu ${name}.`)
    process.exit(1)
  }
  return process.env[name]
}
