// Duyệt tri thức ngay trên file nguồn, để mọi lần duyệt đều hiện thành diff.
//
//   node scripts/kb/review.mjs list [--status draft] [--kind card]
//   node scripts/kb/review.mjs show <id>
//   node scripts/kb/review.mjs approve <id…>        (hoặc --kind card / --all-drafts)
//   node scripts/kb/review.mjs reject <id…>
//
// Sửa nội dung thì sửa thẳng file JSON; script này chỉ đổi trạng thái.
import { loadFiles, saveFile } from './entries.mjs'

const [command, ...rest] = process.argv.slice(2)
const flag = (name) => {
  const index = rest.indexOf(`--${name}`)
  return index >= 0 ? (rest[index + 1] ?? true) : undefined
}
const files = await loadFiles()
const all = [...files.entries()].flatMap(([file, entries]) =>
  entries.map((entry) => ({ file, entry })),
)

if (command === 'list') {
  const status = flag('status')
  const kind = flag('kind')
  const rows = all.filter(
    ({ entry }) =>
      (!status || entry.review_status === status) && (!kind || entry.kind === kind),
  )
  for (const { entry } of rows) {
    console.log(`${entry.review_status.padEnd(8)} ${entry.kind.padEnd(13)} ${entry.id}  ${entry.title}`)
  }
  const counts = {}
  for (const { entry } of all) counts[entry.review_status] = (counts[entry.review_status] ?? 0) + 1
  console.log(`\n${rows.length} mục khớp. Tổng: ${JSON.stringify(counts)}`)
} else if (command === 'show') {
  const found = all.find(({ entry }) => entry.id === rest[0])
  if (!found) {
    console.error('Không có mục này.')
    process.exit(1)
  }
  const { entry } = found
  console.log(`# ${entry.title}  [${entry.id}, ${entry.review_status}]\n`)
  console.log(entry.body_vi)
  console.log(`\nKeywords: ${(entry.keywords ?? []).join(', ')}`)
  console.log(`gist_en: ${entry.gist_en}`)
  console.log(`Nguồn: ${entry.source}`)
} else if (command === 'approve' || command === 'reject') {
  const status = command === 'approve' ? 'approved' : 'rejected'
  const kind = flag('kind')
  const drafts = rest.includes('--all-drafts')
  const ids = new Set(rest.filter((item) => !item.startsWith('--') && item !== kind))
  let touched = 0
  for (const [file, entries] of files) {
    let dirty = false
    for (const entry of entries) {
      const hit =
        ids.has(entry.id) ||
        (kind && entry.kind === kind && entry.review_status === 'draft') ||
        (drafts && entry.review_status === 'draft')
      if (hit && entry.review_status !== status) {
        entry.review_status = status
        dirty = true
        touched += 1
      }
    }
    if (dirty) await saveFile(file, entries)
  }
  console.log(`Đã chuyển ${touched} mục sang ${status}. Chạy scripts/kb/sync.mjs để đẩy lên DB.`)
} else {
  console.log('Lệnh: list | show <id> | approve <id…> | reject <id…>')
}
