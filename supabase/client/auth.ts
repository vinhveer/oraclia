import { supabase, siteUrl } from './client'
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
    options: {
      data: { display_name: displayName },
      // Không có dòng này thì link trong thư trỏ về Site URL của project, tức
      // localhost, và người dùng thật sẽ bấm vào một đường dẫn chết.
      emailRedirectTo: siteUrl(),
    },
  })
  if (error) throw new Error(translate(error.message))
  return { needsConfirmation: !data.session }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

/**
 * Phiên đọc từ kho cục bộ: không chạm mạng nên trả về ngay khi mở trang. Đây là
 * thứ quyết định người dùng đã đăng nhập hay chưa; hồ sơ chỉ là phần tô thêm.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const { data } = await supabase.auth.getSession()
  return fromAuthUser(data.session?.user ?? null)
}

/** Tên hiển thị và vai trò nằm ở bảng profiles; gọi sau khi màn hình đã lên. */
export async function loadProfile(user: SessionUser): Promise<SessionUser> {
  const { data } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .maybeSingle<Pick<ProfileRow, 'display_name' | 'role'>>()
  if (!data) return user
  return {
    ...user,
    displayName: data.display_name || user.displayName,
    role: data.role ?? user.role,
  }
}

interface AuthUserLike {
  id: string
  email?: string | null
  user_metadata?: { display_name?: string | null } | null
}

function fromAuthUser(user: AuthUserLike | null): SessionUser | null {
  if (!user) return null
  const email = user.email ?? ''
  return {
    id: user.id,
    email,
    displayName: user.user_metadata?.display_name || email.split('@')[0],
    role: 'user',
  }
}

/**
 * Supabase giữ một khoá nội bộ trong lúc chạy callback này. Gọi tiếp một hàm
 * supabase (kể cả truy vấn bảng) ngay trong callback sẽ chờ chính khoá đó và
 * treo cứng tab cho tới khi tải lại — nên ở đây chỉ đọc từ session có sẵn.
 */
export function onAuthChange(handler: (user: SessionUser | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    handler(fromAuthUser(session?.user ?? null))
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
