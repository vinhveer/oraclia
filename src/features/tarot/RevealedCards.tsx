import { useState } from 'react'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import type { DrawnCard } from '@db'
import { CardImage } from './CardImage'
import { Keywords } from './Keywords'
import { deckStyle, orientationLabel } from './decks'
import classes from './Tarot.module.css'

/**
 * Các lá vừa lật nhưng bài đọc chưa kể tới. Hàng này vơi dần khi Oraclia đi qua
 * từng lá, vì lá đã kể thì nằm ngay trong dòng chữ.
 */
export function RevealedCards({ cards }: { cards: DrawnCard[] }) {
  const [active, setActive] = useState<DrawnCard | null>(null)
  // Giữ lá vừa xem trong lúc hộp đang đóng, để nội dung không biến mất giữa chừng.
  const [shown, setShown] = useState<DrawnCard | null>(null)

  return (
    <>
      <div className={classes.revealed}>
        {cards.map((card, index) => {
          const deck = deckStyle(card.deck)
          return (
            <button
              type="button"
              key={`${card.position}-${card.id}`}
              className={classes.revealedItem}
              onClick={() => {
                setActive(card)
                setShown(card)
              }}
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <CardImage card={card} width={96} reveal />
              <Text type="label" weight="semibold" maxLines={1} hasTruncateTooltip={false}>
                {card.name_vi}
              </Text>
              <Text type="supporting" maxLines={1} hasTruncateTooltip={false}>
                {deck.hasOrientation
                  ? `${orientationLabel(card.orientation)} · ${card.position}`
                  : card.position}
              </Text>
            </button>
          )
        })}
      </div>

      {shown && (
        <Dialog isOpen={active !== null} onOpenChange={(open) => !open && setActive(null)} width={480}>
          <Layout
            height="auto"
            header={
              <DialogHeader
                title={`${shown.name_vi} · ${shown.name}`}
                onOpenChange={(open) => !open && setActive(null)}
              />
            }
            content={
              <LayoutContent>
                <div className={classes.cardDetail}>
                  <CardImage card={shown} width={112} />
                  <div className={classes.cardDetailText}>
                    <Text type="supporting" display="block">
                      {shown.position}
                      {deckStyle(shown.deck).hasOrientation &&
                        ` · lá ${orientationLabel(shown.orientation).toLowerCase()}`}
                    </Text>
                    <Keywords keywords={shown.keywords} />
                    <Text display="block">{shown.meaning}</Text>
                  </div>
                </div>
              </LayoutContent>
            }
          />
        </Dialog>
      )}
    </>
  )
}
