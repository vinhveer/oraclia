import { Skeleton } from '@astryxdesign/core/Skeleton'
import classes from './Skeletons.module.css'

/**
 * Khung xương đúng hình của thứ sắp hiện: người dùng thấy bố cục ngay, nội dung
 * về là lấp vào đúng chỗ, không có cú nhảy từ vòng xoay giữa màn hình sang trang.
 */
export function MessagesSkeleton() {
  return (
    <div className={classes.messages} role="status" aria-busy="true" aria-label="Đang tải cuộc trò chuyện">
      <div className={classes.question}>
        <Skeleton height={44} radius={4} />
      </div>
      <div className={classes.answer}>
        <Skeleton height={14} width="38%" radius={1} index={1} />
        <Skeleton height={14} radius={1} index={2} />
        <Skeleton height={14} radius={1} index={3} />
        <Skeleton height={14} width="72%" radius={1} index={4} />
      </div>
      <div className={classes.question} data-short>
        <Skeleton height={44} radius={4} index={5} />
      </div>
      <div className={classes.answer}>
        <div className={classes.cards}>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} width={96} height={168} radius={3} index={6 + index} />
          ))}
        </div>
        <Skeleton height={14} radius={1} index={9} />
        <Skeleton height={14} width="85%" radius={1} index={10} />
      </div>
    </div>
  )
}

/** Cả màn hình chat trong lúc mã của nó đang tải (route tách chunk). */
export function ChatSkeleton() {
  return (
    <div className={classes.chat}>
      <div className={classes.column}>
        <MessagesSkeleton />
      </div>
      <div className={classes.composer}>
        <Skeleton height={96} radius={4} />
      </div>
    </div>
  )
}

export function SettingsSkeleton() {
  return (
    <div className={classes.settings} role="status" aria-busy="true" aria-label="Đang tải">
      <Skeleton height={28} width={28} radius={2} />
      <Skeleton height={30} width="60%" radius={2} index={1} />
      <Skeleton height={16} width="80%" radius={2} index={2} />
      <div className={classes.gap} />
      <Skeleton height={140} radius={3} index={3} />
      <Skeleton height={56} radius={3} index={4} />
      <Skeleton height={56} radius={3} index={5} />
    </div>
  )
}

/** Một danh sách hàng chờ tải (trí nhớ, passkey, bản tóm tắt). */
export function RowsSkeleton({ rows = 3, height = 56 }: { rows?: number; height?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={height} radius={3} index={index} />
      ))}
    </>
  )
}
