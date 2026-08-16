import { useState } from 'react'
import { Button, Icon } from '@/components'
import { cn } from '@/lib/cn'
import type { PendingClarify } from './useChat'

/**
 * Câu hỏi làm rõ của Oraclia. Bấm một lựa chọn là gửi luôn; muốn nói khác thì
 * gõ vào ô bên dưới. Bỏ qua được, vì có người chỉ muốn bói ngay.
 */
export function ClarifyPrompt({
  clarify,
  busy,
  onAnswer,
  onSkip,
}: {
  clarify: PendingClarify
  busy: boolean
  onAnswer: (answer: string) => void
  onSkip: () => void
}) {
  const [text, setText] = useState('')
  const ready = text.trim().length > 0

  return (
    <section className="md-slide-up rounded-xl border border-primary/40 bg-primary-container/25 p-4">
      <div className="flex items-start gap-2">
        <Icon name="sparkle" size={20} className="mt-0.5 shrink-0 text-primary" />
        <div className="min-w-0">
          {clarify.basedOn && (
            <p className="md-label-md text-primary">Nhìn {clarify.basedOn}</p>
          )}
          <p className="md-body-lg text-on-surface">{clarify.question}</p>
        </div>
      </div>

      {clarify.options.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {clarify.options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={busy}
              onClick={() => onAnswer(option)}
              className={cn(
                'rounded-full border border-outline-variant bg-surface px-4 py-2 md-label-lg',
                'text-on-surface transition-colors hover:border-primary hover:bg-primary-container',
                'disabled:opacity-50',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {clarify.allowFreeText && (
        <div className="mt-3 flex items-end gap-2">
          <textarea
            rows={1}
            value={text}
            disabled={busy}
            placeholder="Hoặc tự trả lời..."
            onChange={(event) => {
              setText(event.target.value)
              event.target.style.height = 'auto'
              event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (ready) onAnswer(text.trim())
              }
            }}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-outline-variant bg-surface px-3 py-2 md-body-lg text-on-surface outline-none focus:border-primary"
          />
          <Button size="sm" disabled={busy || !ready} onClick={() => onAnswer(text.trim())}>
            Gửi
          </Button>
        </div>
      )}

      <Button variant="text" size="xs" className="mt-2" disabled={busy} onClick={onSkip}>
        Bỏ qua, cứ bói luôn
      </Button>
    </section>
  )
}
