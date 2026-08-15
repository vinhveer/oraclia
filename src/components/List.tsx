import type { HTMLAttributes, ReactNode } from 'react'
import { Ripple } from './Ripple'
import { Icon, type IconName } from './Icon'
import { cn } from '@/lib/cn'

export function List({ className, ...rest }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn('flex flex-col py-2', className)} {...rest} />
}

export interface ListItemProps {
  headline: string
  supportingText?: string
  overline?: string
  leadingIcon?: IconName
  leadingAvatar?: ReactNode
  trailing?: ReactNode
  trailingText?: string
  onClick?: () => void
  selected?: boolean
  disabled?: boolean
  className?: string
}

export function ListItem({
  headline,
  supportingText,
  overline,
  leadingIcon,
  leadingAvatar,
  trailing,
  trailingText,
  onClick,
  selected = false,
  disabled = false,
  className,
}: ListItemProps) {
  const interactive = Boolean(onClick)
  const lines = supportingText ? (overline ? 3 : 2) : 1

  const content = (
    <>
      {interactive && <Ripple disabled={disabled} />}
      {leadingAvatar ?? (leadingIcon && <Icon name={leadingIcon} size={24} className="relative z-10 text-on-surface-variant" />)}

      <span className="relative z-10 flex min-w-0 flex-1 flex-col">
        {overline && <span className="md-label-sm text-on-surface-variant">{overline}</span>}
        <span className="truncate md-body-lg text-on-surface">{headline}</span>
        {supportingText && (
          <span className="line-clamp-2 md-body-md text-on-surface-variant">{supportingText}</span>
        )}
      </span>

      {trailingText && (
        <span className="relative z-10 md-label-sm text-on-surface-variant">{trailingText}</span>
      )}
      {trailing && <span className="relative z-10 flex items-center">{trailing}</span>}
    </>
  )

  const classes = cn(
    'group relative flex w-full items-center gap-4 overflow-hidden px-4 text-left transition-colors duration-150',
    lines === 1 ? 'min-h-14' : lines === 2 ? 'min-h-18 py-2' : 'min-h-22 py-3',
    selected && 'bg-secondary-container',
    disabled && 'pointer-events-none opacity-38',
    className,
  )

  return (
    <li className="contents">
      {interactive ? (
        <button type="button" onClick={onClick} disabled={disabled} className={classes}>
          {content}
        </button>
      ) : (
        <div className={classes}>{content}</div>
      )}
    </li>
  )
}

export function Divider({
  inset = false,
  className,
  ...rest
}: HTMLAttributes<HTMLHRElement> & { inset?: boolean }) {
  return (
    <hr
      className={cn('border-0 border-t border-outline-variant', inset && 'ml-16', className)}
      {...rest}
    />
  )
}
