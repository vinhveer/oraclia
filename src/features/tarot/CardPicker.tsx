import { useState } from 'react'
import { Button, Modal, Text, UnstyledButton } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconArrowsShuffle, IconCards, IconRotateClockwise2 } from '@tabler/icons-react'
import { asset } from '@/lib/asset'
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen={mobile}
      size="64rem"
      radius={mobile ? 0 : 'lg'}
      title={`Chọn ${draw.pickCount} lá từ bộ ${deck.label}`}
      classNames={{ body: classes.pickerBody, content: classes.pickerContent }}
    >
      {draw.reason && (
        <Text size="sm" c="dimmed" mb="sm">
          {draw.reason}
        </Text>
      )}

      <ol className={classes.slots}>
        {draw.positions.map((position, slot) => (
          <li key={`${position}-${slot}`} className={classes.slot} data-filled={slot < selected.length || undefined}>
            <span className={classes.slotNumber}>{slot + 1}</span>
            {position}
          </li>
        ))}
      </ol>

      <div
        className={classes.deck}
        style={{ ['--card-ratio' as string]: `${deck.width} / ${deck.height}` }}
      >
        {Array.from({ length: draw.deckSize }, (_, index) => {
          const order = selected.indexOf(index)
          const picked = order !== -1
          return (
            <UnstyledButton
              key={index}
              className={classes.back}
              onClick={() => toggle(index)}
              disabled={!picked && ready}
              data-picked={picked || undefined}
              aria-pressed={picked}
              aria-label={`Lá thứ ${index + 1}`}
            >
              <img src={asset(deck.back)} alt="" draggable={false} loading="lazy" decoding="async" />
              {picked && <span className={classes.backOrder}>{order + 1}</span>}
            </UnstyledButton>
          )
        })}
      </div>

      <div className={classes.pickerFooter}>
        <Text size="sm" c="dimmed">
          {ready ? 'Đã đủ số lá.' : `Còn ${remaining} lá nữa.`}
        </Text>
        <div className={classes.pickerActions}>
          <Button
            variant="subtle"
            leftSection={<IconArrowsShuffle size={18} />}
            onClick={pickForMe}
            disabled={ready}
          >
            Chọn giúp tôi
          </Button>
          <Button
            variant="default"
            leftSection={<IconRotateClockwise2 size={18} />}
            onClick={() => setSelected([])}
            disabled={!selected.length}
          >
            Chọn lại
          </Button>
          <Button
            className={classes.pickerConfirm}
            leftSection={<IconCards size={18} />}
            onClick={() => onConfirm(selected)}
            disabled={!ready}
          >
            Lật bài
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function DrawPrompt({ draw, onOpen }: { draw: PendingDraw; onOpen: () => void }) {
  return (
    <UnstyledButton className={classes.drawPrompt} onClick={onOpen}>
      <IconCards size={20} className={classes.drawPromptIcon} />
      <Text>
        Oraclia đã xáo bộ {deckStyle(draw.deck).label}. Chọn {draw.pickCount} lá để tiếp tục.
      </Text>
    </UnstyledButton>
  )
}
