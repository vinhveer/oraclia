import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { ClickableCard } from '@astryxdesign/core/ClickableCard'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Icon } from '@astryxdesign/core/Icon'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { IconArrowsShuffle, IconCards, IconRotateClockwise2 } from '@tabler/icons-react'
import { asset, webp } from '@/lib/asset'
import { useMediaQuery } from '@/lib/hooks'
import type { PendingDraw } from '../chat/store'
import { deckStyle } from './decks'
import classes from './Tarot.module.css'

/**
 * Cả bộ bài, úp mặt. Server đã chốt lá nào nằm ở ô nào và chiều nào từ lúc xáo,
 * nên thứ người dùng chọn ở đây là lựa chọn thật, không phải nhờ server bịa ra
 * một kết quả sau đó.
 */
export function CardPicker({
  draw,
  opened,
  onConfirm,
  onClose,
}: {
  draw: PendingDraw
  opened: boolean
  onConfirm: (indices: number[]) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<number[]>([])
  const mobile = useMediaQuery('(max-width: 48em)')
  const deck = deckStyle(draw.deck)
  const remaining = draw.pickCount - selected.length
  const ready = remaining === 0

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

  const close = (open: boolean) => {
    if (!open) onClose()
  }

  return (
    <Dialog
      isOpen={opened}
      onOpenChange={close}
      variant={mobile ? 'fullscreen' : 'standard'}
      width={1024}
      maxHeight="90dvh"
      purpose="form"
    >
      <Layout
        height="fill"
        header={
          <DialogHeader title={`Chọn ${draw.pickCount} lá từ bộ ${deck.label}`} onOpenChange={close} />
        }
        content={
          <LayoutContent>
            {draw.reason && (
              <Text type="supporting" display="block" className={classes.pickerReason}>
                {draw.reason}
              </Text>
            )}

            <ol className={classes.slots}>
              {draw.positions.map((position, slot) => (
                <li
                  key={`${position}-${slot}`}
                  className={classes.slot}
                  data-filled={slot < selected.length || undefined}
                >
                  <span className={classes.slotNumber}>{slot + 1}</span>
                  {position}
                </li>
              ))}
            </ol>

            <div className={classes.deck} style={{ ['--card-ratio' as string]: `${deck.width} / ${deck.height}` }}>
              {Array.from({ length: draw.deckSize }, (_, index) => {
                const order = selected.indexOf(index)
                const picked = order !== -1
                return (
                  <button
                    type="button"
                    key={index}
                    className={classes.back}
                    onClick={() => toggle(index)}
                    disabled={!picked && ready}
                    data-picked={picked || undefined}
                    aria-pressed={picked}
                    aria-label={`Lá thứ ${index + 1}`}
                  >
                    <picture>
                      <source srcSet={webp(deck.back)} type="image/webp" />
                      <img src={asset(deck.back)} alt="" draggable={false} loading="lazy" decoding="async" />
                    </picture>
                    {picked && <span className={classes.backOrder}>{order + 1}</span>}
                  </button>
                )
              })}
            </div>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <div className={classes.pickerFooter}>
              <Text type="supporting">{ready ? 'Đã đủ số lá.' : `Còn ${remaining} lá nữa.`}</Text>
              <div className={classes.pickerActions}>
                <Button
                  label="Chọn giúp tôi"
                  variant="ghost"
                  icon={<Icon icon={IconArrowsShuffle} />}
                  onClick={pickForMe}
                  isDisabled={ready}
                />
                <Button
                  label="Chọn lại"
                  icon={<Icon icon={IconRotateClockwise2} />}
                  onClick={() => setSelected([])}
                  isDisabled={!selected.length}
                />
                <div className={classes.pickerConfirm}>
                  <Button
                    label="Lật bài"
                    variant="primary"
                    width="100%"
                    icon={<Icon icon={IconCards} />}
                    onClick={() => onConfirm(selected)}
                    isDisabled={!ready}
                  />
                </div>
              </div>
            </div>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}

export function DrawPrompt({ draw, onOpen }: { draw: PendingDraw; onOpen: () => void }) {
  const text = `Oraclia đã xáo bộ ${deckStyle(draw.deck).label}. Chọn ${draw.pickCount} lá để tiếp tục.`
  return (
    <ClickableCard label={text} onClick={onOpen} variant="muted" padding={3}>
      <span className={classes.drawPrompt}>
        <Icon icon={IconCards} color="accent" />
        <Text>{text}</Text>
      </span>
    </ClickableCard>
  )
}
