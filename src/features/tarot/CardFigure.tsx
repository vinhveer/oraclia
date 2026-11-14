import { Text } from '@astryxdesign/core/Text'
import type { DrawnCard } from '@db'
import { CardImage } from './CardImage'
import { Keywords } from './Keywords'
import { deckStyle, orientationLabel } from './decks'
import classes from './Tarot.module.css'

/**
 * Một lá đứng riêng giữa dòng diễn giải, dùng khi Oraclia kể lần lượt từng lá.
 * To hơn ô trong lưới vì lúc này nó là trung tâm của đoạn đang đọc.
 */
export function CardFigure({ card }: { card: DrawnCard }) {
  const deck = deckStyle(card.deck)
  return (
    <figure className={classes.figure}>
      <CardImage card={card} width={88} reveal />
      <figcaption className={classes.figureCaption}>
        <Text type="supporting" display="block">
          {card.position}
        </Text>
        <Text type="large" weight="semibold" display="block">
          {card.name_vi}
        </Text>
        <Text type="supporting" display="block">
          {deck.hasOrientation
            ? `${card.name} · ${orientationLabel(card.orientation).toLowerCase()}`
            : `Bộ ${deck.label}`}
        </Text>
        <Keywords keywords={card.keywords} />
      </figcaption>
    </figure>
  )
}
