import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ModalsProvider } from '@mantine/modals'
import { QueryClientProvider } from '@tanstack/react-query'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './index.css'
import App from './App.tsx'
import { queryClient } from '@/features/conversations/queries'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { NotificationPosition } from '@/app/NotificationPosition'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ModalsProvider labels={{ confirm: 'Đồng ý', cancel: 'Huỷ' }}>
          <NotificationPosition />
          <App />
        </ModalsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
