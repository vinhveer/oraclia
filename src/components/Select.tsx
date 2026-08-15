import { useId, useRef, useState } from 'react'
import { Icon, type IconName } from './Icon'
import { Ripple } from './Ripple'
import { useDismiss } from '@/hooks/useDismiss'
import { cn } from '@/lib/cn'

export interface SelectOption {
  value: string
  label: string
  icon?: IconName
  disabled?: boolean
}

export interface SelectProps {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  variant?: 'filled' | 'outlined'
  supportingText?: string
  errorText?: string
  disabled?: boolean
  className?: string
}

/** M3 exposed dropdown menu — a text field that opens a menu of options. */
export function Select({
  label,
  value,
  options,
  onChange,
  variant = 'outlined',
  supportingText,
  errorText,
  disabled,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const id = useId()
  useDismiss(root, open, () => setOpen(false))

  const outlined = variant === 'outlined'
  const selected = options.find((option) => option.value === value)
  const hasError = Boolean(errorText)
  const help = errorText ?? supportingText
  const active = open || hasError

  const accent = hasError ? 'text-error' : open ? 'text-primary' : 'text-on-surface-variant'
  const stroke = hasError
    ? 'border-error'
    : open
      ? 'border-primary'
      : 'border-outline group-hover:border-on-surface'

  return (
    <div ref={root} className={cn('relative w-full', disabled && 'opacity-38', className)}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'group relative flex h-14 w-full items-center gap-3 px-4 text-left',
          !outlined &&
            cn(
              'rounded-t-xs border-b bg-surface-highest hover:bg-surface-high',
              hasError ? 'border-error' : open ? 'border-primary' : 'border-on-surface-variant',
              active && 'border-b-2',
            ),
          disabled && 'cursor-not-allowed',
        )}
      >
        {outlined && (
          <fieldset
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0 m-0 rounded-xs px-3 py-0 transition-colors duration-200',
              active ? 'border-2' : 'border',
              stroke,
            )}
          >
            <legend className="invisible h-4 max-w-full overflow-hidden whitespace-nowrap px-1 md-body-sm">
              {label}
            </legend>
          </fieldset>
        )}

        <span
          className={cn(
            'absolute z-10 md-body-sm transition-colors duration-200',
            accent,
            outlined ? '-top-2 left-4' : 'top-1.5 left-4',
          )}
        >
          {label}
        </span>

        <span
          className={cn(
            'relative z-10 flex flex-1 items-center gap-2 truncate md-body-lg text-on-surface',
            !outlined && 'pt-4',
          )}
        >
          {selected?.icon && <Icon name={selected.icon} size={20} />}
          {selected?.label ?? ''}
        </span>

        <Icon
          name="chevronDown"
          size={22}
          className={cn('relative z-10 transition-transform duration-200', accent, open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="md-enter-scale absolute top-[calc(100%+4px)] z-50 max-h-72 w-full origin-top overflow-auto rounded-xs bg-surface-container py-2 shadow-e2"
        >
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={cn(
                  'group relative flex h-12 w-full items-center gap-3 overflow-hidden px-3 text-left md-body-lg',
                  option.value === value
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface',
                  option.disabled && 'pointer-events-none text-on-surface/38',
                )}
              >
                <Ripple disabled={option.disabled} />
                {option.icon && <Icon name={option.icon} size={20} className="relative z-10" />}
                <span className="relative z-10 flex-1 truncate">{option.label}</span>
                {option.value === value && <Icon name="check" size={20} className="relative z-10" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {help && (
        <p className={cn('mt-1 px-4 md-body-sm', hasError ? 'text-error' : 'text-on-surface-variant')}>
          {help}
        </p>
      )}
    </div>
  )
}
