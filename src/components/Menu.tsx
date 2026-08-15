import { useRef, useState, type ReactNode } from 'react'
import { Ripple } from './Ripple'
import { Icon, type IconName } from './Icon'
import { useDismiss } from '@/hooks/useDismiss'
import { cn } from '@/lib/cn'

export interface MenuItem {
  id: string
  label: string
  icon?: IconName
  trailingText?: string
  disabled?: boolean
  destructive?: boolean
  /** Draws a divider above this item. */
  dividerBefore?: boolean
}

export interface MenuProps {
  items: MenuItem[]
  onSelect: (id: string) => void
  /** The control the menu hangs off. Receives an onClick that toggles the menu. */
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean }) => ReactNode
  align?: 'start' | 'end'
  className?: string
}

export function Menu({ items, onSelect, trigger, align = 'start', className }: MenuProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useDismiss(root, open, () => setOpen(false))

  return (
    <div ref={root} className={cn('relative inline-block', className)}>
      {trigger({ onClick: () => setOpen((v) => !v), 'aria-expanded': open })}

      {open && (
        <div
          role="menu"
          className={cn(
            'md-enter-scale absolute top-[calc(100%+4px)] z-50 min-w-56 rounded-md bg-surface-container py-2 shadow-e2',
            'origin-top',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <div key={item.id}>
              {item.dividerBefore && <hr className="my-2 border-outline-variant" />}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  onSelect(item.id)
                  setOpen(false)
                }}
                className={cn(
                  'group relative flex h-12 w-full items-center gap-3 overflow-hidden px-3 text-left md-label-lg',
                  item.destructive ? 'text-error' : 'text-on-surface',
                  item.disabled && 'pointer-events-none text-on-surface/38',
                )}
              >
                <Ripple disabled={item.disabled} />
                {item.icon && <Icon name={item.icon} size={22} className="relative z-10 text-current" />}
                <span className="relative z-10 flex-1 truncate">{item.label}</span>
                {item.trailingText && (
                  <span className="relative z-10 md-label-md text-on-surface-variant">
                    {item.trailingText}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
