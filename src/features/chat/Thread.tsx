import { createContext, memo, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import {
  ChatComposer,
  ChatComposerInput,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatSendButton,
} from '@astryxdesign/core/Chat'
import { ClickableCard } from '@astryxdesign/core/ClickableCard'
import { Heading } from '@astryxdesign/core/Heading'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import {
  IconBookmark,
  IconCheck,
  IconCopy,
  IconMoonStars,
  IconPencil,
  IconRefresh,
  IconThumbDown,
  IconThumbUp,
} from '@tabler/icons-react'
import { rateMessage, type Rating } from '@db'
import { MessagesSkeleton } from '@/app/Skeletons'
import { notify } from '@/app/notify'
import { useMediaQuery } from '@/lib/hooks'

/** Màn hẹp cỡ điện thoại: dùng mật độ gọn cho khung chat và ô nhập. */
const NARROW = '(max-width: 640px)'
import { DrawPrompt } from '../tarot/CardPicker'
import { HexagramView } from '../tarot/HexagramView'
import { RevealedCards } from '../tarot/RevealedCards'
import { ActivityTrace } from './ActivityTrace'
import { ClarifyPrompt } from './ClarifyPrompt'
import { MarkdownText } from './MarkdownText'
import {
  answerClarify,
  ask,
  cancel,
  isBusy,
  resend,
  scheduleReflection,
  selectThread,
  setRating,
  useChatStore,
  type ChatMessage as StoreMessage,
} from './store'
import classes from './Thread.module.css'

/**
 * Màn hình chat, dựng theo template "AI Chat Conversation" của Astryx
 * (ChatLayout + ChatMessageList + ChatComposer) và "AI Chat Landing" cho màn
 * trống. Không còn lớp runtime trung gian: mọi thứ đọc thẳng từ store (zustand)
 * và gọi thẳng các hành động của nó — store vẫn là nguồn thật duy nhất, nên
 * stream sống sót qua việc đổi trang hay đổi cuộc.
 *
 * Phần cuộn do ChatLayout lo: bám đáy khi chữ đang chảy, người dùng cuộn lên
 * là nhả, nút "Xuống cuối" đưa về đáy và bám lại.
 */

interface ChatContextValue {
  threadKey: string
  openPicker: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

function useChatContext() {
  const value = useContext(ChatContext)
  if (!value) throw new Error('Thread must be rendered inside <ChatProvider>')
  return value
}

export function ChatProvider({
  threadKey,
  openPicker,
  children,
}: ChatContextValue & { children: React.ReactNode }) {
  const value = useMemo(() => ({ threadKey, openPicker }), [threadKey, openPicker])
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

const SUGGESTIONS = [
  'Công việc của tôi ba tháng tới sẽ thế nào?',
  'Tôi có nên nói thật cảm xúc của mình với người ấy?',
  'Gieo một quẻ Kinh Dịch: có nên bắt đầu dự án mới lúc này?',
]

/**
 * Gửi một câu hỏi là muốn theo dõi câu trả lời: đưa về đáy và khoá bám đáy lại.
 *
 * ChatLayout (Astryx 0.7) nhả khoá khi thấy scrollTop giảm mà chưa chạm đáy. Lúc
 * nội dung đổi hình (màn chào cao hơn màn hình được thay bằng câu hỏi ngắn, hay
 * sửa câu hỏi cắt bớt tin), trình duyệt kẹp scrollTop xuống, và sự kiện scroll
 * tới muộn một khung hình — khi nội dung đã dài ra — nên bị đọc nhầm là người
 * dùng cuộn lên (gặp trên WebKit iPhone). Không có API công khai để khoá lại,
 * nên đặt scrollTop về đáy rồi phát `scrollend`: ChatLayout tự khoá khi một lần
 * cuộn kết thúc sát đáy.
 */
function useFollowOnSend(lastUserId: string | undefined) {
  const ref = useRef<HTMLDivElement>(null)
  const previous = useRef(lastUserId)
  useEffect(() => {
    if (previous.current === lastUserId) return
    previous.current = lastUserId
    const node = ref.current
    if (!node) return
    let second = 0
    const first = requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight
      second = requestAnimationFrame(() => node.dispatchEvent(new Event('scrollend')))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [lastUserId])
  return ref
}

export function Thread() {
  const { threadKey } = useChatContext()
  const messages = useChatStore((state) => selectThread(threadKey)(state).messages)
  const loading = useChatStore((state) => selectThread(threadKey)(state).loading)
  const lastUserId = messages.findLast((message) => message.role === 'user')?.id
  const layoutRef = useFollowOnSend(lastUserId)
  // Điện thoại: mật độ compact — "spacious" chừa ~48px mỗi bên, phí 1/4 bề ngang.
  const narrow = useMediaQuery(NARROW)

  return (
    <div className={classes.root}>
      <ChatLayout
        ref={layoutRef}
        data-testid="thread-viewport"
        density={narrow ? 'compact' : 'spacious'}
        className={classes.layout}
        emptyState={<Welcome />}
        composer={
          <>
            <Composer />
            <p className={classes.disclaimer}>
              Tarot và Kinh Dịch ở đây để tự soi chiếu, không thay thế tư vấn y tế, pháp lý hay tài chính.
            </p>
          </>
        }
      >
        {messages.length > 0 ? (
          <ChatMessageList gap={6}>
            {messages.map((message, index) =>
              message.role === 'user' ? (
                <UserMessage key={message.id} message={message} />
              ) : (
                <AssistantMessage
                  key={message.id}
                  message={message}
                  parent={messages[index - 1]}
                  latest={index === messages.length - 1}
                />
              ),
            )}
            <ReflectingNote />
          </ChatMessageList>
        ) : loading ? (
          // Đang tải cuộc cũ thì đừng chào như cuộc mới, kẻo màn hình nháy một nhịp.
          <div className={classes.loading}>
            <MessagesSkeleton />
          </div>
        ) : null}
      </ChatLayout>
    </div>
  )
}

function Welcome() {
  const { threadKey } = useChatContext()
  return (
    <div className={classes.welcome}>
      <div className={classes.welcomeMark}>
        <Icon icon={IconMoonStars} size="md" color="accent" />
        <Text type="large" color="secondary">
          Oraclia
        </Text>
      </div>
      <Heading level={1} type="display-3">
        Bạn đang nghĩ gì?
      </Heading>
      <Text color="secondary" display="block" className={classes.welcomeText}>
        Hỏi một điều. Oraclia tự chọn tarot, bài tây hay Kinh Dịch cho câu hỏi đó, và nếu là rút
        bài thì bạn tự tay chọn từ bộ bài đã xáo úp mặt.
      </Text>
      <div className={classes.suggestions}>
        {SUGGESTIONS.map((suggestion) => (
          <ClickableCard
            key={suggestion}
            label={suggestion}
            variant="muted"
            padding={3}
            onClick={() => ask(threadKey, suggestion)}
          >
            <Text>{suggestion}</Text>
          </ClickableCard>
        ))}
      </div>
    </div>
  )
}

const isEnter = (event: React.KeyboardEvent) =>
  event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229

function Composer() {
  const { threadKey } = useChatContext()
  const running = useChatStore((state) => selectThread(threadKey)(state).running)
  const busy = useChatStore((state) => isBusy(selectThread(threadKey)(state)))
  // Trên điện thoại Enter là xuống dòng; gửi bằng nút, như mọi app nhắn tin.
  const touch = useMediaQuery('(pointer: coarse)')
  const narrow = useMediaQuery(NARROW)

  return (
    <ChatComposer
      density={narrow ? 'compact' : 'balanced'}
      className={classes.composer}
      onSubmit={(text) => ask(threadKey, text)}
      onStop={() => cancel(threadKey)}
      isStopShown={running}
      input={
        <ChatComposerInput
          label="Câu hỏi"
          placeholder="Hỏi một điều…"
          maxRows={8}
          hasHistory={false}
          pasteAsToken={false}
          enterKeyHint={touch ? 'enter' : 'send'}
          onKeyDown={(event) => {
            // Gõ phím là dấu hiệu người dùng còn ở đây: dời lượt phản tư ra sau.
            scheduleReflection(threadKey)
            if (!isEnter(event)) return
            if (touch) {
              event.preventDefault()
              document.execCommand('insertLineBreak')
              return
            }
            // Đang có lượt chạy thì Enter không gửi — và không được xoá chữ đang
            // gõ dở (ô nhập của Astryx xoá ngay khi tự gửi).
            if (busy) event.preventDefault()
          }}
        />
      }
      sendButton={
        <ChatSendButton
          // Chỉ khoá nút gửi, không khoá ô nhập: khoá ô nhập là bàn phím mobile
          // đóng lại ngay sau mỗi câu hỏi, và người dùng mất chỗ đang gõ dở.
          {...(busy ? { isDisabled: true } : {})}
          // Giữ focus trong ô nhập: trên điện thoại mất focus là bàn phím sập
          // xuống sau mỗi câu hỏi, rồi lại phải chạm vào ô để gõ tiếp.
          onMouseDown={(event) => event.preventDefault()}
        />
      }
    />
  )
}

// ---------------------------------------------------------------------------
// Tin người dùng
// ---------------------------------------------------------------------------

function useCopy() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  return [
    copied,
    (text: string) => {
      navigator.clipboard
        ?.writeText(text)
        .then(() => {
          setCopied(true)
          clearTimeout(timer.current)
          timer.current = setTimeout(() => setCopied(false), 1500)
        })
        .catch(() => undefined)
    },
  ] as const
}

const UserMessage = memo(function UserMessage({ message }: { message: StoreMessage }) {
  const { threadKey } = useChatContext()
  const busy = useChatStore((state) => isBusy(selectThread(threadKey)(state)))
  const [editing, setEditing] = useState(false)
  const [copied, copy] = useCopy()

  if (editing) {
    return (
      <EditComposer
        initial={message.content}
        onCancel={() => setEditing(false)}
        onSend={(text) => {
          setEditing(false)
          resend(threadKey, message.id, text)
        }}
      />
    )
  }

  return (
    <ChatMessage
      sender="user"
      className={classes.user}
      metadata={
        <div className={classes.actions}>
          <Button
            label="Chép câu hỏi"
            variant="ghost"
            size="sm"
            isIconOnly
            icon={<Icon icon={copied ? IconCheck : IconCopy} />}
            onClick={() => copy(message.content)}
          />
          <Button
            label="Sửa câu hỏi"
            variant="ghost"
            size="sm"
            isIconOnly
            isDisabled={busy}
            icon={<Icon icon={IconPencil} />}
            onClick={() => setEditing(true)}
          />
        </div>
      }
    >
      <ChatMessageBubble>
        <span className={classes.userText}>{message.content}</span>
      </ChatMessageBubble>
    </ChatMessage>
  )
})

function EditComposer({
  initial,
  onCancel,
  onSend,
}: {
  initial: string
  onCancel: () => void
  onSend: (text: string) => void
}) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLTextAreaElement>(null)
  const touch = useMediaQuery('(pointer: coarse)')
  const ready = value.trim().length > 0

  // Ô tự giãn theo nội dung, tới trần thì cuộn.
  useEffect(() => {
    const node = ref.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${Math.min(node.scrollHeight, 240)}px`
  }, [value])

  useEffect(() => {
    const node = ref.current
    node?.focus()
    node?.setSelectionRange(node.value.length, node.value.length)
  }, [])

  return (
    <div className={classes.editComposer}>
      <textarea
        ref={ref}
        className={classes.editInput}
        aria-label="Sửa câu hỏi"
        rows={1}
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel()
          if (!touch && isEnter(event)) {
            event.preventDefault()
            if (ready) onSend(value.trim())
          }
        }}
      />
      <div className={classes.editActions}>
        <Button label="Huỷ" variant="ghost" size="sm" onClick={onCancel} />
        <Button label="Gửi lại" variant="primary" size="sm" isDisabled={!ready} onClick={() => onSend(value.trim())} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tin Oraclia
// ---------------------------------------------------------------------------

const SLOT = /\[\[card:(\d+)\]\]/g

const AssistantMessage = memo(function AssistantMessage({
  message,
  parent,
  latest,
}: {
  message: StoreMessage
  parent: StoreMessage | undefined
  latest: boolean
}) {
  const { threadKey, openPicker } = useChatContext()
  const text = message.content
  const cards = message.cards ?? []
  // Lá nào đã được kể tới trong bài đọc thì nằm trong dòng chữ; hàng lá trên
  // cùng chỉ giữ những lá chưa tới lượt, nên nó vơi dần khi đọc.
  const told = new Set([...text.matchAll(SLOT)].map((match) => Number(match[1]) - 1))
  const pending = cards.filter((_, index) => !told.has(index))
  const request = message.request
  const running = message.status === 'running'

  return (
    <ChatMessage sender="assistant" className={classes.assistant} data-latest={latest ? '' : undefined}>
      <ChatMessageBubble variant="ghost" width="100%">
        <div className={classes.assistantBody}>
          {pending.length > 0 && <RevealedCards cards={pending} />}
          {message.hexagram && <HexagramView casting={message.hexagram} />}
          <ActivityTrace activities={message.activities} />
          {text && <MarkdownText text={text} cards={message.cards} streaming={running} />}

          {request?.kind === 'clarify' && (
            <ClarifyPrompt
              clarify={request}
              onAnswer={(answer) => answerClarify(threadKey, answer)}
              onSkip={() => answerClarify(threadKey, '', true)}
            />
          )}
          {request?.kind === 'draw' && <DrawPrompt draw={request} onOpen={openPicker} />}
          {message.status === 'incomplete' && parent?.role === 'user' && (
            <IncompleteNotice parent={parent} />
          )}

          {message.serverId && !running && <AssistantActions message={message} parent={parent} />}
        </div>
      </ChatMessageBubble>
    </ChatMessage>
  )
})

function AssistantActions({ message, parent }: { message: StoreMessage; parent: StoreMessage | undefined }) {
  const { threadKey } = useChatContext()
  const busy = useChatStore((state) => isBusy(selectThread(threadKey)(state)))
  const [copied, copy] = useCopy()

  function rate(rating: Rating) {
    if (!message.serverId) return
    setRating(threadKey, message.serverId, rating)
    rateMessage(message.serverId, rating).catch(() =>
      notify({ color: 'red', message: 'Chưa gửi được đánh giá.' }),
    )
  }

  return (
    <div className={classes.actions}>
      <Button
        label="Chép bài đọc"
        variant="ghost"
        size="sm"
        isIconOnly
        icon={<Icon icon={copied ? IconCheck : IconCopy} />}
        onClick={() => copy(message.content.replace(SLOT, '').trim())}
      />
      {parent?.role === 'user' && (
        <Button
          label="Hỏi lại"
          tooltip="Hỏi lại câu này"
          variant="ghost"
          size="sm"
          isIconOnly
          isDisabled={busy}
          icon={<Icon icon={IconRefresh} />}
          onClick={() => resend(threadKey, parent.id, parent.content)}
        />
      )}
      <Button
        label="Bài đọc hay"
        variant="ghost"
        size="sm"
        isIconOnly
        className={classes.feedback}
        aria-pressed={message.rating === 1}
        data-submitted={message.rating === 1 ? 'true' : undefined}
        icon={<Icon icon={IconThumbUp} />}
        onClick={() => rate(1)}
      />
      <Button
        label="Bài đọc chưa tốt"
        variant="ghost"
        size="sm"
        isIconOnly
        className={classes.feedback}
        aria-pressed={message.rating === -1}
        data-submitted={message.rating === -1 ? 'true' : undefined}
        icon={<Icon icon={IconThumbDown} />}
        onClick={() => rate(-1)}
      />
    </div>
  )
}

/** Lượt chết giữa đường (mất mạng, máy chủ bận): nói rõ và cho hỏi lại tại chỗ. */
function IncompleteNotice({ parent }: { parent: StoreMessage }) {
  const { threadKey } = useChatContext()
  const busy = useChatStore((state) => isBusy(selectThread(threadKey)(state)))
  return (
    <div className={classes.incomplete}>
      <Text type="supporting">Lượt đọc này bị gián đoạn.</Text>
      <Button
        label="Hỏi lại"
        size="sm"
        icon={<Icon icon={IconRefresh} />}
        isDisabled={busy}
        onClick={() => resend(threadKey, parent.id, parent.content)}
      />
    </div>
  )
}

function ReflectingNote() {
  const { threadKey } = useChatContext()
  const reflecting = useChatStore((state) => selectThread(threadKey)(state).reflecting)
  if (reflecting === 'idle') return null
  return (
    <div className={classes.reflecting}>
      <Icon icon={reflecting === 'saved' ? IconCheck : IconBookmark} size="xsm" />
      <Text type="supporting">{reflecting === 'saved' ? 'Đã ghi nhớ.' : 'Đang ghi nhớ…'}</Text>
    </div>
  )
}
