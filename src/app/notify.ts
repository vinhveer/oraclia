import type { ReactNode } from 'react'
import type { ShowToastFn } from '@astryxdesign/core/Toast'

export interface NotifyOptions {
  message: ReactNode
  /** 'red' là lỗi: đọc ngay bằng role="alert" và ở lại tới khi đóng. */
  color?: 'red'
  /** Nút đi kèm, ví dụ Hoàn tác. */
  action?: ReactNode
  /** Mili giây trước khi tự ẩn; mặc định của Astryx là 5 giây. */
  autoClose?: number
}

let show: ShowToastFn | null = null
const queued: { options: NotifyOptions; handle: { dismiss: () => void } }[] = []

/**
 * Hiện một thông báo (Toast của Astryx) từ bất kỳ đâu — cả từ mutation của
 * react-query, nằm ngoài cây React. Trả về hàm đóng thông báo.
 */
export function notify(options: NotifyOptions): () => void {
  const handle = { dismiss: () => {} }
  if (show) handle.dismiss = present(show, options)
  else queued.push({ options, handle })
  return () => handle.dismiss()
}

function present(showToast: ShowToastFn, options: NotifyOptions) {
  return showToast({
    body: options.message,
    type: options.color === 'red' ? 'error' : 'info',
    endContent: options.action,
    ...(options.autoClose ? { autoHideDuration: options.autoClose } : {}),
  })
}

/** Notifications gắn hàm hiện toast thật vào đây khi đã mount. */
export function connectToasts(showToast: ShowToastFn) {
  show = showToast
  for (const item of queued.splice(0)) item.handle.dismiss = present(showToast, item.options)
  return () => {
    if (show === showToast) show = null
  }
}
