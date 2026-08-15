import { cn } from '@/lib/cn'
import type { DrawnCard } from '@db'

/**
 * Một lá đứng riêng giữa dòng diễn giải, dùng khi Oraclia kể lần lượt từng lá.
 * To hơn ô trong lưới vì lúc này nó là trung tâm của đoạn đang đọc.
 */
export function CardFigure({ card }: { card: DrawnCard }) {
  return (
    <figure className="md-slide-up my-1 flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-low p-3">
      <img
        src={`/${card.image}`}
        alt={card.name_vi}
        className={cn(
          'w-24 shrink-0 rounded-lg object-cover shadow-e1',
          card.orientation === 'reversed' && 'rotate-180',
        )}
      />
      <figcaption className="min-w-0">
        <p className="md-label-md text-on-surface-variant">{card.position}</p>
        <p className="md-title-md text-on-surface">{card.name_vi}</p>
        <p className="md-body-sm text-on-surface-variant">
          {card.name} · {card.orientation === 'reversed' ? 'lá ngược' : 'lá xuôi'}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {card.keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full bg-secondary-container px-2.5 py-0.5 md-label-sm text-on-secondary-container"
            >
              {keyword}
            </span>
          ))}
        </div>
      </figcaption>
    </figure>
  )
}
