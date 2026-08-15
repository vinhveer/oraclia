import { Fragment, type ReactNode } from 'react'

/**
 * A reading only ever uses headings, paragraphs, lists, blockquotes and inline
 * emphasis, so the app renders that subset itself. It keeps the bundle free of
 * a markdown dependency and lets every block carry M3 type-scale classes.
 */
export function Markdown({
  text,
  slots,
}: {
  text: string
  /** Thay dòng `[[card:N]]` bằng nội dung tương ứng, N đếm từ 1. */
  slots?: (index: number) => ReactNode
}) {
  return <div className="flex flex-col gap-3">{renderBlocks(text, slots)}</div>
}

const SLOT = /^\s*\[\[card:(\d+)\]\]\s*$/

function renderBlocks(text: string, slots?: (index: number) => ReactNode): ReactNode[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let paragraph: string[] = []
  let list: string[] = []
  let quote: string[] = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push(
      <p key={`p-${blocks.length}`} className="md-body-lg text-on-surface">
        {inline(paragraph.join(' '))}
      </p>,
    )
    paragraph = []
  }
  const flushList = () => {
    if (!list.length) return
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="flex list-disc flex-col gap-1 pl-5">
        {list.map((item, index) => (
          <li key={index} className="md-body-lg text-on-surface">
            {inline(item)}
          </li>
        ))}
      </ul>,
    )
    list = []
  }
  const flushQuote = () => {
    if (!quote.length) return
    blocks.push(
      <blockquote
        key={`q-${blocks.length}`}
        className="border-l-4 border-primary/60 bg-surface-low py-2 pl-4 pr-3 md-body-lg text-on-surface-variant italic"
      >
        {inline(quote.join(' '))}
      </blockquote>,
    )
    quote = []
  }
  const flushAll = () => {
    flushParagraph()
    flushList()
    flushQuote()
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    const slot = slots ? line.match(SLOT) : null
    if (slot) {
      flushAll()
      const node = slots?.(Number(slot[1]) - 1)
      if (node) blocks.push(<Fragment key={`slot-${blocks.length}`}>{node}</Fragment>)
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      flushAll()
      const level = heading[1].length
      const size = level <= 2 ? 'md-title-lg' : level === 3 ? 'md-title-md' : 'md-title-sm'
      blocks.push(
        <h3 key={`h-${blocks.length}`} className={`${size} mt-1 font-medium text-on-surface`}>
          {inline(heading[2])}
        </h3>,
      )
      continue
    }
    if (/^\s*([-*•]|\d+\.)\s+/.test(line)) {
      flushParagraph()
      flushQuote()
      list.push(line.replace(/^\s*([-*•]|\d+\.)\s+/, ''))
      continue
    }
    if (/^>\s?/.test(line)) {
      flushParagraph()
      flushList()
      quote.push(line.replace(/^>\s?/, ''))
      continue
    }
    if (!line.trim()) {
      flushAll()
      continue
    }
    flushList()
    flushQuote()
    paragraph.push(line.trim())
  }
  flushAll()
  return blocks
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g

function inline(text: string): ReactNode {
  return text.split(INLINE).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-surface-high px-1.5 py-0.5 font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      )
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}
