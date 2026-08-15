import { useId, type InputHTMLAttributes } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  /** Shows a check / cross inside the handle, per the M3 icon-switch variant. */
  showIcons?: boolean
}

export function Switch({
  label,
  showIcons = false,
  className,
  id,
  checked,
  disabled,
  ...rest
}: SwitchProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <span className="group relative inline-flex">
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          className="peer absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...rest}
        />
        <span
          aria-hidden="true"
          className={cn(
            'flex h-8 w-13 items-center rounded-full border-2 px-0.5 transition-colors duration-200 ease-[var(--ease-standard)]',
            checked
              ? 'border-primary bg-primary'
              : 'border-outline bg-surface-highest',
            disabled && 'border-transparent bg-on-surface/12 opacity-38',
          )}
        >
          <span
            className={cn(
              'flex items-center justify-center rounded-full transition-all duration-250 ease-[var(--ease-spatial)]',
              checked
                ? // The handle grows on press — an M3 Expressive detail.
                  'size-6 translate-x-5 bg-on-primary text-primary group-active:size-7 group-active:translate-x-4'
                : showIcons
                  ? 'size-6 translate-x-0 bg-outline text-surface-highest group-active:size-7'
                  : 'size-4 translate-x-1 bg-outline text-surface-highest group-active:size-7 group-active:translate-x-0',
            )}
          >
            {showIcons && <Icon name={checked ? 'check' : 'close'} size={16} />}
          </span>
        </span>
      </span>
      {label && (
        <label htmlFor={inputId} className={cn('cursor-pointer md-body-lg select-none', disabled && 'opacity-38')}>
          {label}
        </label>
      )}
    </div>
  )
}
