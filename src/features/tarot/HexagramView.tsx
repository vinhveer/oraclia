import { cn } from '@/lib/cn'
import type { Casting, Hexagram } from '@db'

/**
 * Vẽ quẻ theo lối truyền thống: hào 1 dưới cùng, hào 6 trên cùng — nên mảng
 * `lines` phải được đảo lại khi render.
 */
function Lines({
  lines,
  moving = [],
  className,
}: {
  lines: string
  moving?: number[]
  className?: string
}) {
  const rows = lines.split('').map((value, index) => ({ value, position: index + 1 }))
  return (
    // flex-col-reverse: phần tử đầu trong DOM là hào 1 nhưng hiển thị dưới cùng,
    // nên nth-child(1) chính là hào vào trước — đúng thứ tự vạch quẻ từ dưới lên.
    <div className={cn('md-hexagram flex w-24 flex-col-reverse gap-1.5', className)}>
      {rows.map(({ value, position }) => {
        const isMoving = moving.includes(position)
        return (
          <div
            key={position}
            className="flex h-2.5 items-stretch gap-1.5"
            title={`Hào ${position}${isMoving ? ' (động)' : ''}`}
          >
            {value === '1' ? (
              <span
                className={cn(
                  'flex-1 rounded-xs',
                  isMoving ? 'bg-tertiary' : 'bg-on-surface',
                )}
              />
            ) : (
              <>
                <span className={cn('flex-1 rounded-xs', isMoving ? 'bg-tertiary' : 'bg-on-surface')} />
                <span className={cn('flex-1 rounded-xs', isMoving ? 'bg-tertiary' : 'bg-on-surface')} />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function HexagramCard({
  hexagram,
  lines,
  moving,
  caption,
}: {
  hexagram: Hexagram
  lines: string
  moving?: number[]
  caption: string
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-outline-variant bg-surface-low p-4">
      <span className="md-label-sm text-on-surface-variant">{caption}</span>
      <Lines lines={lines} moving={moving} />
      <div className="text-center">
        <p className="md-title-sm text-on-surface">
          {hexagram.number}. {hexagram.name}
        </p>
        <p className="md-body-sm text-on-surface-variant">{hexagram.full_name}</p>
      </div>
    </div>
  )
}

export function HexagramView({ casting }: { casting: Casting }) {
  const changedLines = casting.changed?.lines ?? casting.primary.lines
  return (
    <section className="md-slide-up mt-4 rounded-xl border border-outline-variant p-4">
      <div className="flex flex-wrap items-start gap-4">
        <HexagramCard
          hexagram={casting.primary}
          lines={casting.primary.lines}
          moving={casting.movingLines}
          caption="Quẻ chính"
        />
        {casting.changed && (
          <HexagramCard
            hexagram={casting.changed}
            lines={changedLines}
            caption="Quẻ biến"
          />
        )}

        <div className="min-w-48 flex-1">
          <div className="flex flex-wrap gap-2">
            {casting.primary.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-secondary-container px-3 py-1 md-label-md text-on-secondary-container"
              >
                {keyword}
              </span>
            ))}
          </div>
          <p className="mt-3 md-body-md text-on-surface">{casting.primary.meaning}</p>
          <p className="mt-2 md-body-sm text-on-surface-variant">
            {casting.movingLines.length
              ? `Hào động: ${casting.movingLines.join(', ')} · vạch màu là hào đang biến.`
              : 'Không có hào động — quẻ tĩnh, không có quẻ biến.'}
          </p>
        </div>
      </div>
    </section>
  )
}
