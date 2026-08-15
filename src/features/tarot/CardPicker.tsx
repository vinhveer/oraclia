import { useEffect, useState } from 'react'
import { Button, Icon, IconButton } from '@/components'
import { asset } from '@/lib/asset'
import { cn } from '@/lib/cn'
import { deckStyle } from './decks'
import type { PendingDraw } from '../chat/useChat'

/**
 * The whole deck, face down. The server already fixed each slot's card and
 * orientation, so what the user picks here is a genuine choice, not a request
 * for the server to invent an answer afterwards.
 */
export function CardPicker({
  draw,
  busy,
  onConfirm,
  onClose,
}: {
  draw: PendingDraw
  busy: boolean
  onConfirm: (indices: number[]) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<number[]>([])
  const style = deckStyle(draw.deck)
  const remaining = draw.pickCount - selected.length
  const ready = remaining === 0

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [busy, onClose])

  function toggle(index: number) {
    setSelected((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : current.length < draw.pickCount
          ? [...current, index]
          : current,
    )
  }

  function pickForMe() {
    setSelected((current) => {
      const pool = Array.from({ length: draw.deckSize }, (_, index) => index).filter(
        (index) => !current.includes(index),
      )
      const picks = [...current]
      while (picks.length < draw.pickCount && pool.length) {
        picks.push(...pool.splice(Math.floor(Math.random() * pool.length), 1))
      }
      return picks
    })
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-scrim/40 p-0 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chọn bài"
        className="md-enter-scale flex h-full w-full max-w-5xl flex-col bg-surface sm:h-auto sm:max-h-[88vh] sm:rounded-xl sm:shadow-e3"
      >
        <header className="flex shrink-0 items-start gap-4 border-b border-outline-variant px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="md-title-lg text-on-surface">
            Chọn {draw.pickCount} lá từ bộ {style.label}
          </h2>
            {draw.reason && (
              <p className="mt-1 md-body-md text-on-surface-variant">{draw.reason}</p>
            )}
          </div>
          <IconButton icon="close" label="Đóng" onClick={onClose} disabled={busy} />
        </header>

        <div className="shrink-0 border-b border-outline-variant px-5 py-3">
          <ol className="flex flex-wrap gap-2">
            {draw.positions.map((position, slot) => (
              <li
                key={`${position}-${slot}`}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 md-label-md transition-colors',
                  slot < selected.length
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'border border-dashed border-outline-variant text-on-surface-variant',
                )}
              >
                <span
                  className={cn(
                    'grid size-4 shrink-0 place-items-center rounded-full md-label-sm',
                    slot < selected.length
                      ? 'bg-primary text-on-primary'
                      : 'border border-outline-variant',
                  )}
                >
                  {slot + 1}
                </span>
                {position}
              </li>
            ))}
          </ol>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-13">
            {Array.from({ length: draw.deckSize }, (_, index) => {
              const order = selected.indexOf(index)
              const picked = order !== -1
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggle(index)}
                  disabled={busy || (!picked && ready)}
                  aria-pressed={picked}
                  aria-label={`Lá thứ ${index + 1}`}
                  className={cn(
                    'relative overflow-hidden rounded-md transition-all duration-200',
                    style.aspect,
                    picked
                      ? '-translate-y-1 ring-2 ring-primary shadow-e2'
                      : 'ring-1 ring-outline-variant hover:-translate-y-0.5 hover:ring-outline',
                    !picked && ready && 'opacity-40',
                    busy && 'cursor-not-allowed',
                  )}
                >
                  <img
                    src={asset(style.back)}
                    alt=""
                    draggable={false}
                    className="size-full object-cover"
                  />
                  {picked && (
                    <span className="absolute inset-x-0 bottom-0 bg-primary py-0.5 text-center md-label-sm text-on-primary">
                      {order + 1}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-outline-variant px-5 py-3">
          <p className="md-body-md text-on-surface-variant">
            {ready ? 'Đã đủ số lá.' : `Còn ${remaining} lá nữa.`}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="text" icon="refresh" onClick={pickForMe} disabled={busy || ready}>
              Chọn giúp tôi
            </Button>
            <Button
              variant="outlined"
              onClick={() => setSelected([])}
              disabled={busy || !selected.length}
            >
              Chọn lại
            </Button>
            <Button icon="sparkle" onClick={() => onConfirm(selected)} disabled={busy || !ready}>
              {busy ? 'Đang lật...' : 'Lật bài'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}

export function DrawPrompt({
  draw,
  onOpen,
}: {
  draw: PendingDraw
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="md-slide-up flex w-full items-center gap-3 rounded-xl border border-primary/40 bg-primary-container/40 px-4 py-3 text-left transition-colors hover:bg-primary-container/70"
    >
      <Icon name="sparkle" className="text-primary" />
      <span className="md-body-lg text-on-surface">
        Oraclia đã xáo bộ {deckStyle(draw.deck).label} — chọn {draw.pickCount} lá để tiếp tục.
      </span>
    </button>
  )
}
