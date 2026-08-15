import { useState } from 'react'
import { Dialog, Icon } from '@/components'
import { cn } from '@/lib/cn'
import type { DrawnCard } from '@db'

export function RevealedCards({ cards }: { cards: DrawnCard[] }) {
  const [active, setActive] = useState<DrawnCard | null>(null)

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-3">
        {cards.map((card) => (
          <button
            key={`${card.position}-${card.id}`}
            type="button"
            onClick={() => setActive(card)}
            className="md-slide-up group w-32 rounded-lg border border-outline-variant bg-surface-low p-2 text-left transition-shadow hover:shadow-e2"
          >
            <img
              src={`/${card.image}`}
              alt={card.name_vi}
              className={cn(
                'aspect-[300/527] w-full rounded-md object-cover',
                card.orientation === 'reversed' && 'rotate-180',
              )}
            />
            <span className="mt-2 block md-label-lg text-on-surface">{card.name_vi}</span>
            <span className="block md-label-sm text-on-surface-variant">
              {card.orientation === 'reversed' ? 'Ngược' : 'Xuôi'} · {card.position}
            </span>
          </button>
        ))}
      </div>

      <Dialog
        open={active !== null}
        onClose={() => setActive(null)}
        headline={active ? `${active.name_vi} · ${active.name}` : ''}
        icon="sparkle"
      >
        {active && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {active.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-secondary-container px-3 py-1 md-label-md text-on-secondary-container"
                >
                  {keyword}
                </span>
              ))}
            </div>
            <p className="md-body-md text-on-surface-variant">
              <Icon name="star" size={16} className="mr-1 inline align-[-2px]" />
              {active.position} · {active.orientation === 'reversed' ? 'lá ngược' : 'lá xuôi'}
            </p>
            <p className="md-body-lg text-on-surface">{active.meaning}</p>
          </div>
        )}
      </Dialog>
    </>
  )
}
