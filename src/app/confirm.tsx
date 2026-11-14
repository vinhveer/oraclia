import { useCallback, useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'

export interface ConfirmOptions {
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
}

/**
 * Hộp xác nhận cho việc không hoàn tác được (xoá, quên). Trả về phần tử cần
 * render và hàm mở hộp.
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [open, setOpen] = useState(false)

  const ask = useCallback((next: ConfirmOptions) => {
    setOptions(next)
    setOpen(true)
  }, [])

  const element = options ? (
    <AlertDialog
      isOpen={open}
      onOpenChange={setOpen}
      title={options.title}
      description={options.description}
      actionLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel ?? 'Giữ lại'}
      onAction={() => {
        setOpen(false)
        options.onConfirm()
      }}
    />
  ) : null

  return [element, ask] as const
}
