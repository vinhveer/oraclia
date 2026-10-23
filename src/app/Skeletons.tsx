import { Skeleton } from '@mantine/core'
import classes from './Skeletons.module.css'

/**
 * Khung xương đúng hình của thứ sắp hiện: người dùng thấy bố cục ngay, nội dung
 * về là lấp vào đúng chỗ, không có cú nhảy từ vòng xoay giữa màn hình sang trang.
 */
export function MessagesSkeleton() {
  return (
    <div className={classes.messages} role="status" aria-busy="true" aria-label="Đang tải cuộc trò chuyện">
      <Skeleton className={classes.question} height={44} radius="lg" />
      <div className={classes.answer}>
        <Skeleton height={14} width="38%" radius="sm" />
        <Skeleton height={14} radius="sm" />
        <Skeleton height={14} radius="sm" />
        <Skeleton height={14} width="72%" radius="sm" />
      </div>
      <Skeleton className={classes.question} height={44} width="46%" radius="lg" />
      <div className={classes.answer}>
        <div className={classes.cards}>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} width={96} height={168} radius="md" />
          ))}
        </div>
        <Skeleton height={14} radius="sm" />
        <Skeleton height={14} width="85%" radius="sm" />
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
        <Skeleton height={54} radius="lg" />
      </div>
    </div>
  )
}

export function SettingsSkeleton() {
  return (
    <div className={classes.settings} role="status" aria-busy="true" aria-label="Đang tải">
      <Skeleton height={28} width={28} radius="sm" />
      <Skeleton height={30} width="60%" radius="sm" mt={4} />
      <Skeleton height={16} width="80%" radius="sm" />
      <Skeleton height={140} radius="md" mt="md" />
      <Skeleton height={56} radius="md" />
      <Skeleton height={56} radius="md" />
    </div>
  )
}

/** Một danh sách hàng chờ tải (trí nhớ, passkey, bản tóm tắt). */
export function RowsSkeleton({ rows = 3, height = 56 }: { rows?: number; height?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={height} radius="md" />
      ))}
    </>
  )
}
