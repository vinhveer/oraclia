import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { IconSend2 } from '@tabler/icons-react'
import type { PendingClarify } from './store'
import classes from './Thread.module.css'

/**
 * Câu hỏi làm rõ của Oraclia. Bấm một lựa chọn là gửi luôn; muốn nói khác thì
 * gõ vào ô bên dưới. Bỏ qua được, vì có người chỉ muốn bói ngay.
 */
export function ClarifyPrompt({
  clarify,
  onAnswer,
  onSkip,
}: {
  clarify: PendingClarify
  onAnswer: (answer: string) => void
  onSkip: () => void
}) {
  const [text, setText] = useState('')
  const ready = text.trim().length > 0

  return (
    <section className={classes.clarify} aria-live="polite">
      {clarify.basedOn && (
        <Text type="label" color="accent">
          {clarify.basedOn}
        </Text>
      )}
      <Text type="large" display="block">
        {clarify.question}
      </Text>

      {clarify.options.length > 0 && (
        <div className={classes.clarifyOptions}>
          {clarify.options.map((option) => (
            <Button key={option} label={option} onClick={() => onAnswer(option)} />
          ))}
        </div>
      )}

      {clarify.allowFreeText && (
        <div className={classes.clarifyRow}>
          <div className={classes.clarifyInput}>
            <TextInput
              label="Câu trả lời của bạn"
              isLabelHidden
              value={text}
              placeholder="Hoặc tự trả lời…"
              enterKeyHint="send"
              onChange={setText}
              // onEnter của Astryx đã chặn Enter lúc đang gõ dấu (IME).
              onEnter={() => {
                if (ready) onAnswer(text.trim())
              }}
            />
          </div>
          <Button
            label="Gửi câu trả lời"
            variant="primary"
            isIconOnly
            isDisabled={!ready}
            icon={<Icon icon={IconSend2} />}
            onClick={() => onAnswer(text.trim())}
          />
        </div>
      )}

      <div>
        <Button label="Bỏ qua, cứ bói luôn" variant="ghost" size="sm" onClick={onSkip} />
      </div>
    </section>
  )
}
