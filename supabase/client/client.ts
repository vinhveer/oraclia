import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Project mặc định. Anon key vốn được thiết kế để lộ ra browser — thứ chặn truy
 * cập là RLS, không phải key này — nên để thẳng trong code cho khỏi phải dựng
 * .env mỗi lần clone. Vẫn cho phép ghi đè bằng env khi cần trỏ sang project khác.
 */
const DEFAULT_URL = 'https://eexciimmlqzlpeyklroe.supabase.co'
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleGNpaW1tbHF6bHBleWtscm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODY0MjAsImV4cCI6MjEwMjM2MjQyMH0.6FMiEMbjcS3trpenKx15TrYD0HP_JgT9dZfeCJPSwbo'

const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY

/** The single browser connection. Everything else in this folder builds on it. */
export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export const functionsUrl = `${url.replace(/\/$/, '')}/functions/v1`

/**
 * Nơi Supabase gửi người dùng quay lại sau khi bấm link trong email. Dựng từ
 * origin thật của trang đang chạy, nên dev về localhost còn bản deploy về
 * GitHub Pages mà không cần đổi code.
 */
export function siteUrl(path = ''): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '')
  return path ? `${base}/${path.replace(/^\//, '')}` : base
}

export async function accessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn.')
  return token
}
