import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CircularProgress, Icon, IconButton, useSnackbar } from '@/components'
import { Composer } from '@/features/chat/Composer'
import { MessageBubble } from '@/features/chat/MessageBubble'
import { Sidebar } from '@/features/chat/Sidebar'
import { DRAFT_ID, useChat } from '@/features/chat/useChat'
import { ClarifyPrompt } from '@/features/chat/ClarifyPrompt'
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
  const main = useRef<HTMLElement>(null)
  /**
   * Chỉ bám đáy khi người đọc đang ở đáy. Trước đây cứ nội dung đổi là kéo
   * xuống, mà bộ đệm nhả chữ 24ms một lần, nên vuốt lên đọc lại là bị giật
   * xuống ngay.
   */
  const [pinned, setPinned] = useState(true)
  // Ref là nguồn quyết định đồng bộ cho mỗi frame; state chỉ dùng để render nút
  // xuống cuối. Nhờ vậy một scroll event do chiều cao nội dung vừa đổi không thể
  // chen giữa render và effect rồi vô tình tắt chế độ bám đáy.
  const pinnedRef = useRef(true)
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

  useLayoutEffect(() => {
    if (!pinnedRef.current) return
    const node = main.current
    if (!node) return
    // Nhảy thẳng chứ không cuộn mượt: nội dung dài thêm liên tục nên animation
    // bị cắt giữa chừng, nhìn giật hơn là đứng yên.
    node.scrollTop = node.scrollHeight
  }, [chat.messages, chat.turn, chat.draw, chat.clarify])

  /**
   * Ý muốn đọc lại đến từ ngón tay, không đến từ sự kiện scroll. Trong lúc nhả
   * chữ, cứ 24ms nội dung lại dài thêm và layout effect kéo scrollTop về đáy —
   * cú vuốt lên bị xoá trước khi trình duyệt kịp bắn scroll event, nên người
   * dùng thấy màn hình như bị khoá. Bắt thẳng wheel/touch/phím để nhả bám đáy
   * ngay trong cùng một frame với thao tác.
   */
  useEffect(() => {
    const node = main.current
    if (!node) return
    const release = () => {
      // Nội dung chưa tràn thì không có gì để cuộn: đừng hiện nút xuống cuối.
      if (node.scrollHeight <= node.clientHeight + 8) return
      pinnedRef.current = false
      setPinned(false)
    }
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) release()
    }
    let startY = 0
    const onTouchStart = (event: TouchEvent) => {
      startY = event.touches[0]?.clientY ?? 0
    }
    const onTouchMove = (event: TouchEvent) => {
      // Kéo ngón xuống tức là đẩy nội dung lên trên: đang xem lại phần cũ.
      if ((event.touches[0]?.clientY ?? 0) - startY > 4) release()
    }
    const onKey = (event: KeyboardEvent) => {
      if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) release()
    }
    node.addEventListener('wheel', onWheel, { passive: true })
    node.addEventListener('touchstart', onTouchStart, { passive: true })
    node.addEventListener('touchmove', onTouchMove, { passive: true })
    node.addEventListener('keydown', onKey)
    return () => {
      node.removeEventListener('wheel', onWheel)
      node.removeEventListener('touchstart', onTouchStart)
      node.removeEventListener('touchmove', onTouchMove)
      node.removeEventListener('keydown', onKey)
    }
  }, [])

  // Đổi cuộc trò chuyện thì luôn bắt đầu ở đáy.
  useEffect(() => {
    pinnedRef.current = true
    setPinned(true)
  }, [conversationId])

  function trackScroll(node: HTMLElement) {
    const gap = node.scrollHeight - node.scrollTop - node.clientHeight
    const next = gap < 96
    pinnedRef.current = next
    setPinned(next)
  }

  /** Người dùng vừa làm gì đó: kéo họ về đáy để thấy kết quả. */
  function stickToBottom() {
    pinnedRef.current = true
    setPinned(true)
  }

  function jumpToBottom() {
    pinnedRef.current = true
    setPinned(true)
    const node = main.current
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
  }

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

        <main
          ref={main}
          onScroll={(event) => trackScroll(event.currentTarget)}
          className="flex-1 overflow-y-auto [overflow-anchor:none]"
        >
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

            {chat.clarify && (
              <ClarifyPrompt
                clarify={chat.clarify}
                busy={chat.busy && !chat.clarify}
                onAnswer={(answer) => {
                  stickToBottom()
                  chat.respond(answer)
                }}
                onSkip={() => {
                  stickToBottom()
                  chat.respond('', true)
                }}
              />
            )}

            {chat.draw && !pickerOpen && (
              <DrawPrompt draw={chat.draw} onOpen={() => setPickerOpen(true)} />
            )}

            {chat.reflecting !== 'idle' && (
              <p className="md-fade-in flex items-center gap-2 md-label-md text-on-surface-variant">
                <Icon name={chat.reflecting === 'saved' ? 'check' : 'bookmark'} size={16} />
                {chat.reflecting === 'saved' ? 'Đã ghi nhớ.' : 'Đang ghi nhớ...'}
              </p>
            )}
          </div>
        </main>

        {!pinned && (
          <button
            type="button"
            onClick={jumpToBottom}
            aria-label="Xuống cuối"
            className="md-fade-in absolute right-4 bottom-28 z-20 grid size-11 place-items-center rounded-full bg-surface-high text-on-surface shadow-e2 transition-colors hover:bg-surface-highest"
          >
            <Icon name="chevronDown" size={22} />
          </button>
        )}

        <Composer
          disabled={chat.busy}
          onSend={(question) => {
            stickToBottom()
            chat.send(question)
          }}
          onActivity={chat.noteActivity}
        />
      </div>

      {chat.draw && pickerOpen && (
        <CardPicker
          draw={chat.draw}
          busy={false}
          onConfirm={(indices) => {
            setPickerOpen(false)
            stickToBottom()
            chat.submit(indices)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

    </div>
  )
}
