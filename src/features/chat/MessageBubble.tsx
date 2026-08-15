import { Markdown } from '@/lib/markdown'
import { RevealedCards } from '../tarot/RevealedCards'
import { CardFigure } from '../tarot/CardFigure'
import { HexagramView } from '../tarot/HexagramView'
import { UserMessage } from './UserMessage'
import type { Message } from '@db'

const HAS_SLOT = /\[\[card:\d+\]\]/

export function MessageBubble({
  message,
  streaming = false,
  busy = false,
  onRetry,
  onEdit,
}: {
  message: Message
  streaming?: boolean
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
  // Khi Oraclia kể lần lượt từng lá, hình nằm xen giữa bài đọc nên không cần
  // lưới lá ở trên nữa. Nếu model quên đặt mã thì vẫn rơi về lưới như cũ.
  // Trong lúc stream, mã chỉ vừa gõ ra một nửa nên chưa khớp regex; nếu lúc đó
  // hiện lưới thì nó sẽ biến mất ngay sau đó. Đang stream thì luôn chờ mã.
  const inlineCards = cards.length > 0 && (streaming || HAS_SLOT.test(message.content))

  return (
    <article className="flex max-w-3xl flex-col">
      {cards.length > 0 && !inlineCards && <RevealedCards cards={cards} />}
      {message.hexagram ? <HexagramView casting={message.hexagram} /> : null}
      {message.content && (
        <div className={(cards.length && !inlineCards) || message.hexagram ? 'mt-5' : ''}>
          <Markdown
            text={message.content}
            slots={
              inlineCards
                ? (index) => (cards[index] ? <CardFigure card={cards[index]} /> : null)
                : undefined
            }
          />
        </div>
      )}
    </article>
  )
}
