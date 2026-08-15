import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export function Radio({ label, className, id, disabled, checked, ...rest }: RadioProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div className={cn('inline-flex items-center gap-1', disabled && 'opacity-38', className)}>
      <span className="group relative inline-flex size-10 items-center justify-center">
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-0 rounded-full bg-current opacity-0 transition-opacity duration-150',
            !disabled && 'group-hover:opacity-[0.08] group-active:opacity-[0.12]',
            checked ? 'text-primary' : 'text-on-surface',
          )}
        />
        <input
          id={inputId}
          type="radio"
          checked={checked}
          disabled={disabled}
          className="peer absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...rest}
        />
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none relative flex size-5 items-center justify-center rounded-full border-2',
            'transition-colors duration-200 peer-active:scale-90',
            checked ? 'border-primary' : 'border-on-surface-variant',
          )}
        >
          <span
            className={cn(
              'size-2.5 rounded-full bg-primary transition-transform duration-200 ease-[var(--ease-spatial)]',
              checked ? 'scale-100' : 'scale-0',
            )}
          />
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

export interface RadioGroupProps {
  name: string
  value: string
  options: { value: string; label: string; disabled?: boolean }[]
  onChange: (value: string) => void
  className?: string
}

export function RadioGroup({ name, value, options, onChange, className }: RadioGroupProps) {
  return (
    <div role="radiogroup" className={cn('flex flex-col', className)}>
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          label={option.label}
          disabled={option.disabled}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
        />
      ))}
    </div>
  )
}
