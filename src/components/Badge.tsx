import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface BadgeProps {
  /** Omit for the 6dp dot badge; supply a number for the labelled variant. */
  count?: number
  max?: number
  children: ReactNode
  className?: string
  hidden?: boolean
}

export function Badge({ count, max = 999, children, className, hidden = false }: BadgeProps) {
  const dot = count === undefined
  const display = !dot && count > max ? `${max}+` : count

  return (
    <span className={cn('relative inline-flex', className)}>
      {children}
      {!hidden && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute flex items-center justify-center rounded-full bg-error text-on-error',
            dot
              ? 'top-0.5 right-0.5 size-1.5'
              : '-top-1 -right-2 h-4 min-w-4 px-1 md-label-sm',
          )}
        >
          {!dot && display}
        </span>
      )}
    </span>
  )
}
