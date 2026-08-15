import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: ReactNode
  /** Rich tooltips add a subhead and stay on the surface colour role. */
  subhead?: string
  placement?: TooltipPlacement
  children: ReactNode
  className?: string
}

const placements: Record<TooltipPlacement, string> = {
  top: 'bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2',
  bottom: 'top-[calc(100%+8px)] left-1/2 -translate-x-1/2',
  left: 'right-[calc(100%+8px)] top-1/2 -translate-y-1/2',
  right: 'left-[calc(100%+8px)] top-1/2 -translate-y-1/2',
}

export function Tooltip({ content, subhead, placement = 'top', children, className }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const rich = Boolean(subhead)

  return (
    <span
      className={cn('relative inline-flex', className)}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'md-fade-in pointer-events-none absolute z-50 w-max',
            placements[placement],
            rich
              ? 'max-w-72 rounded-md bg-surface-container p-4 text-on-surface-variant shadow-e2'
              : 'max-w-56 rounded-xs bg-inverse-surface px-2 py-1 md-body-sm text-inverse-on-surface',
          )}
        >
          {subhead && <span className="mb-1 block md-title-sm text-on-surface">{subhead}</span>}
          <span className={cn(rich && 'md-body-md')}>{content}</span>
        </span>
      )}
    </span>
  )
}
