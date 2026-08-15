import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CircularProgress, Icon, IconButton, useSnackbar } from '@/components'
import { Composer } from '@/features/chat/Composer'
import { MessageBubble } from '@/features/chat/MessageBubble'
import { Sidebar } from '@/features/chat/Sidebar'
import { DRAFT_ID, useChat } from '@/features/chat/useChat'
import { CardPicker, DrawPrompt } from '@/features/tarot/CardPicker'
import {
  createConversation,
  deleteConversation,
  listConversations,
  searchConversations,
  type Conversation,
} from '@db'

export default function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const snackbar = useSnackbar()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const bottom = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const conversationId = id ?? null
  const onConversationCreated = useCallback(
    (created: string) => {
      // The agent creates the row on the first question; adopt it without a reload.
      navigate(`/chat/${created}`, { replace: true })
      listConversations().then(setConversations).catch(() => undefined)
    },
    [navigate],
  )

  const onTitle = useCallback((target: string, title: string) => {
    setConversations((current) =>
      current.map((item) => (item.id === target ? { ...item, title } : item)),
    )
  }, [])

  const chat = useChat(conversationId, onConversationCreated, onTitle)

  useEffect(() => {
    listConversations()
      .then(setConversations)
      .catch(() => undefined)
      .finally(() => setListLoading(false))
  }, [])

  useEffect(() => {
    if (chat.draw) setPickerOpen(true)
  }, [chat.draw])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, chat.turn, chat.draw])

  useEffect(() => {
    if (chat.error) snackbar({ message: chat.error })
  }, [chat.error, snackbar])

  useEffect(() => {
    setDrawerOpen(false)
  }, [conversationId])

  // Gõ tới đâu tìm tới đó, nhưng chờ người dùng ngừng gõ mới gọi server.
  function search(term: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    setSearching(true)
    searchTimer.current = setTimeout(() => {
      searchConversations(term)
        .then(setConversations)
        .catch(() => undefined)
        .finally(() => setSearching(false))
    }, 220)
  }

  async function startConversation() {
    if (creating) return
    setCreating(true)
    try {
      const created = await createConversation()
      setConversations((current) => [created, ...current])
      navigate(`/chat/${created.id}`)
    } catch (exception) {
      snackbar({
        message: exception instanceof Error ? exception.message : 'Không tạo được cuộc trò chuyện.',
      })
    } finally {
      setCreating(false)
    }
  }

  async function removeConversation(target: string) {
    if (deletingId) return
    setDeletingId(target)
    try {
      await deleteConversation(target)
      setConversations((current) => current.filter((item) => item.id !== target))
      if (target === conversationId) navigate('/chat')
    } catch (exception) {
      snackbar({ message: exception instanceof Error ? exception.message : 'Không xóa được.' })
    } finally {
      setDeletingId(null)
    }
  }

  // Tin nhắn nháp tách khỏi danh sách vì nó là chỗ duy nhất mang dòng hoạt động
  // của lượt đang chạy.
  const draft = chat.messages.find((message) => message.id === DRAFT_ID) ?? null
  const settled = draft ? chat.messages.filter((message) => message.id !== DRAFT_ID) : chat.messages

  const sidebar = (
    <Sidebar
      items={conversations}
      activeId={conversationId}
      onSelect={(next) => navigate(`/chat/${next}`)}
      onCreate={startConversation}
      onDelete={removeConversation}
      onSearch={search}
      creating={creating}
      deletingId={deletingId}
      searching={searching}
      loading={listLoading}
    />
  )

  return (
    <div className="md-fade-in flex h-dvh bg-surface text-on-surface">
      <aside className="hidden w-72 shrink-0 border-r border-outline-variant bg-surface-low lg:block">
        {sidebar}
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-100 lg:hidden">
          <button
            type="button"
            aria-label="Đóng danh sách"
            className="md-fade-in absolute inset-0 bg-scrim/32"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 rounded-r-xl bg-surface-low shadow-e3">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Không có thanh tiêu đề: chỉ một nút mở danh sách nổi trên nội dung. */}
        <span className="absolute top-2 left-2 z-20 lg:hidden">
          <IconButton
            icon="menu"
            label="Mở danh sách"
            variant="tonal"
            onClick={() => setDrawerOpen(true)}
          />
        </span>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 pt-16 pb-8 sm:px-8 lg:pt-8">
            {!chat.messages.length && !chat.loading && (
              <div className="md-stagger pt-[14vh]">
                <h1 className="md-display-sm text-on-surface">Bạn đang nghĩ gì?</h1>
                <p className="mt-3 md-body-lg text-on-surface-variant">
                  Hỏi một điều. Oraclia tự chọn tarot hay Kinh Dịch cho câu hỏi này, và nếu là
                  tarot thì bạn tự tay rút từ bộ 78 lá đã xáo úp mặt.
                </p>
              </div>
            )}

            {chat.loading && (
              <div className="grid place-items-center py-16 text-on-surface-variant">
                <CircularProgress size={28} />
              </div>
            )}

            {settled.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                busy={chat.busy}
                onRetry={chat.retry}
                onEdit={chat.edit}
              />
            ))}

            {draft && <MessageBubble message={draft} activities={chat.turn.activities} />}

            {chat.draw && !pickerOpen && (
              <DrawPrompt pickCount={chat.draw.pickCount} onOpen={() => setPickerOpen(true)} />
            )}

            {chat.reflecting !== 'idle' && (
              <p className="md-fade-in flex items-center gap-2 md-label-md text-on-surface-variant">
                <Icon name={chat.reflecting === 'saved' ? 'check' : 'bookmark'} size={16} />
                {chat.reflecting === 'saved' ? 'Đã ghi nhớ.' : 'Đang ghi nhớ...'}
              </p>
            )}

            <div ref={bottom} />
          </div>
        </main>

        <Composer
          disabled={chat.busy}
          onSend={chat.send}
          onActivity={chat.noteActivity}
        />
      </div>

      {chat.draw && pickerOpen && (
        <CardPicker
          draw={chat.draw}
          busy={false}
          onConfirm={(indices) => {
            setPickerOpen(false)
            chat.submit(indices)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

    </div>
  )
}
