import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Ripple } from './Ripple'
import { Icon, type IconName } from './Icon'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'filled' | 'tonal' | 'elevated' | 'outlined' | 'text'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const variants: Record<ButtonVariant, string> = {
  filled: 'bg-primary text-on-primary',
  tonal: 'bg-secondary-container text-on-secondary-container',
  elevated: 'bg-surface-low text-primary shadow-e1 hover:shadow-e2',
  outlined: 'text-primary border border-outline-variant hover:border-outline',
  text: 'text-primary',
}

/**
 * M3 Expressive widened the size range from one height to five, so the kit
 * carries all of them. Radius follows the "full by default, squarer when
 * pressed" shape morph below.
 */
const sizes: Record<ButtonSize, string> = {
  xs: 'h-8 px-3 gap-1 md-label-md',
  sm: 'h-10 px-4 gap-2 md-label-lg',
  md: 'h-14 px-6 gap-2 text-[16px] font-medium',
  lg: 'h-20 px-8 gap-3 text-[24px] font-medium',
  xl: 'h-34 px-12 gap-4 text-[32px] font-medium',
}

const iconSizes: Record<ButtonSize, number> = { xs: 18, sm: 20, md: 24, lg: 32, xl: 40 }

const pressedShape: Record<ButtonSize, string> = {
  xs: 'active:rounded-lg',
  sm: 'active:rounded-lg',
  md: 'active:rounded-lg',
  lg: 'active:rounded-[20px]',
  xl: 'active:rounded-[28px]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
  trailingIcon?: IconName
  /** Renders a squared-off shape instead of the pill default. */
  square?: boolean
  fullWidth?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'filled',
  size = 'sm',
  icon,
  trailingIcon,
  square = false,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'group relative isolate inline-flex select-none items-center justify-center overflow-hidden',
        'transition-[border-radius,box-shadow,background-color,color,transform] duration-200 ease-[var(--ease-spatial)]',
        'active:scale-[0.97]',
        square ? 'rounded-lg active:rounded-xl' : 'rounded-full',
        !square && pressedShape[size],
        sizes[size],
        // Emitting the variant's colours alongside the disabled ones lets
        // Tailwind's own class order decide the winner, which is how a disabled
        // filled button kept its primary background. Only one set is emitted.
        !disabled && variants[variant],
        fullWidth && 'w-full',
        // M3 keeps the container transparent for the two low-emphasis variants.
        disabled &&
          cn(
            'pointer-events-none text-on-surface/38 shadow-none',
            variant === 'outlined'
              ? 'border-on-surface/12'
              : variant === 'text'
                ? 'bg-transparent'
                : 'bg-on-surface/12',
          ),
        className,
      )}
      {...rest}
    >
      <Ripple disabled={disabled} />
      {icon && <Icon name={icon} size={iconSizes[size]} className="relative z-10" />}
      {children && <span className="relative z-10 truncate">{children}</span>}
      {trailingIcon && (
        <Icon name={trailingIcon} size={iconSizes[size]} className="relative z-10" />
      )}
    </button>
  )
}
