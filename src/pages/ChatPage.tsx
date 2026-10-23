import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { notifications } from '@mantine/notifications'
import { subscribeToConversation } from '@db'
import { useOracliaRuntime } from '@/features/chat/runtime'
import {
  clearError,
  loadThread,
  NEW_THREAD,
  pendingRequest,
  receiveRow,
  selectThread,
  submitCards,
  useChatStore,
} from '@/features/chat/store'
import { ChatProvider, Thread } from '@/features/chat/Thread'
import { CardPicker } from '@/features/tarot/CardPicker'

export default function ChatPage() {
  const { id } = useParams()
  const threadKey = id ?? NEW_THREAD
  const runtime = useOracliaRuntime(threadKey)
  const thread = useChatStore(selectThread(threadKey))
  const request = pendingRequest(thread)
  const draw = request?.kind === 'draw' ? request : null
  const [pickerFor, setPickerFor] = useState<string | null>(null)

  useEffect(() => {
    if (id) loadThread(id)
  }, [id])

  // Tab khác hay thiết bị khác ghi thẳng vào Postgres; soi theo. Store tự bỏ qua
  // khi chính tab này đang stream vào cuộc đó.
  useEffect(() => {
    if (!id) return
    return subscribeToConversation(id, (row) => receiveRow(id, row))
  }, [id])

  // Oraclia vừa xáo bài: mở bộ bài ngay, không bắt người dùng đi tìm nút.
  const drawId = draw?.readingId ?? null
  useEffect(() => {
    if (drawId) setPickerFor(drawId)
  }, [drawId])

  useEffect(() => {
    if (!thread.error) return
    notifications.show({ color: 'red', message: thread.error })
    clearError(threadKey)
  }, [thread.error, threadKey])

  const openPicker = useCallback(() => setPickerFor(drawId), [drawId])

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatProvider threadKey={threadKey} openPicker={openPicker}>
        <Thread />
      </ChatProvider>
      {draw && (
        <CardPicker
          key={draw.readingId}
          draw={draw}
          opened={pickerFor === draw.readingId}
          onClose={() => setPickerFor(null)}
          onConfirm={(indices) => {
            setPickerFor(null)
            submitCards(threadKey, indices)
          }}
        />
      )}
    </AssistantRuntimeProvider>
  )
}
