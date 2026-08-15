import { cn } from '@/lib/cn'

export interface LinearProgressProps {
  /** 0–100. Omit for the indeterminate animation. */
  value?: number
  /** M3 Expressive thickens the track and rounds both ends. */
  thick?: boolean
  className?: string
}

export function LinearProgress({ value, thick = false, className }: LinearProgressProps) {
  const indeterminate = value === undefined

  return (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'relative w-full overflow-hidden rounded-full bg-secondary-container',
        thick ? 'h-2' : 'h-1',
        className,
      )}
    >
      {indeterminate ? (
        <div
          className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-primary"
          style={{ animation: 'md-indeterminate-linear 1.6s cubic-bezier(0.2,0,0,1) infinite' }}
        />
      ) : (
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-[var(--ease-emphasized)]"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      )}
    </div>
  )
}

export interface CircularProgressProps {
  value?: number
  size?: number
  strokeWidth?: number
  className?: string
}

export function CircularProgress({
  value,
  size = 48,
  strokeWidth = 4,
  className,
}: CircularProgressProps) {
  const indeterminate = value === undefined
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = indeterminate ? 0 : circumference * (1 - Math.min(100, Math.max(0, value)) / 100)

  return (
    <svg
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn(className)}
      style={
        indeterminate ? { animation: 'md-indeterminate-spin 1.4s linear infinite' } : undefined
      }
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-secondary-container"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="stroke-primary transition-[stroke-dashoffset] duration-300 ease-[var(--ease-emphasized)]"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={
          indeterminate
            ? { animation: 'md-indeterminate-dash 1.4s ease-in-out infinite' }
            : undefined
        }
      />
    </svg>
  )
}
