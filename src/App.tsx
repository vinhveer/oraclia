import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Center, Loader } from '@mantine/core'
import { AppLayout } from '@/app/AppLayout'
import { SessionProvider, useSession } from '@/features/auth/SessionProvider'
import LoginPage from '@/pages/LoginPage'

// Màn hình chat kéo theo assistant-ui và bộ render markdown; trang đăng nhập
// không cần tới, nên tách ra. Cài đặt ít người mở, cũng tách.
const ChatPage = lazy(() => import('@/pages/ChatPage'))
const MemoryPage = lazy(() => import('@/pages/settings/MemoryPage'))
const StylePage = lazy(() => import('@/pages/settings/StylePage'))
const AccountPage = lazy(() => import('@/pages/settings/AccountPage'))
const AppearancePage = lazy(() => import('@/pages/settings/AppearancePage'))

export default function App() {
  return (
    <SessionProvider>
      {/* BASE_URL do Vite điền, nên dev ('/') và Pages ('/oraclia/') dùng chung. */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireSession>
                <AppLayout />
              </RequireSession>
            }
          >
            <Route path="/chat/:id?" element={<Lazy page={<ChatPage />} />} />
            <Route path="/settings/memory" element={<Lazy page={<MemoryPage />} />} />
            <Route path="/settings/style" element={<Lazy page={<StylePage />} />} />
            <Route path="/settings/account" element={<Lazy page={<AccountPage />} />} />
            <Route path="/settings/appearance" element={<Lazy page={<AppearancePage />} />} />
          </Route>
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}

function Splash() {
  return (
    <Center h="100dvh">
      <Loader size="sm" />
    </Center>
  )
}

function Lazy({ page }: { page: React.ReactNode }) {
  return <Suspense fallback={<Splash />}>{page}</Suspense>
}

function RequireSession({ children }: { children: React.ReactNode }) {
  const { user, ready } = useSession()
  if (!ready) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
