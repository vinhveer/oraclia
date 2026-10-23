import { useState } from 'react'
import { Badge, Group, Modal, Stack, Text, UnstyledButton } from '@mantine/core'
import type { DrawnCard } from '@db'
import { CardImage } from './CardImage'
import { deckStyle, orientationLabel } from './decks'
import classes from './Tarot.module.css'

/**
 * Các lá vừa lật nhưng bài đọc chưa kể tới. Hàng này vơi dần khi Oraclia đi qua
 * từng lá, vì lá đã kể thì nằm ngay trong dòng chữ.
 */
export function RevealedCards({ cards }: { cards: DrawnCard[] }) {
  const [active, setActive] = useState<DrawnCard | null>(null)

  return (
    <>
      <div className={classes.revealed}>
        {cards.map((card, index) => {
          const deck = deckStyle(card.deck)
          return (
            <UnstyledButton
              key={`${card.position}-${card.id}`}
              className={classes.revealedItem}
              onClick={() => setActive(card)}
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <CardImage card={card} width={96} reveal />
              <Text size="sm" fw={600} mt={6} lineClamp={1}>
                {card.name_vi}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {deck.hasOrientation
                  ? `${orientationLabel(card.orientation)} · ${card.position}`
                  : card.position}
              </Text>
            </UnstyledButton>
          )
        })}
      </div>

      <Modal
        opened={active !== null}
        onClose={() => setActive(null)}
        title={active ? `${active.name_vi} · ${active.name}` : ''}
        size="md"
      >
        {active && (
          <Group align="flex-start" wrap="nowrap" gap="md">
            <CardImage card={active} width={112} />
            <Stack gap={8}>
              <Text size="sm" c="dimmed">
                {active.position}
                {deckStyle(active.deck).hasOrientation &&
                  ` · lá ${orientationLabel(active.orientation).toLowerCase()}`}
              </Text>
              <Group gap={6}>
                {active.keywords.map((keyword) => (
                  <Badge key={keyword} variant="light" radius="sm" tt="none" fw={500}>
                    {keyword}
                  </Badge>
                ))}
              </Group>
              <Text>{active.meaning}</Text>
            </Stack>
          </Group>
        )}
      </Modal>
    </>
  )
}
