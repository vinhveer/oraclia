import type { ButtonHTMLAttributes } from 'react'
import { Ripple } from './Ripple'
import { Icon, type IconName } from './Icon'
import { cn } from '@/lib/cn'

export type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined'
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const unselected: Record<IconButtonVariant, string> = {
  standard: 'text-on-surface-variant',
  filled: 'bg-surface-container text-primary',
  tonal: 'bg-secondary-container text-on-secondary-container',
  outlined: 'border border-outline-variant text-on-surface-variant',
}

const selected: Record<IconButtonVariant, string> = {
  standard: 'text-primary',
  filled: 'bg-primary text-on-primary',
  tonal: 'bg-secondary text-on-secondary',
  outlined: 'border border-transparent bg-inverse-surface text-inverse-on-surface',
}

const sizes: Record<IconButtonSize, string> = {
  xs: 'size-8',
  sm: 'size-10',
  md: 'size-14',
  lg: 'size-20',
}

const iconSizes: Record<IconButtonSize, number> = { xs: 18, sm: 22, md: 26, lg: 34 }

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  /** Swapped in while `selected` — e.g. an outline heart becoming a solid one. */
  selectedIcon?: IconName
  variant?: IconButtonVariant
  size?: IconButtonSize
  selected?: boolean
  /** Required: an icon-only control has no accessible name otherwise. */
  label: string
  square?: boolean
}

export function IconButton({
  icon,
  selectedIcon,
  variant = 'standard',
  size = 'sm',
  selected: isSelected = false,
  label,
  square = false,
  className,
  disabled,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const name = isSelected && selectedIcon ? selectedIcon : icon

  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={selectedIcon !== undefined || isSelected ? isSelected : undefined}
      disabled={disabled}
      className={cn(
        'group relative isolate inline-flex items-center justify-center overflow-hidden',
        'transition-[border-radius,background-color,color,transform] duration-200 ease-[var(--ease-spatial)]',
        'active:scale-[0.94]',
        square ? 'rounded-lg active:rounded-xl' : 'rounded-full active:rounded-lg',
        sizes[size],
        isSelected ? selected[variant] : unselected[variant],
        disabled && 'pointer-events-none border-transparent bg-transparent text-on-surface/38',
        className,
      )}
      {...rest}
    >
      <Ripple disabled={disabled} />
      <Icon name={name} size={iconSizes[size]} filled={isSelected} className="relative z-10" />
    </button>
  )
}
