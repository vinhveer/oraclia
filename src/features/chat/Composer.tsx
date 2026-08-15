import { useRef, useState } from 'react'
import { IconButton } from '@/components'

export function Composer({
  disabled,
  onSend,
  onActivity,
}: {
  disabled: boolean
  onSend: (question: string) => void
  /** Gõ phím là dấu hiệu người dùng còn ở đây; hoãn lượt phản tư lại. */
  onActivity?: () => void
}) {
  const [value, setValue] = useState('')
  const field = useRef<HTMLTextAreaElement>(null)
  const ready = value.trim().length >= 3 && !disabled

  function submit() {
    if (!ready) return
    onSend(value.trim())
    setValue('')
    if (field.current) field.current.style.height = 'auto'
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="shrink-0 bg-surface px-4 pb-4 sm:px-8"
    >
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-outline-variant bg-surface-low p-2 pl-4 transition-colors focus-within:border-primary">
        <textarea
          ref={field}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder="Hỏi một điều..."
          onChange={(event) => {
            setValue(event.target.value)
            onActivity?.()
            // Grow with the question instead of trapping it in a one-line box.
            event.target.style.height = 'auto'
            event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          className="max-h-40 min-h-10 flex-1 resize-none self-center bg-transparent py-2 md-body-lg text-on-surface outline-none placeholder:text-on-surface-variant disabled:opacity-50"
        />
        <IconButton
          type="submit"
          icon="arrowRight"
          label="Gửi"
          variant="filled"
          disabled={!ready}
        />
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center md-body-sm text-on-surface-variant">
        Tarot ở đây để tự soi chiếu, không thay thế tư vấn y tế, pháp lý hay tài chính.
      </p>
    </form>
  )
}
