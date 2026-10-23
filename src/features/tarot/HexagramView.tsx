import { Badge, Group, Text } from '@mantine/core'
import type { Casting, Hexagram } from '@db'
import classes from './Tarot.module.css'

/**
 * Vẽ quẻ theo lối truyền thống: hào 1 dưới cùng, hào 6 trên cùng. Hào được vạch
 * lần lượt từ dưới lên, đúng thứ tự gieo.
 */
function Lines({ lines, moving = [] }: { lines: string; moving?: number[] }) {
  return (
    <div className={classes.lines}>
      {lines.split('').map((value, index) => {
        const position = index + 1
        const isMoving = moving.includes(position)
        return (
          <div
            key={position}
            className={classes.line}
            data-moving={isMoving || undefined}
            style={{ animationDelay: `${index * 90}ms` }}
            title={`Hào ${position}${isMoving ? ' (động)' : ''}`}
          >
            {value === '1' ? <span /> : (
              <>
                <span />
                <span />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function HexagramCard({
  hexagram,
  moving,
  caption,
}: {
  hexagram: Hexagram
  moving?: number[]
  caption: string
}) {
  return (
    <div className={classes.hexagramCard}>
      <Text size="xs" c="dimmed">
        {caption}
      </Text>
      <Lines lines={hexagram.lines} moving={moving} />
      <div>
        <Text size="sm" fw={600} ta="center">
          {hexagram.number}. {hexagram.name}
        </Text>
        <Text size="xs" c="dimmed" ta="center">
          {hexagram.full_name}
        </Text>
      </div>
    </div>
  )
}

export function HexagramView({ casting }: { casting: Casting }) {
  return (
    <section className={classes.hexagram}>
      <HexagramCard hexagram={casting.primary} moving={casting.movingLines} caption="Quẻ chính" />
      {casting.changed && <HexagramCard hexagram={casting.changed} caption="Quẻ biến" />}
      <div className={classes.hexagramText}>
        <Group gap={6}>
          {casting.primary.keywords.map((keyword) => (
            <Badge key={keyword} variant="light" radius="sm" tt="none" fw={500}>
              {keyword}
            </Badge>
          ))}
        </Group>
        <Text mt={10}>{casting.primary.meaning}</Text>
        <Text size="sm" c="dimmed" mt={6}>
          {casting.movingLines.length
            ? `Hào động: ${casting.movingLines.join(', ')} · vạch màu là hào đang biến.`
            : 'Không có hào động: quẻ tĩnh, không có quẻ biến.'}
        </Text>
      </div>
    </section>
  )
}
