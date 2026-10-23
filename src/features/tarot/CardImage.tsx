import { asset } from '@/lib/asset'
import type { DrawnCard } from '@db'
import { deckStyle } from './decks'
import classes from './Tarot.module.css'

/**
 * Mặt lá, đúng tỉ lệ ngay từ đầu (width/height thật) nên không xô layout khi ảnh
 * về muộn — trước đây ảnh tải xong là đẩy bài đọc tụt khỏi đáy màn hình.
 */
export function CardImage({
  card,
  width,
  reveal = false,
}: {
  card: DrawnCard
  width: number
  /** Lật từ mặt sau sang mặt trước khi vừa xuất hiện. */
  reveal?: boolean
}) {
  const deck = deckStyle(card.deck)
  const height = Math.round((width * deck.height) / deck.width)
  const reversed = deck.hasOrientation && card.orientation === 'reversed'
  return (
    <span
      className={classes.cardFrame}
      data-reveal={reveal || undefined}
      style={{ width, height }}
    >
      <img
        className={classes.cardFace}
        src={asset(card.image)}
        alt={card.name_vi}
        width={deck.width}
        height={deck.height}
        loading="lazy"
        decoding="async"
        data-reversed={reversed || undefined}
        draggable={false}
      />
    </span>
  )
}
