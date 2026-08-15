import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { IconButton } from '@/components'

/**
 * Khung chung cho các trang cài đặt. Nút quay lại đứng riêng một dòng và được
 * kéo ngược lại bằng margin âm: hộp bấm 56px bọc icon 26px, nên nếu để nguyên
 * thì icon thụt vào 15px so với lề của mọi thứ bên dưới.
 */
export function SettingsLayout({
  title,
  description,
  children,
  actions,
}: {
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh bg-surface text-on-surface">
      <div className="md-slide-up mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-8">
        <header>
          {/* Hộp bấm 56px bọc icon 26px nên icon thụt vào 15px; kéo lại cho
              thẳng lề với mọi thứ bên dưới. */}
          <span className="-ml-[15px] block">
            <IconButton
              icon="arrowBack"
              label="Quay lại"
              size="md"
              onClick={() => navigate('/chat')}
            />
          </span>
          <h1 className="mt-1 md-headline-sm text-on-surface">{title}</h1>
          {description && (
            <p className="mt-2 md-body-md text-on-surface-variant">{description}</p>
          )}
        </header>

        <main className="flex flex-col gap-6">{children}</main>

        {actions && <footer className="flex justify-end gap-2 pb-6">{actions}</footer>}
      </div>
    </div>
  )
}
