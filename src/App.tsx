import { lazy, Suspense, type ComponentProps } from 'react'
import { BrowserRouter, Link as RouterLink, Navigate, Route, Routes } from 'react-router-dom'
import { LinkProvider } from '@astryxdesign/core/Link'
import { Spinner } from '@astryxdesign/core/Spinner'
import { AppLayout } from '@/app/AppLayout'
import { ChatSkeleton, SettingsSkeleton } from '@/app/Skeletons'
import { SessionProvider, useSession } from '@/features/auth/SessionProvider'
import LoginPage from '@/pages/LoginPage'

// Màn hình chat kéo theo bộ render markdown và bộ chat của Astryx; trang đăng
// nhập không cần tới, nên tách ra. Cài đặt ít người mở, cũng tách.
const ChatPage = lazy(() => import('@/pages/ChatPage'))
const MemoryPage = lazy(() => import('@/pages/settings/MemoryPage'))
const StylePage = lazy(() => import('@/pages/settings/StylePage'))
const AccountPage = lazy(() => import('@/pages/settings/AccountPage'))
const AppearancePage = lazy(() => import('@/pages/settings/AppearancePage'))

/**
 * Link của Astryx (SideNavItem, Button có href…) đi qua router, nên chuyển trang
 * không tải lại — tải lại là giết luôn bài đọc đang chảy.
 */
function AppLink({ href, ...rest }: Omit<ComponentProps<'a'>, 'href'> & { href?: string }) {
  return <RouterLink to={href ?? '.'} {...rest} />
}

export default function App() {
  return (
    <SessionProvider>
      {/* BASE_URL do Vite điền, nên dev ('/') và Pages ('/oraclia/') dùng chung. */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <LinkProvider component={AppLink}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <RequireSession>
                  <AppLayout />
                </RequireSession>
              }
            >
              <Route path="/chat/:id?" element={<Lazy page={<ChatPage />} fallback={<ChatSkeleton />} />} />
              <Route path="/settings/memory" element={<Lazy page={<MemoryPage />} />} />
              <Route path="/settings/style" element={<Lazy page={<StylePage />} />} />
              <Route path="/settings/account" element={<Lazy page={<AccountPage />} />} />
              <Route path="/settings/appearance" element={<Lazy page={<AppearancePage />} />} />
            </Route>
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </LinkProvider>
      </BrowserRouter>
    </SessionProvider>
  )
}

function Splash() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100dvh' }}>
      <Spinner size="lg" aria-label="Đang tải" />
    </div>
  )
}

function Lazy({ page, fallback = <SettingsSkeleton /> }: { page: React.ReactNode; fallback?: React.ReactNode }) {
  return <Suspense fallback={fallback}>{page}</Suspense>
}

function RequireSession({ children }: { children: React.ReactNode }) {
  const { user, ready } = useSession()
  if (!ready) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
