/**
 * Đường dẫn tới file tĩnh trong `public/`. Phải đi qua BASE_URL vì site chạy ở
 * `/oraclia/` trên GitHub Pages — viết `/cards/...` là trỏ ra gốc domain và ảnh
 * sẽ 404 sau khi deploy, dù chạy dev vẫn bình thường.
 */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

/** Bản WebP cạnh ảnh PNG (scripts/optimize-images.mjs); nhỏ hơn khoảng 7 lần. */
export function webp(path: string): string {
  return asset(path.replace(/\.png$/, '.webp'))
}
