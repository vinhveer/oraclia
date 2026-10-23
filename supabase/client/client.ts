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

const REMEMBER_KEY = 'oraclia.remember'

const remembering = () => localStorage.getItem(REMEMBER_KEY) !== '0'

/**
 * Nhớ đăng nhập hay không quyết định phiên nằm ở đâu: localStorage thì sống qua
 * lần mở trình duyệt sau, sessionStorage thì mất khi đóng tab. Phải chọn trước
 * khi đăng nhập, vì lúc đó Supabase mới ghi token xuống.
 */
export function setRemember(value: boolean): void {
  localStorage.setItem(REMEMBER_KEY, value ? '1' : '0')
  // Dọn token ở kho không dùng nữa, kẻo lần sau đọc nhầm phiên cũ.
  const stale = value ? sessionStorage : localStorage
  for (const key of Object.keys(stale)) {
    if (key.startsWith('sb-')) stale.removeItem(key)
  }
}

export const isRemembering = (): boolean => remembering()

const sessionStore = {
  getItem: (key: string) => (remembering() ? localStorage : sessionStorage).getItem(key),
  setItem: (key: string, value: string) =>
    (remembering() ? localStorage : sessionStorage).setItem(key, value),
  removeItem: (key: string) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

/** The single browser connection. Everything else in this folder builds on it. */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: sessionStore,
    // Passkey của Supabase Auth còn ở dạng thử nghiệm; không bật cờ này thì mọi
    // hàm passkey ném lỗi ngay khi gọi.
    experimental: { passkey: true },
  },
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
