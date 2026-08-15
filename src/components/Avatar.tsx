import { Icon, type IconName } from './Icon'
import { cn } from '@/lib/cn'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg'

const sizes: Record<AvatarSize, string> = {
  xs: 'size-6 text-[10px]',
  sm: 'size-10 md-label-lg',
  md: 'size-14 md-title-md',
  lg: 'size-20 md-headline-sm',
}

const tones = [
  'bg-primary-container text-on-primary-container',
  'bg-secondary-container text-on-secondary-container',
  'bg-tertiary-container text-on-tertiary-container',
] as const

export interface AvatarProps {
  src?: string
  /** Falls back to initials derived from this when there is no `src`. */
  name?: string
  icon?: IconName
  size?: AvatarSize
  className?: string
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({ src, name, icon, size = 'sm', className }: AvatarProps) {
  // Deterministic tone so the same person keeps the same colour between renders.
  const tone = tones[(name?.charCodeAt(0) ?? 0) % tones.length]

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        sizes[size],
        !src && tone,
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name ?? ''} className="size-full object-cover" />
      ) : icon ? (
        <Icon name={icon} size={size === 'lg' ? 32 : size === 'md' ? 26 : 20} />
      ) : (
        name && initials(name)
      )}
    </span>
  )
}
