import { useState } from 'react'
import { Button, Group, Text, Textarea } from '@mantine/core'
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
        <Text size="sm" c="var(--mantine-primary-color-filled)" fw={500}>
          {clarify.basedOn}
        </Text>
      )}
      <Text size="md" mt={2}>
        {clarify.question}
      </Text>

      {clarify.options.length > 0 && (
        <Group gap="xs" mt="sm">
          {clarify.options.map((option) => (
            <Button key={option} variant="default" size="sm" onClick={() => onAnswer(option)}>
              {option}
            </Button>
          ))}
        </Group>
      )}

      {clarify.allowFreeText && (
        <Group gap="xs" mt="sm" align="flex-end" wrap="nowrap">
          <Textarea
            className={classes.clarifyInput}
            autosize
            minRows={1}
            maxRows={4}
            value={text}
            placeholder="Hoặc tự trả lời…"
            aria-label="Câu trả lời của bạn"
            onChange={(event) => setText(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                if (ready) onAnswer(text.trim())
              }
            }}
          />
          <Button
            size="md"
            disabled={!ready}
            onClick={() => onAnswer(text.trim())}
            aria-label="Gửi câu trả lời"
            px="sm"
          >
            <IconSend2 size={18} />
          </Button>
        </Group>
      )}

      <Button variant="subtle" size="compact-sm" mt="sm" onClick={onSkip}>
        Bỏ qua, cứ bói luôn
      </Button>
    </section>
  )
}
