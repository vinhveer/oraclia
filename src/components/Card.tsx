import type { HTMLAttributes, ReactNode } from 'react'
import { Ripple } from './Ripple'
import { cn } from '@/lib/cn'

export type CardVariant = 'elevated' | 'filled' | 'outlined'

const variants: Record<CardVariant, string> = {
  elevated: 'bg-surface-low shadow-e1',
  filled: 'bg-surface-high',
  outlined: 'bg-surface border border-outline-variant',
}

const interactiveVariants: Record<CardVariant, string> = {
  elevated: 'hover:shadow-e2',
  filled: 'hover:bg-surface-highest',
  outlined: 'hover:border-outline',
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  /** Adds a state layer, ripple, and keyboard affordances. */
  interactive?: boolean
  children?: ReactNode
}

export function Card({
  variant = 'elevated',
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'group relative isolate rounded-md text-on-surface transition-all duration-200 ease-[var(--ease-standard)]',
        variants[variant],
        interactive && cn('cursor-pointer overflow-hidden active:scale-[0.99]', interactiveVariants[variant]),
        className,
      )}
      {...(interactive ? { role: 'button', tabIndex: 0 } : {})}
      {...rest}
    >
      {interactive && <Ripple />}
      {children}
    </div>
  )
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('relative z-10 flex items-center gap-4 p-4', className)} {...rest} />
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('relative z-10 px-4 pb-4', className)} {...rest} />
}

export function CardActions({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('relative z-10 flex items-center justify-end gap-2 p-4 pt-2', className)} {...rest} />
  )
}
