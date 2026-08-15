import { Ripple } from './Ripple'
import { Icon, type IconName } from './Icon'
import { cn } from '@/lib/cn'

export interface TabItem {
  id: string
  label: string
  icon?: IconName
  badge?: number
}

export interface TabsProps {
  tabs: TabItem[]
  value: string
  onChange: (id: string) => void
  /** Secondary tabs use a short indicator and lighter selected weight. */
  variant?: 'primary' | 'secondary'
  className?: string
}

export function Tabs({ tabs, value, onChange, variant = 'primary', className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn('flex border-b border-outline-variant bg-surface', className)}
    >
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'group relative flex flex-1 items-center justify-center gap-2 overflow-hidden px-4 transition-colors duration-200',
              tab.icon && tab.label ? 'h-16 flex-col gap-0.5' : 'h-12',
              active
                ? variant === 'primary'
                  ? 'text-primary'
                  : 'text-on-surface'
                : 'text-on-surface-variant',
            )}
          >
            <Ripple />
            {tab.icon && <Icon name={tab.icon} size={22} filled={active} className="relative z-10" />}
            <span className="relative z-10 md-title-sm">
              {tab.label}
              {tab.badge !== undefined && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 md-label-sm text-on-error">
                  {tab.badge}
                </span>
              )}
            </span>

            <span
              aria-hidden="true"
              className={cn(
                'absolute bottom-0 h-[3px] rounded-t-full bg-primary transition-all duration-300 ease-[var(--ease-emphasized)]',
                variant === 'primary' ? 'w-14' : 'inset-x-0 w-full',
                active ? 'opacity-100' : 'scale-x-0 opacity-0',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

export interface SegmentedButtonProps {
  options: { value: string; label: string; icon?: IconName; disabled?: boolean }[]
  value: string | string[]
  onChange: (value: string) => void
  /** Allows more than one segment to be active at a time. */
  multiSelect?: boolean
  className?: string
}

export function SegmentedButton({
  options,
  value,
  onChange,
  multiSelect = false,
  className,
}: SegmentedButtonProps) {
  const isActive = (option: string) =>
    Array.isArray(value) ? value.includes(option) : value === option

  return (
    <div
      role={multiSelect ? 'group' : 'radiogroup'}
      className={cn('inline-flex h-10 overflow-hidden rounded-full border border-outline', className)}
    >
      {options.map((option, index) => {
        const active = isActive(option.value)
        return (
          <button
            key={option.value}
            type="button"
            role={multiSelect ? 'checkbox' : 'radio'}
            aria-checked={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'group relative flex items-center justify-center gap-2 overflow-hidden px-4 md-label-lg transition-colors duration-200',
              index > 0 && 'border-l border-outline',
              active
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface',
              option.disabled && 'pointer-events-none text-on-surface/38',
            )}
          >
            <Ripple disabled={option.disabled} />
            {active ? (
              <Icon name="check" size={18} className="relative z-10" />
            ) : (
              option.icon && <Icon name={option.icon} size={18} className="relative z-10" />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
