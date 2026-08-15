import { copyFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const docs = resolve(process.cwd(), 'docs')

// Không có file này thì GitHub Pages đẩy build qua Jekyll, và Jekyll bỏ qua mọi
// thư mục bắt đầu bằng dấu gạch dưới — assets của Vite sẽ 404.
writeFileSync(resolve(docs, '.nojekyll'), '')

// Pages không rewrite cho SPA: mở thẳng /oraclia/chat/abc sẽ ra trang 404 của
// nó. Dùng chính index.html làm trang 404 để router tự xử lý đường dẫn.
copyFileSync(resolve(docs, 'index.html'), resolve(docs, '404.html'))

console.log('docs/: đã thêm .nojekyll và 404.html')
