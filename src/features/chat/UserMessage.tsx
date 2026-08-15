import { useEffect, useRef, useState } from 'react'
import { Button, IconButton, useSnackbar } from '@/components'
import type { Message } from '@db'

/**
 * Câu hỏi của người dùng, kèm ba thao tác. Trên chuột thì hiện khi rê vào; trên
 * cảm ứng không có hover nên luôn hiện.
 */
export function UserMessage({
  message,
  disabled,
  onRetry,
  onEdit,
}: {
  message: Message
  disabled: boolean
  onRetry: () => void
  onEdit: (next: string) => void
}) {
  const snackbar = useSnackbar()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const field = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) return
    setDraft(message.content)
    const node = field.current
    if (!node) return
    node.focus()
    node.setSelectionRange(node.value.length, node.value.length)
    node.style.height = 'auto'
    node.style.height = `${node.scrollHeight}px`
  }, [editing, message.content])

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content)
      snackbar({ message: 'Đã chép câu hỏi.' })
    } catch {
      snackbar({ message: 'Trình duyệt không cho chép tự động.' })
    }
  }

  if (editing) {
    return (
      <article className="ml-auto w-full max-w-xl">
        <div className="rounded-2xl border border-primary bg-surface-low p-3">
          <textarea
            ref={field}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              event.target.style.height = 'auto'
              event.target.style.height = `${event.target.scrollHeight}px`
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setEditing(false)
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (draft.trim().length >= 3) {
                  setEditing(false)
                  onEdit(draft)
                }
              }
            }}
            className="max-h-60 w-full resize-none bg-transparent md-body-lg text-on-surface outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="text" size="xs" onClick={() => setEditing(false)}>
              Hủy
            </Button>
            <Button
              size="xs"
              disabled={draft.trim().length < 3 || draft.trim() === message.content}
              onClick={() => {
                setEditing(false)
                onEdit(draft)
              }}
            >
              Gửi lại
            </Button>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="group ml-auto flex max-w-xl flex-col items-end">
      <div className="rounded-2xl rounded-br-md bg-secondary-container px-4 py-3 md-body-lg text-on-secondary-container">
        {message.content}
      </div>
      <div className="mt-1 flex gap-0.5 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
        <IconButton icon="share" label="Chép câu hỏi" size="xs" onClick={copy} />
        <IconButton
          icon="edit"
          label="Sửa câu hỏi"
          size="xs"
          disabled={disabled}
          onClick={() => setEditing(true)}
        />
        <IconButton
          icon="refresh"
          label="Hỏi lại"
          size="xs"
          disabled={disabled}
          onClick={onRetry}
        />
      </div>
    </article>
  )
}
