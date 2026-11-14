import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
// Thứ tự là thứ tự layer: reset → component của Astryx → token của theme →
// lớp màu của Oraclia (không layer, nên thắng) → nền chung của app.
import '@astryxdesign/core/reset.css'
import '@astryxdesign/core/astryx.css'
import '@astryxdesign/theme-neutral/theme.css'
import './theme/oraclia.css'
import './index.css'
import App from './App.tsx'
import { queryClient } from '@/features/conversations/queries'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { Notifications } from '@/app/Notifications'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Notifications />
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
