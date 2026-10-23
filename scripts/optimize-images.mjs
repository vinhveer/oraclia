// Tạo bản WebP cạnh mỗi ảnh PNG lá bài (public/cards, public/baitay). Ảnh PNG
// gốc ~270 KB một lá; một trải năm lá trên mạng di động là cả megabyte.
// Cần `cwebp` (brew install webp). Chạy lại an toàn: bỏ qua ảnh đã có bản mới hơn.
//
//   node scripts/optimize-images.mjs
import { execFileSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const folders = ['public/cards', 'public/baitay'].map((folder) => resolve(folder))
let before = 0
let after = 0
let converted = 0

for (const folder of folders) {
  for (const name of readdirSync(folder).filter((file) => file.endsWith('.png'))) {
    const source = join(folder, name)
    const target = source.replace(/\.png$/, '.webp')
    const fresh = (() => {
      try {
        return statSync(target).mtimeMs >= statSync(source).mtimeMs
      } catch {
        return false
      }
    })()
    if (!fresh) {
      execFileSync('cwebp', ['-quiet', '-q', '82', '-m', '6', source, '-o', target])
      converted += 1
    }
    before += statSync(source).size
    after += statSync(target).size
  }
}

console.log(
  `WebP: ${converted} ảnh mới. PNG ${(before / 1048576).toFixed(1)} MB → WebP ${(after / 1048576).toFixed(1)} MB.`,
)
