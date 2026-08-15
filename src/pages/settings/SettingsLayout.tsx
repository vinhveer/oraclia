import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { IconButton } from '@/components'

/** Khung chung cho các trang cài đặt: nút quay lại, tiêu đề, phần mô tả. */
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
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-8">
        <header className="flex items-start gap-3">
          <IconButton icon="arrowBack" label="Quay lại" onClick={() => navigate('/chat')} />
          <div className="min-w-0 flex-1 pt-2">
            <h1 className="md-headline-sm text-on-surface">{title}</h1>
            {description && (
              <p className="mt-1 md-body-md text-on-surface-variant">{description}</p>
            )}
          </div>
        </header>

        <main className="flex flex-col gap-6">{children}</main>

        {actions && <footer className="flex justify-end gap-2 pb-6">{actions}</footer>}
      </div>
    </div>
  )
}
