import { useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Icon, type IconName } from './Icon'
import { cn } from '@/lib/cn'

export type TextFieldVariant = 'filled' | 'outlined'

interface CommonProps {
  label: string
  variant?: TextFieldVariant
  supportingText?: string
  errorText?: string
  leadingIcon?: IconName
  trailingIcon?: IconName
  onTrailingIconClick?: () => void
  className?: string
  /** Renders a multiline field. */
  multiline?: boolean
  rows?: number
}

export type TextFieldProps = CommonProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, keyof CommonProps> &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof CommonProps | 'value' | 'onChange'>

/**
 * The outlined variant draws its border with a `fieldset` so the floating
 * label sits in a real gap in the stroke rather than a coloured chip painted
 * over it — that way the field works on any background.
 */
export function TextField({
  label,
  variant = 'outlined',
  supportingText,
  errorText,
  leadingIcon,
  trailingIcon,
  onTrailingIconClick,
  className,
  multiline = false,
  rows = 3,
  id,
  disabled,
  value,
  placeholder,
  ...rest
}: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [focused, setFocused] = useState(false)

  const outlined = variant === 'outlined'
  const hasError = Boolean(errorText)
  // The label lifts once there is content, focus, or a placeholder on show.
  const floating = focused || Boolean(value) || Boolean(placeholder)
  const help = errorText ?? supportingText
  const active = focused || hasError

  const accent = hasError ? 'text-error' : focused ? 'text-primary' : 'text-on-surface-variant'
  const stroke = hasError
    ? 'border-error'
    : focused
      ? 'border-primary'
      : 'border-outline group-hover:border-on-surface'

  // The resting label lines up with the text, which the leading icon shifts.
  const restingLeft = leadingIcon ? 16 + 22 + 12 : 16

  const Field = multiline ? 'textarea' : 'input'

  return (
    <div className={cn('w-full', disabled && 'opacity-38', className)}>
      <div
        className={cn(
          'group relative flex gap-3 px-4',
          multiline ? 'items-start py-4' : 'h-14 items-center',
          !outlined &&
            cn(
              'rounded-t-xs border-b bg-surface-highest hover:bg-surface-high',
              hasError ? 'border-error' : focused ? 'border-primary' : 'border-on-surface-variant',
              active && 'border-b-2',
            ),
        )}
      >
        {outlined && (
          <fieldset
            aria-hidden="true"
            className={cn(
              // A fieldset hangs its border line at the legend's vertical centre,
              // so an `inset-0` box would draw the stroke half a legend lower
              // than the row and leave the text looking too high. Lift the box
              // by half the legend (h-4) to put the stroke back on the row.
              'pointer-events-none absolute inset-x-0 -top-2 bottom-0 m-0 rounded-xs px-3 py-0 transition-colors duration-200',
              active ? 'border-2' : 'border',
              stroke,
            )}
          >
            {/* Invisible, but its box is what cuts the gap in the border. */}
            <legend
              className={cn(
                'invisible h-4 max-w-0 overflow-hidden whitespace-nowrap p-0 md-body-sm transition-[max-width,padding] duration-200 ease-[var(--ease-standard)]',
                floating && 'max-w-full px-1',
              )}
            >
              {label}
            </legend>
          </fieldset>
        )}

        {leadingIcon && (
          <Icon
            name={leadingIcon}
            size={22}
            className={cn('relative z-10 shrink-0', accent, multiline && 'mt-0.5')}
          />
        )}

        <label
          htmlFor={inputId}
          className={cn(
            'pointer-events-none absolute z-10 origin-left transition-all duration-200 ease-[var(--ease-standard)]',
            accent,
            floating
              ? outlined
                ? '-top-2 md-body-sm'
                : 'top-1.5 md-body-sm'
              : multiline
                ? 'top-4 md-body-lg'
                : 'top-1/2 -translate-y-1/2 md-body-lg',
          )}
          style={{ left: floating && outlined ? 16 : restingLeft }}
        >
          {label}
        </label>

        <Field
          id={inputId}
          rows={multiline ? rows : undefined}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={help ? `${inputId}-help` : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            'relative z-10 w-full flex-1 bg-transparent text-on-surface outline-none md-body-lg',
            'placeholder:text-on-surface-variant/70 disabled:cursor-not-allowed',
            multiline ? 'resize-y' : 'h-full',
            !outlined && (multiline ? 'mt-2' : 'pt-5 pb-1'),
          )}
          {...(rest as Record<string, unknown>)}
        />

        {trailingIcon &&
          (onTrailingIconClick ? (
            <button
              type="button"
              onClick={onTrailingIconClick}
              className={cn('relative z-10 shrink-0 rounded-full p-1 hover:bg-on-surface/8', accent)}
            >
              <Icon name={trailingIcon} size={22} />
            </button>
          ) : (
            <Icon name={trailingIcon} size={22} className={cn('relative z-10 shrink-0', accent)} />
          ))}
      </div>

      {help && (
        <p
          id={`${inputId}-help`}
          className={cn('mt-1 px-4 md-body-sm', hasError ? 'text-error' : 'text-on-surface-variant')}
        >
          {help}
        </p>
      )}
    </div>
  )
}
