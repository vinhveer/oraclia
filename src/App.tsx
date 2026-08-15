import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CircularProgress, SnackbarProvider } from '@/components'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { SessionProvider, useSession } from '@/features/auth/SessionProvider'
import ChatPage from '@/pages/ChatPage'
import LoginPage from '@/pages/LoginPage'
import AccountPage from '@/pages/settings/AccountPage'
import AppearancePage from '@/pages/settings/AppearancePage'
import MemoryPage from '@/pages/settings/MemoryPage'
import StylePage from '@/pages/settings/StylePage'

export default function App() {
  return (
    <ThemeProvider>
      <SnackbarProvider>
        <SessionProvider>
          {/* BASE_URL do Vite điền, nên dev ('/') và Pages ('/oraclia/') dùng chung. */}
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/chat/:id?"
                element={
                  <RequireSession>
                    <ChatPage />
                  </RequireSession>
                }
              />
              <Route
                path="/settings/memory"
                element={
                  <RequireSession>
                    <MemoryPage />
                  </RequireSession>
                }
              />
              <Route
                path="/settings/style"
                element={
                  <RequireSession>
                    <StylePage />
                  </RequireSession>
                }
              />
              <Route
                path="/settings/account"
                element={
                  <RequireSession>
                    <AccountPage />
                  </RequireSession>
                }
              />
              <Route
                path="/settings/appearance"
                element={
                  <RequireSession>
                    <AppearancePage />
                  </RequireSession>
                }
              />
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
          </BrowserRouter>
        </SessionProvider>
      </SnackbarProvider>
    </ThemeProvider>
  )
}

function RequireSession({ children }: { children: React.ReactNode }) {
  const { user, ready } = useSession()
  if (!ready) {
    return (
      <div className="grid h-dvh place-items-center bg-surface">
        <CircularProgress />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
