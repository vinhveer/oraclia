import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

interface Wave {
  id: number
  x: number
  y: number
  size: number
}

export interface RippleProps {
  /**
   * State-layer colour. Defaults to `currentColor`, which is what M3 specifies
   * — the layer tints with the container's own content colour.
   */
  className?: string
  disabled?: boolean
}

let waveId = 0

/**
 * M3 state layer + ripple. Drop inside a `relative group` container; hover /
 * focus / press opacities come from the group, the wave from pointer position.
 * `rounded-[inherit]` keeps it clipped to whatever shape the parent has.
 */
export function Ripple({ className, disabled }: RippleProps) {
  const host = useRef<HTMLSpanElement>(null)
  const [waves, setWaves] = useState<Wave[]>([])

  const clear = useCallback((id: number) => {
    setWaves((prev) => prev.filter((wave) => wave.id !== id))
  }, [])

  // The layer is pointer-transparent so it never eats clicks meant for the
  // control, so presses are observed on the parent instead.
  useEffect(() => {
    const el = host.current
    const parent = el?.parentElement
    if (!el || !parent || disabled) return

    const onPointerDown = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const size = Math.hypot(rect.width, rect.height) * 2
      const id = ++waveId
      setWaves((prev) => [
        ...prev,
        {
          id,
          size,
          x: event.clientX - rect.left - size / 2,
          y: event.clientY - rect.top - size / 2,
        },
      ])
    }

    parent.addEventListener('pointerdown', onPointerDown)
    return () => parent.removeEventListener('pointerdown', onPointerDown)
  }, [disabled])

  return (
    <span
      ref={host}
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]',
        // The state layer itself — opacity values are straight from the M3 spec.
        'before:absolute before:inset-0 before:bg-current before:opacity-0 before:transition-opacity before:duration-150',
        !disabled &&
          'group-hover:before:opacity-[0.08] group-focus-visible:before:opacity-[0.10] group-active:before:opacity-[0.10]',
        className,
      )}
    >
      {waves.map((wave) => (
        <span
          key={wave.id}
          className="md-ripple-wave"
          style={{ left: wave.x, top: wave.y, width: wave.size, height: wave.size }}
          onAnimationEnd={() => clear(wave.id)}
        />
      ))}
    </span>
  )
}
