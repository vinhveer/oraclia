import { execSync } from 'node:child_process'

/** Khoá của stack Supabase local, đọc thẳng từ CLI để không phải chép tay. */
export function localSupabase() {
  const raw = execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  const env = Object.fromEntries(
    raw
      .split('\n')
      .filter((line) => line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, '')]
      }),
  )
  if (!env.API_URL) throw new Error('Supabase local chưa chạy: npx supabase start')
  return { url: env.API_URL as string, anonKey: env.ANON_KEY as string, serviceKey: env.SERVICE_ROLE_KEY as string }
}

/** Mỗi project một user, để trí nhớ, cài đặt, danh sách của project này không lẫn sang project kia. */
export const PROJECTS = ['desktop', 'laptop', 'iphone', 'pixel', 'ipad'] as const
export const e2eUser = (project: string) => ({
  email: `e2e-${project}@oraclia.test`,
  password: 'e2e-password-123',
})
export const authFile = (project: string) => `e2e/.auth/${project}.json`
export const APP_PORT = 5188
export const BASE_PATH = '/oraclia/'
