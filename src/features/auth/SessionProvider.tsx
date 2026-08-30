import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { currentUser, loadProfile, onAuthChange, signOut, type SessionUser } from '@db'

interface SessionValue {
  user: SessionUser | null
  ready: boolean
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    let knownId: string | null = null
    // Phiên nằm sẵn trong localStorage nên bước này không chạm mạng: đã đăng
    // nhập thì màn hình chat lên ngay, không phải ngồi nhìn vòng quay.
    currentUser()
      .then((value) => {
        if (!active) return
        knownId = value?.id ?? null
        setUser(value)
        setReady(true)
        if (value) enrich(value)
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        setReady(true)
      })

    /** Tên hiển thị và vai trò về sau, thay tại chỗ mà không chặn màn hình. */
    function enrich(value: SessionUser) {
      loadProfile(value)
        .then((full) => {
          if (active) setUser((current) => (current?.id === full.id ? full : current))
        })
        .catch(() => undefined)
    }

    // Supabase refreshes tokens in the background; follow it rather than poll.
    const unsubscribe = onAuthChange((value) => {
      if (!active) return
      // Token tự làm mới cũng gọi vào đây; cùng một người thì giữ nguyên hồ sơ
      // đã tải để tên không nháy về email rồi mới đổi lại.
      if (value && value.id === knownId) return
      knownId = value?.id ?? null
      setUser(value)
      setReady(true)
      if (value) enrich(value)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const value = useMemo<SessionValue>(
    () => ({
      user,
      ready,
      logout: async () => {
        await signOut()
        setUser(null)
      },
    }),
    [user, ready],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside a <SessionProvider>')
  return value
}
