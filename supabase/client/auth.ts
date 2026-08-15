import { supabase } from './client'
import type { ProfileRow } from './database.types'

export interface SessionUser {
  id: string
  email: string
  displayName: string
  role: 'user' | 'admin'
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(translate(error.message))
}

/**
 * Trả về true khi project bật xác nhận email: khi đó Supabase không cấp session
 * ngay, người dùng phải bấm link trong thư trước đã.
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })
  if (error) throw new Error(translate(error.message))
  return { needsConfirmation: !data.session }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export async function currentUser(): Promise<SessionUser | null> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', data.user.id)
    .maybeSingle<Pick<ProfileRow, 'display_name' | 'role'>>()
  return {
    id: data.user.id,
    email: data.user.email ?? '',
    displayName: profile?.display_name || (data.user.email ?? '').split('@')[0],
    role: profile?.role ?? 'user',
  }
}

export function onAuthChange(handler: (user: SessionUser | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange(() => {
    currentUser().then(handler).catch(() => handler(null))
  })
  return () => data.subscription.unsubscribe()
}

function translate(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Email hoặc mật khẩu không đúng.'
  if (/email not confirmed/i.test(message)) return 'Hãy xác nhận email trước khi đăng nhập.'
  if (/already registered/i.test(message)) return 'Email này đã được đăng ký.'
  if (/password/i.test(message) && /least/i.test(message)) return 'Mật khẩu cần ít nhất 6 ký tự.'
  return message
}
