import { Badge } from '@astryxdesign/core/Badge'
import classes from './Tarot.module.css'

/** Từ khoá của lá hay quẻ, một hàng nhãn nhỏ. */
export function Keywords({ keywords }: { keywords: string[] }) {
  if (!keywords.length) return null
  return (
    <div className={classes.keywords}>
      {keywords.map((keyword) => (
        <Badge key={keyword} label={keyword} variant="neutral" />
      ))}
    </div>
  )
}
