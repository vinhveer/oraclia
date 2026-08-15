import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  /** Prints the live value beside the label. */
  showValue?: boolean
  /** Draws tick marks at each step. */
  ticks?: boolean
  formatValue?: (value: number) => string
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = false,
  ticks = false,
  formatValue = String,
  className,
  disabled,
  id,
  ...rest
}: SliderProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const percent = ((value - min) / (max - min)) * 100
  const tickCount = ticks ? Math.floor((max - min) / step) + 1 : 0

  return (
    <div className={cn('w-full', disabled && 'opacity-38', className)}>
      {(label || showValue) && (
        <div className="mb-1 flex items-baseline justify-between">
          {label && (
            <label htmlFor={inputId} className="md-label-lg text-on-surface-variant">
              {label}
            </label>
          )}
          {showValue && <span className="md-label-lg text-on-surface">{formatValue(value)}</span>}
        </div>
      )}

      <div className="group relative flex h-10 items-center">
        {/* Active track */}
        <div
          className="pointer-events-none absolute left-0 h-4 rounded-full bg-primary transition-[width] duration-75"
          style={{ width: `calc(${percent}% - ${percent * 0.06}px)` }}
        />
        {/* Inactive track */}
        <div
          className="pointer-events-none absolute right-0 h-4 rounded-full bg-secondary-container"
          style={{ width: `calc(${100 - percent}% - 6px)` }}
        />

        {tickCount > 0 && tickCount <= 24 && (
          <div className="pointer-events-none absolute inset-x-1 flex justify-between">
            {Array.from({ length: tickCount }, (_, index) => (
              <span
                key={index}
                className={cn(
                  'size-1 rounded-full',
                  index / (tickCount - 1) <= percent / 100 ? 'bg-on-primary/60' : 'bg-on-surface-variant/60',
                )}
              />
            ))}
          </div>
        )}

        {/* Handle — M3 Expressive uses a tall pill that narrows while dragging */}
        <div
          className={cn(
            'pointer-events-none absolute h-9 w-1 -translate-x-1/2 rounded-full bg-primary',
            'transition-[width,height] duration-200 ease-[var(--ease-spatial)]',
            'group-active:h-11 group-active:w-0.5',
          )}
          style={{ left: `calc(${percent}% * 0.94 + 3px)` }}
        />

        <input
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="relative z-10 h-10 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none"
          {...rest}
        />
      </div>
    </div>
  )
}
