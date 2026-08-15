import type { ReactNode } from 'react'
import { Ripple } from './Ripple'
import { Icon, type IconName } from './Icon'
import { cn } from '@/lib/cn'

export interface NavItem {
  id: string
  label: string
  icon: IconName
  badge?: number | boolean
}

export interface NavigationBarProps {
  items: NavItem[]
  value: string
  onChange: (id: string) => void
  className?: string
}

/** Bottom navigation bar — the compact-window destination switcher. */
export function NavigationBar({ items, value, onChange, className }: NavigationBarProps) {
  return (
    <nav
      className={cn(
        'flex h-20 items-center justify-around border-t border-outline-variant bg-surface-container px-2',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(item.id)}
            className="group flex flex-1 flex-col items-center gap-1 py-3"
          >
            {/* The badge sits outside the indicator, which clips its ripple. */}
            <span className="relative">
              <span
                className={cn(
                  'relative flex h-8 w-16 items-center justify-center overflow-hidden rounded-full',
                  'transition-[background-color,width] duration-300 ease-[var(--ease-emphasized)]',
                  active ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant',
                )}
              >
                <Ripple />
                <Icon name={item.icon} size={24} filled={active} className="relative z-10" />
              </span>
              {item.badge !== undefined && item.badge !== false && (
                <span
                  className={cn(
                    'absolute flex items-center justify-center rounded-full bg-error text-on-error',
                    item.badge === true
                      ? 'top-0.5 right-[18px] size-1.5'
                      : 'top-0 right-3 h-4 min-w-4 px-1 md-label-sm',
                  )}
                >
                  {item.badge !== true && item.badge}
                </span>
              )}
            </span>
            <span
              className={cn(
                'md-label-md transition-colors duration-200',
                active ? 'text-on-surface' : 'text-on-surface-variant',
              )}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

export interface NavigationRailProps extends NavigationBarProps {
  /** Rendered above the destinations — usually a FAB or menu button. */
  header?: ReactNode
  /** M3 Expressive rail: labels tuck under icons and the rail can expand. */
  expanded?: boolean
}

export function NavigationRail({
  items,
  value,
  onChange,
  header,
  expanded = false,
  className,
}: NavigationRailProps) {
  return (
    <nav
      className={cn(
        'flex flex-col gap-3 bg-surface-container py-4 transition-[width] duration-300 ease-[var(--ease-emphasized)]',
        expanded ? 'w-56 px-3' : 'w-20 items-center px-2',
        className,
      )}
    >
      {header && <div className={cn('mb-2', expanded ? 'px-1' : '')}>{header}</div>}

      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(item.id)}
            className={cn(
              'group relative flex items-center overflow-hidden transition-colors duration-200',
              expanded
                ? cn(
                    'h-14 gap-3 rounded-full px-4',
                    active ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant',
                  )
                : 'flex-col gap-1',
            )}
          >
            {expanded ? (
              <>
                <Ripple />
                <Icon name={item.icon} size={24} filled={active} className="relative z-10" />
                <span className="relative z-10 md-label-lg">{item.label}</span>
              </>
            ) : (
              <>
                <span
                  className={cn(
                    'relative flex h-8 w-14 items-center justify-center overflow-hidden rounded-full transition-colors duration-200',
                    active ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant',
                  )}
                >
                  <Ripple />
                  <Icon name={item.icon} size={24} filled={active} className="relative z-10" />
                </span>
                <span
                  className={cn(
                    'md-label-md',
                    active ? 'text-on-surface' : 'text-on-surface-variant',
                  )}
                >
                  {item.label}
                </span>
              </>
            )}
          </button>
        )
      })}
    </nav>
  )
}

export interface TopAppBarProps {
  title: string
  /** `small` is the standard bar; `medium` / `large` add a two-line headline. */
  size?: 'small' | 'medium' | 'large'
  leading?: ReactNode
  trailing?: ReactNode
  /** Tints the bar with the container role, as when content scrolls under it. */
  scrolled?: boolean
  className?: string
}

export function TopAppBar({
  title,
  size = 'small',
  leading,
  trailing,
  scrolled = false,
  className,
}: TopAppBarProps) {
  return (
    <header
      className={cn(
        'flex w-full transition-[background-color,box-shadow] duration-200',
        scrolled ? 'bg-surface-container shadow-e2' : 'bg-surface',
        size === 'small' ? 'h-16 items-center gap-1 px-1' : 'flex-col px-1 pb-6',
        size === 'medium' && 'h-28',
        size === 'large' && 'h-38',
        className,
      )}
    >
      {size === 'small' ? (
        <>
          {leading}
          <h1 className="flex-1 truncate px-3 md-title-lg text-on-surface">{title}</h1>
          <div className="flex items-center gap-1">{trailing}</div>
        </>
      ) : (
        <>
          <div className="flex h-16 shrink-0 items-center gap-1">
            {leading}
            <span className="flex-1" />
            <div className="flex items-center gap-1">{trailing}</div>
          </div>
          <h1
            className={cn(
              'mt-auto px-4 text-on-surface',
              size === 'large' ? 'md-headline-md' : 'md-headline-sm',
            )}
          >
            {title}
          </h1>
        </>
      )}
    </header>
  )
}
