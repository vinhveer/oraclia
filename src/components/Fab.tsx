import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Ripple } from './Ripple'
import { Icon, type IconName } from './Icon'
import { cn } from '@/lib/cn'

export type FabColor = 'primary' | 'secondary' | 'tertiary' | 'surface'
export type FabSize = 'sm' | 'md' | 'lg'

const colors: Record<FabColor, string> = {
  primary: 'bg-primary-container text-on-primary-container',
  secondary: 'bg-secondary-container text-on-secondary-container',
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
  surface: 'bg-surface-high text-primary',
}

const sizes: Record<FabSize, string> = {
  sm: 'size-10 rounded-md',
  md: 'size-14 rounded-lg',
  lg: 'size-24 rounded-[28px]',
}

const iconSizes: Record<FabSize, number> = { sm: 22, md: 24, lg: 36 }

export interface FabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  color?: FabColor
  size?: FabSize
  label: string
  /** Extended FAB: shows the label beside the icon. */
  extended?: boolean
  children?: ReactNode
}

export function Fab({
  icon,
  color = 'primary',
  size = 'md',
  label,
  extended = false,
  className,
  disabled,
  type = 'button',
  ...rest
}: FabProps) {
  return (
    <button
      type={type}
      aria-label={label}
      disabled={disabled}
      className={cn(
        'group relative isolate inline-flex items-center justify-center gap-3 overflow-hidden shadow-e3',
        'transition-[border-radius,box-shadow,transform] duration-250 ease-[var(--ease-spatial)]',
        'hover:shadow-e4 active:scale-[0.96]',
        extended
          ? cn('h-14 rounded-lg px-5', size === 'lg' && 'h-24 rounded-[28px] px-8 text-[24px]')
          : sizes[size],
        colors[color],
        disabled && 'pointer-events-none bg-on-surface/12 text-on-surface/38 shadow-none',
        className,
      )}
      {...rest}
    >
      <Ripple disabled={disabled} />
      <Icon name={icon} size={iconSizes[size]} className="relative z-10" />
      {extended && <span className="relative z-10 md-label-lg text-[length:inherit]">{label}</span>}
    </button>
  )
}
