import { useMemo } from 'react'
import {
  useExternalStoreRuntime,
  type AppendMessage,
  type FeedbackAdapter,
  type ThreadMessageLike,
} from '@assistant-ui/react'
import { notifications } from '@mantine/notifications'
import { rateMessage, type Rating } from '@db'
import {
  ask,
  cancel,
  isBusy,
  resend,
  selectThread,
  setRating,
  useChatStore,
  type ChatMessage,
} from './store'

/** Dữ liệu riêng của Oraclia đi kèm mỗi tin, đọc lại trong component qua metadata.custom. */
export interface OracliaMeta {
  cards: ChatMessage['cards']
  hexagram: ChatMessage['hexagram']
  activities: ChatMessage['activities']
  request: ChatMessage['request']
  serverId: string | null
}

const STATUS = {
  running: { type: 'running' },
  'requires-action': { type: 'requires-action', reason: 'tool-calls' },
  complete: { type: 'complete', reason: 'stop' },
  incomplete: { type: 'incomplete', reason: 'error' },
} as const

function textOf(message: AppendMessage): string {
  return message.content
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('\n')
    .trim()
}

/**
 * Nối store của Oraclia vào assistant-ui. Thư viện lo phần giao diện chat — cuộn,
 * ô nhập, sửa, hỏi lại, sao chép, đánh giá — còn mọi trạng thái vẫn nằm trong
 * store, để stream sống sót qua việc đổi trang.
 */
export function useOracliaRuntime(key: string) {
  const thread = useChatStore(selectThread(key))
  const busy = isBusy(thread)

  const feedback = useMemo<FeedbackAdapter>(
    () => ({
      submit: ({ message, type }) => {
        const meta = message.metadata.custom as unknown as OracliaMeta | undefined
        if (!meta?.serverId) return
        const rating: Rating = type === 'positive' ? 1 : -1
        setRating(key, meta.serverId, rating)
        rateMessage(meta.serverId, rating).catch(() =>
          notifications.show({ color: 'red', message: 'Chưa gửi được đánh giá.' }),
        )
      },
    }),
    [key],
  )

  return useExternalStoreRuntime<ChatMessage>({
    messages: thread.messages,
    isRunning: thread.running,
    isLoading: thread.loading,
    // Chỉ khoá nút gửi, không khoá ô nhập: khoá ô nhập là bàn phím mobile đóng
    // lại ngay sau mỗi câu hỏi, và người dùng mất chỗ đang gõ dở.
    isSendDisabled: busy,
    convertMessage: (message): ThreadMessageLike => {
      const rating = message.rating
      return {
        id: message.id,
        role: message.role,
        createdAt: new Date(message.createdAt),
        content: message.content ? [{ type: 'text', text: message.content }] : [],
        status: message.role === 'assistant' ? STATUS[message.status] : undefined,
        metadata: {
          custom: {
            cards: message.cards,
            hexagram: message.hexagram,
            activities: message.activities,
            request: message.request,
            serverId: message.serverId,
          } satisfies OracliaMeta as unknown as Record<string, unknown>,
          ...(rating
            ? { submittedFeedback: { type: rating === 1 ? 'positive' : 'negative' } as const }
            : {}),
        },
      }
    },
    onNew: async (message) => {
      await ask(key, textOf(message))
    },
    onEdit: async (message) => {
      if (message.sourceId) await resend(key, message.sourceId, textOf(message))
    },
    onReload: async (parentId) => {
      const parent = thread.messages.find((item) => item.id === parentId)
      if (parent?.role === 'user') await resend(key, parent.id, parent.content)
    },
    onCancel: async () => cancel(key),
    adapters: { feedback },
  })
}
