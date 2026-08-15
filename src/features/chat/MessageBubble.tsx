import { Markdown } from '@/lib/markdown'
import { RevealedCards } from '../tarot/RevealedCards'
import { CardFigure } from '../tarot/CardFigure'
import { HexagramView } from '../tarot/HexagramView'
import { ActivityTrace } from './ActivityTrace'
import { UserMessage } from './UserMessage'
import type { Activity } from './activity'
import type { Message } from '@db'

const SLOT = /\[\[card:(\d+)\]\]/g

/** Lá nào đã được kể tới trong bài đọc — đọc thẳng từ nội dung, không đoán. */
function toldCards(content: string): Set<number> {
  const told = new Set<number>()
  for (const match of content.matchAll(SLOT)) told.add(Number(match[1]) - 1)
  return told
}

export function MessageBubble({
  message,
  activities = [],
  busy = false,
  onRetry,
  onEdit,
}: {
  message: Message
  /** Chỉ tin nhắn đang chạy mới có; các tin đã lưu thì rỗng. */
  activities?: Activity[]
  busy?: boolean
  onRetry?: (message: Message) => void
  onEdit?: (message: Message, next: string) => void
}) {
  if (message.role === 'user') {
    return (
      <UserMessage
        message={message}
        disabled={busy || !onRetry}
        onRetry={() => onRetry?.(message)}
        onEdit={(next) => onEdit?.(message, next)}
      />
    )
  }

  const cards = message.cards ?? []
  const told = toldCards(message.content)
  // Lưới chứa những lá chưa tới lượt kể, nên nó vơi dần khi Oraclia đi qua từng
  // lá. Bài vừa lật là thấy ngay, và không còn trạng thái nào phải đoán: cùng
  // một nội dung luôn cho ra cùng một cách hiển thị.
  const pending = cards.filter((_, index) => !told.has(index))

  return (
    <article className="flex max-w-3xl flex-col">
      {pending.length > 0 && <RevealedCards cards={pending} />}
      {message.hexagram ? <HexagramView casting={message.hexagram} /> : null}

      <ActivityTrace activities={activities} />

      {message.content && (
        <div className={pending.length || message.hexagram || activities.length ? 'mt-5' : ''}>
          <Markdown
            text={message.content}
            slots={(index) => (cards[index] ? <CardFigure card={cards[index]} /> : null)}
          />
        </div>
      )}
    </article>
  )
}
