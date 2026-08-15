import { copyFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const docs = resolve(process.cwd(), 'docs')

// Không có file này thì GitHub Pages đẩy build qua Jekyll, và Jekyll bỏ qua mọi
// thư mục bắt đầu bằng dấu gạch dưới — assets của Vite sẽ 404.
writeFileSync(resolve(docs, '.nojekyll'), '')

// Pages không rewrite cho SPA: mở thẳng /oraclia/chat/abc sẽ ra trang 404 của
// nó. Dùng chính index.html làm trang 404 để router tự xử lý đường dẫn.
copyFileSync(resolve(docs, 'index.html'), resolve(docs, '404.html'))

// Chặn tái diễn lỗi ảnh 404 sau deploy: đường dẫn tĩnh phải đi qua asset() để
// mang base '/oraclia/', chứ viết thẳng '/cards/...' là trỏ ra gốc domain.
const bundleDir = resolve(docs, 'assets')
const offenders = []
for (const file of readdirSync(bundleDir).filter((name) => name.endsWith('.js'))) {
  const code = readFileSync(resolve(bundleDir, file), 'utf8')
  for (const bad of ['"/cards/', "`/cards/", '"/icons.svg', '"/favicon.svg']) {
    if (code.includes(bad)) offenders.push(`${file}: ${bad}`)
  }
}
if (offenders.length) {
  console.error('Đường dẫn tĩnh không qua asset():\n  ' + offenders.join('\n  '))
  process.exit(1)
}

console.log('docs/: đã thêm .nojekyll và 404.html, đường dẫn tĩnh hợp lệ')
