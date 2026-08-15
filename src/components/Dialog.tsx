import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon, type IconName } from './Icon'
import { useDismiss } from '@/hooks/useDismiss'
import { cn } from '@/lib/cn'

export interface DialogProps {
  open: boolean
  onClose: () => void
  headline: string
  icon?: IconName
  children?: ReactNode
  /** Buttons row; typically a text "Cancel" plus a confirming action. */
  actions?: ReactNode
  /** Full-screen dialog on small viewports, per the M3 responsive pattern. */
  fullScreenOnMobile?: boolean
  className?: string
}

export function Dialog({
  open,
  onClose,
  headline,
  icon,
  children,
  actions,
  fullScreenOnMobile = false,
  className,
}: DialogProps) {
  const panel = useRef<HTMLDivElement>(null)
  useDismiss(panel, open, onClose)

  // Keep the page behind the scrim from scrolling while the dialog is up.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="md-fade-in absolute inset-0 bg-scrim/32" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={headline}
        className={cn(
          'md-enter-scale relative flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-xl bg-surface-high p-6 text-on-surface shadow-e3',
          fullScreenOnMobile && 'max-sm:h-full max-sm:max-h-none max-sm:rounded-none',
          className,
        )}
      >
        {icon && (
          <Icon name={icon} size={24} className="mb-4 self-center text-secondary" />
        )}
        <h2 className={cn('md-headline-sm text-on-surface', icon && 'text-center')}>{headline}</h2>
        <div className="mt-4 flex-1 overflow-auto md-body-md text-on-surface-variant">{children}</div>
        {actions && <div className="mt-6 flex justify-end gap-2">{actions}</div>}
      </div>
    </div>,
    document.body,
  )
}
