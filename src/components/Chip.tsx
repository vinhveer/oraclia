import type { ButtonHTMLAttributes } from 'react'
import { Ripple } from './Ripple'
import { Icon, type IconName } from './Icon'
import { cn } from '@/lib/cn'

export type ChipVariant = 'assist' | 'filter' | 'input' | 'suggestion'

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  variant?: ChipVariant
  icon?: IconName
  avatar?: string
  selected?: boolean
  elevated?: boolean
  /** `input` chips render a trailing remove affordance when this is given. */
  onRemove?: () => void
  label: string
}

export function Chip({
  variant = 'assist',
  icon,
  avatar,
  selected = false,
  elevated = false,
  onRemove,
  label,
  className,
  disabled,
  type = 'button',
  ...rest
}: ChipProps) {
  const selectable = variant === 'filter'
  const showCheck = selectable && selected

  return (
    <div
      className={cn(
        'group relative isolate inline-flex h-8 items-center overflow-hidden rounded-sm',
        'transition-[background-color,border-color,box-shadow,border-radius] duration-200 ease-[var(--ease-standard)]',
        selected
          ? 'bg-secondary-container text-on-secondary-container'
          : 'bg-surface text-on-surface-variant',
        !selected && !elevated && 'border border-outline-variant',
        elevated && 'bg-surface-low shadow-e1 hover:shadow-e2',
        disabled && 'pointer-events-none border-transparent bg-on-surface/12 text-on-surface/38 shadow-none',
        className,
      )}
    >
      <button
        type={type}
        disabled={disabled}
        aria-pressed={selectable ? selected : undefined}
        className="relative z-10 inline-flex h-full items-center gap-2 pr-4 pl-3 md-label-lg"
        {...rest}
      >
        {showCheck ? (
          <Icon name="check" size={18} />
        ) : avatar ? (
          <img src={avatar} alt="" className="-ml-1 size-6 rounded-full object-cover" />
        ) : icon ? (
          <Icon name={icon} size={18} />
        ) : null}
        <span className="truncate">{label}</span>
      </button>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${label}`}
          className="relative z-10 mr-1 inline-flex size-6 items-center justify-center rounded-full hover:bg-current/10"
        >
          <Icon name="close" size={16} />
        </button>
      )}

      <Ripple disabled={disabled} />
    </div>
  )
}
