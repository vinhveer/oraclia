import { Badge, Group, Text } from '@mantine/core'
import type { DrawnCard } from '@db'
import { CardImage } from './CardImage'
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
        <Text size="sm" c="dimmed">
          {card.position}
        </Text>
        <Text fw={600} size="lg" lh={1.35}>
          {card.name_vi}
        </Text>
        <Text size="sm" c="dimmed">
          {deck.hasOrientation
            ? `${card.name} · ${orientationLabel(card.orientation).toLowerCase()}`
            : `Bộ ${deck.label}`}
        </Text>
        {card.keywords.length > 0 && (
          <Group gap={6} mt={8}>
            {card.keywords.map((keyword) => (
              <Badge key={keyword} variant="light" radius="sm" tt="none" fw={500}>
                {keyword}
              </Badge>
            ))}
          </Group>
        )}
      </figcaption>
    </figure>
  )
}
