import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { currentUser, onAuthChange, signOut, type SessionUser } from '@db'

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
    currentUser()
      .then((value) => active && setUser(value))
      .catch(() => active && setUser(null))
      .finally(() => active && setReady(true))
    // Supabase refreshes tokens in the background; follow it rather than poll.
    const unsubscribe = onAuthChange((value) => {
      if (active) setUser(value)
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
