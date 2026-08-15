import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  /** Renders the dash state used for partially-selected parent rows. */
  indeterminate?: boolean
  error?: boolean
}

export function Checkbox({
  label,
  indeterminate = false,
  error = false,
  className,
  id,
  disabled,
  checked,
  ...rest
}: CheckboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const marked = Boolean(checked) || indeterminate

  return (
    <div className={cn('inline-flex items-center gap-1', disabled && 'opacity-38', className)}>
      <span className="group relative inline-flex size-10 items-center justify-center">
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-0 rounded-full bg-current opacity-0 transition-opacity duration-150',
            !disabled && 'group-hover:opacity-[0.08] group-active:opacity-[0.12]',
            marked ? 'text-primary' : 'text-on-surface',
            error && 'text-error',
          )}
        />
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-checked={indeterminate ? 'mixed' : undefined}
          className="peer absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...rest}
        />
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none relative flex size-[18px] items-center justify-center rounded-xs border-2',
            'transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-spatial)]',
            'peer-active:scale-90',
            marked
              ? error
                ? 'border-error bg-error text-on-error'
                : 'border-primary bg-primary text-on-primary'
              : error
                ? 'border-error'
                : 'border-on-surface-variant',
          )}
        >
          {indeterminate ? (
            <svg viewBox="0 0 18 18" className="size-full" fill="none">
              <path d="M4 9h10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          ) : (
            checked && (
              <svg viewBox="0 0 18 18" className="size-full" fill="none">
                <path
                  d="M3.5 9.2l3.6 3.6L14.5 5.4"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )
          )}
        </span>
      </span>
      {label && (
        <label htmlFor={inputId} className="cursor-pointer pr-2 md-body-lg select-none">
          {label}
        </label>
      )}
    </div>
  )
}
