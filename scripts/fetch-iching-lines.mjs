import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const OUTPUT = resolve('supabase/migrations/20260815002100_iching_lines.sql')
const BASE_URL = 'https://zh.wikisource.org/wiki/'

// King Wen order; each name maps to the matching 周易 subpage on Wikisource.
const names = [
  '乾', '坤', '屯', '蒙', '需', '訟', '師', '比', '小畜', '履', '泰', '否', '同人', '大有',
  '謙', '豫', '隨', '蠱', '臨', '觀', '噬嗑', '賁', '剝', '復', '无妄', '大畜', '頤', '大過',
  '坎', '離', '咸', '恒', '遯', '大壯', '晉', '明夷', '家人', '睽', '蹇', '解', '損', '益',
  '夬', '姤', '萃', '升', '困', '井', '革', '鼎', '震', '艮', '漸', '歸妹', '豐', '旅',
  '巽', '兌', '渙', '節', '中孚', '小過', '既濟', '未濟',
]

function clean(value) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/'''/g, '')
    .replace(/-\{([\s\S]*?)\}-/g, '$1')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function quote(value) {
  return `'${value.replaceAll("'", "''")}'`
}

function parseLines(wikitext, page) {
  const spans = wikitext
    .split('\n')
    .filter((line) => line.startsWith('*#<span'))
    .map((line) => clean(line.replace(/^\*#<span[^>]*>/, '')))
    .filter((line) => /^(初[六九]|[六九][二三四五]|上[六九])\s*[:,，：]/u.test(line))

  if (spans.length !== 6) throw new Error(`${page}: cần 6 hào, đọc được ${spans.length}`)
  return spans
}

async function fetchPage(name) {
  const page = `周易/${name}`
  const query = new URLSearchParams({ title: page, action: 'raw' })
  const response = await fetch(`https://zh.wikisource.org/w/index.php?${query}`, {
    headers: { 'User-Agent': 'OracliaDataBuilder/1.0 (local reproducible seed)' },
  })
  const body = await response.text()
  if (!response.ok || body.startsWith('<!DOCTYPE')) {
    throw new Error(`${page}: HTTP ${response.status}; ${body.slice(0, 100)}`)
  }
  return { page, body }
}

async function main() {
  if (names.length !== 64) throw new Error(`Cần 64 quẻ, đang có ${names.length}`)

  const rows = []
  for (let index = 0; index < names.length; index += 1) {
    const { page, body } = await fetchPage(names[index])
    const sourceUrl = `${BASE_URL}${encodeURIComponent(page).replaceAll('%2F', '/')}`
    parseLines(body, page).forEach((sourceText, lineIndex) => {
      rows.push({ hexagram: index + 1, line: lineIndex + 1, sourceText, sourceUrl })
    })
  }

  if (rows.length !== 384) throw new Error(`Cần 384 hào, đang có ${rows.length}`)

  const values = rows
    .map(
      (row) =>
        `  (${row.hexagram}, ${row.line}, ${quote(row.sourceText)}, null, ` +
        `${quote('Chu Dịch — nguyên văn Hán cổ')}, ${quote(row.sourceUrl)}, 'source_only')`,
    )
    .join(',\n')

  const sql = `-- Đủ 384 hào từ theo thứ tự Văn Vương. Dữ liệu là nguyên văn Hán cổ từ
-- Wikisource Trung văn, không giả danh bản dịch Việt đã kiểm duyệt. Cột
-- translation_vi và review_status dành cho quy trình biên tập về sau.
create table public.hexagram_lines (
  hexagram_number integer not null references public.hexagrams(number) on delete cascade,
  line_number      integer not null check (line_number between 1 and 6),
  source_text      text not null,
  translation_vi  text,
  source_name      text not null,
  source_url       text not null,
  review_status    text not null default 'source_only'
    check (review_status in ('source_only', 'draft', 'reviewed')),
  primary key (hexagram_number, line_number)
);

alter table public.hexagram_lines enable row level security;

create policy "hexagram lines are public reference data" on public.hexagram_lines
  for select to authenticated using (true);
create policy "admins curate hexagram lines" on public.hexagram_lines
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.hexagram_lines
  (hexagram_number, line_number, source_text, translation_vi, source_name, source_url, review_status)
values
${values}
on conflict (hexagram_number, line_number) do update set
  source_text = excluded.source_text,
  translation_vi = excluded.translation_vi,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  review_status = excluded.review_status;
`

  await writeFile(OUTPUT, sql)
  console.log(`Đã ghi ${rows.length} hào vào ${OUTPUT}`)
}

await main()
