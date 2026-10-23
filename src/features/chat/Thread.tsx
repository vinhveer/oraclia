import { createContext, useContext, useMemo } from 'react'
import {
  ActionBarPrimitive,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from '@assistant-ui/react'
import { ActionIcon, Button, Loader, Text, Title, Tooltip, UnstyledButton } from '@mantine/core'
import {
  IconArrowDown,
  IconArrowUp,
  IconBookmark,
  IconCheck,
  IconCopy,
  IconPencil,
  IconPlayerStopFilled,
  IconRefresh,
  IconThumbDown,
  IconThumbUp,
} from '@tabler/icons-react'
import { DrawPrompt } from '../tarot/CardPicker'
import { HexagramView } from '../tarot/HexagramView'
import { RevealedCards } from '../tarot/RevealedCards'
import { ActivityTrace } from './ActivityTrace'
import { ClarifyPrompt } from './ClarifyPrompt'
import { MarkdownText } from './MarkdownText'
import { useMessageMeta } from './meta'
import {
  answerClarify,
  ask,
  isBusy,
  resend,
  scheduleReflection,
  selectThread,
  useChatStore,
} from './store'
import classes from './Thread.module.css'

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

export function Thread() {
  return (
    <ThreadPrimitive.Root className={classes.root}>
      <ThreadPrimitive.Viewport className={classes.viewport} data-testid="thread-viewport">
        <div className={classes.column}>
          <ThreadPrimitive.Empty>
            <Welcome />
          </ThreadPrimitive.Empty>
          <ThreadPrimitive.Messages>
            {({ message }) => (message.role === 'user' ? <UserMessage /> : <AssistantMessage />)}
          </ThreadPrimitive.Messages>
          <ReflectingNote />
        </div>

        <ThreadPrimitive.ViewportFooter className={classes.footer}>
          <ThreadPrimitive.ScrollToBottom asChild>
            <ActionIcon
              className={classes.scrollDown}
              variant="default"
              size={36}
              aria-label="Xuống cuối"
            >
              <IconArrowDown size={18} />
            </ActionIcon>
          </ThreadPrimitive.ScrollToBottom>
          <Composer />
          <Text size="xs" c="dimmed" ta="center" mt={6} className={classes.disclaimer}>
            Tarot và Kinh Dịch ở đây để tự soi chiếu, không thay thế tư vấn y tế, pháp lý hay tài chính.
          </Text>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  )
}

function Welcome() {
  const { threadKey } = useChatContext()
  const loading = useChatStore((state) => selectThread(threadKey)(state).loading)
  // Đang tải cuộc cũ thì đừng chào như cuộc mới, kẻo màn hình nháy một nhịp.
  if (loading) {
    return (
      <div className={classes.loading}>
        <Loader size="sm" />
      </div>
    )
  }
  return (
    <div className={classes.welcome}>
      <Title order={1}>Bạn đang nghĩ gì?</Title>
      <Text c="dimmed" mt={8} maw={560}>
        Hỏi một điều. Oraclia tự chọn tarot, bài tây hay Kinh Dịch cho câu hỏi đó, và nếu là rút
        bài thì bạn tự tay chọn từ bộ bài đã xáo úp mặt.
      </Text>
      <div className={classes.suggestions}>
        {SUGGESTIONS.map((suggestion) => (
          <UnstyledButton
            key={suggestion}
            className={classes.suggestion}
            onClick={() => ask(threadKey, suggestion)}
          >
            {suggestion}
          </UnstyledButton>
        ))}
      </div>
    </div>
  )
}

function Composer() {
  const { threadKey } = useChatContext()
  return (
    <ComposerPrimitive.Root className={classes.composer}>
      <ComposerPrimitive.Input
        className={classes.composerInput}
        placeholder="Hỏi một điều…"
        aria-label="Câu hỏi"
        rows={1}
        submitMode="enter"
        // Trên điện thoại Enter là xuống dòng; gửi bằng nút, như mọi app nhắn tin.
        unstable_insertNewlineOnTouchEnter
        // Gõ phím là dấu hiệu người dùng còn ở đây: dời lượt phản tư ra sau.
        onKeyDown={() => scheduleReflection(threadKey)}
      />
      <AuiIf condition={(state) => !state.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <ActionIcon
            size={40}
            variant="filled"
            aria-label="Gửi"
            // Giữ focus trong ô nhập: trên điện thoại mất focus là bàn phím sập
            // xuống sau mỗi câu hỏi, rồi lại phải chạm vào ô để gõ tiếp.
            onMouseDown={(event) => event.preventDefault()}
          >
            <IconArrowUp size={20} />
          </ActionIcon>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(state) => state.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <ActionIcon size={40} variant="default" aria-label="Dừng">
            <IconPlayerStopFilled size={16} />
          </ActionIcon>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </ComposerPrimitive.Root>
  )
}

function UserMessage() {
  const editing = useAuiState((state) => state.message.composer.isEditing)
  const { threadKey } = useChatContext()
  const busy = useChatStore((state) => isBusy(selectThread(threadKey)(state)))
  if (editing) return <EditComposer />

  return (
    <MessagePrimitive.Root className={classes.user}>
      <div className={classes.userBubble}>
        <MessagePrimitive.Parts />
      </div>
      <ActionBarPrimitive.Root className={classes.userActions}>
        <ActionBarPrimitive.Copy asChild>
          <ActionIcon variant="subtle" color="gray" size={32} aria-label="Chép câu hỏi">
            <CopyIcon />
          </ActionIcon>
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Edit asChild>
          <ActionIcon variant="subtle" color="gray" size={32} aria-label="Sửa câu hỏi" disabled={busy}>
            <IconPencil size={16} />
          </ActionIcon>
        </ActionBarPrimitive.Edit>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  )
}

function EditComposer() {
  return (
    <ComposerPrimitive.Root className={classes.editComposer}>
      <ComposerPrimitive.Input
        className={classes.editInput}
        aria-label="Sửa câu hỏi"
        autoFocus
        submitMode="enter"
        unstable_insertNewlineOnTouchEnter
      />
      <div className={classes.editActions}>
        <ComposerPrimitive.Cancel asChild>
          <Button variant="subtle" size="compact-md">
            Huỷ
          </Button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <Button size="compact-md">Gửi lại</Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  )
}

function useMessageText(): string {
  return useAuiState((state) =>
    state.message.content.map((part) => (part.type === 'text' ? part.text : '')).join(''),
  )
}

const SLOT = /\[\[card:(\d+)\]\]/g

function AssistantMessage() {
  const meta = useMessageMeta()
  const text = useMessageText()
  const { threadKey, openPicker } = useChatContext()
  const cards = meta.cards ?? []
  // Lá nào đã được kể tới trong bài đọc thì nằm trong dòng chữ; hàng lá trên
  // cùng chỉ giữ những lá chưa tới lượt, nên nó vơi dần khi đọc.
  const told = new Set([...text.matchAll(SLOT)].map((match) => Number(match[1]) - 1))
  const pending = cards.filter((_, index) => !told.has(index))
  const request = meta.request

  return (
    <MessagePrimitive.Root className={classes.assistant}>
      {pending.length > 0 && <RevealedCards cards={pending} />}
      {meta.hexagram && <HexagramView casting={meta.hexagram} />}
      <ActivityTrace activities={meta.activities} />
      <MessagePrimitive.Parts components={{ Text: MarkdownText }} />

      {request?.kind === 'clarify' && (
        <ClarifyPrompt
          clarify={request}
          onAnswer={(answer) => answerClarify(threadKey, answer)}
          onSkip={() => answerClarify(threadKey, '', true)}
        />
      )}
      {request?.kind === 'draw' && <DrawPrompt draw={request} onOpen={openPicker} />}
      <IncompleteNotice />

      {meta.serverId && (
        <ActionBarPrimitive.Root className={classes.assistantActions} hideWhenRunning>
          <ActionBarPrimitive.Copy asChild>
            <ActionIcon variant="subtle" color="gray" size={32} aria-label="Chép bài đọc">
              <CopyIcon />
            </ActionIcon>
          </ActionBarPrimitive.Copy>
          <Tooltip label="Hỏi lại câu này">
            <ActionBarPrimitive.Reload asChild>
              <ActionIcon variant="subtle" color="gray" size={32} aria-label="Hỏi lại">
                <IconRefresh size={16} />
              </ActionIcon>
            </ActionBarPrimitive.Reload>
          </Tooltip>
          <ActionBarPrimitive.FeedbackPositive asChild>
            <ActionIcon variant="subtle" color="gray" size={32} aria-label="Bài đọc hay" className={classes.feedback}>
              <IconThumbUp size={16} />
            </ActionIcon>
          </ActionBarPrimitive.FeedbackPositive>
          <ActionBarPrimitive.FeedbackNegative asChild>
            <ActionIcon variant="subtle" color="gray" size={32} aria-label="Bài đọc chưa tốt" className={classes.feedback}>
              <IconThumbDown size={16} />
            </ActionIcon>
          </ActionBarPrimitive.FeedbackNegative>
        </ActionBarPrimitive.Root>
      )}
    </MessagePrimitive.Root>
  )
}

/** Lượt chết giữa đường (mất mạng, máy chủ bận): nói rõ và cho hỏi lại tại chỗ. */
function IncompleteNotice() {
  const { threadKey } = useChatContext()
  const failed = useAuiState((state) => state.message.status?.type === 'incomplete')
  // Selector phải trả giá trị nguyên thủy: trả object mới mỗi lần là React tưởng
  // state luôn đổi và render lại vô hạn.
  const parentId = useAuiState((state) => {
    const parent = state.thread.messages[state.message.index - 1]
    return parent?.role === 'user' ? parent.id : ''
  })
  const parentText = useAuiState((state) => {
    const parent = state.thread.messages[state.message.index - 1]
    return parent?.role === 'user'
      ? parent.content.map((part) => (part.type === 'text' ? part.text : '')).join('')
      : ''
  })
  const busy = useChatStore((state) => isBusy(selectThread(threadKey)(state)))
  if (!failed || !parentId) return null
  return (
    <div className={classes.incomplete}>
      <Text size="sm" c="dimmed">
        Lượt đọc này bị gián đoạn.
      </Text>
      <Button
        variant="default"
        size="compact-sm"
        leftSection={<IconRefresh size={14} />}
        disabled={busy}
        onClick={() => resend(threadKey, parentId, parentText)}
      >
        Hỏi lại
      </Button>
    </div>
  )
}

function CopyIcon() {
  const copied = useAuiState((state) => state.message.isCopied)
  return copied ? <IconCheck size={16} /> : <IconCopy size={16} />
}

function ReflectingNote() {
  const { threadKey } = useChatContext()
  const reflecting = useChatStore((state) => selectThread(threadKey)(state).reflecting)
  if (reflecting === 'idle') return null
  return (
    <div className={classes.reflecting}>
      {reflecting === 'saved' ? <IconCheck size={14} /> : <IconBookmark size={14} />}
      <Text size="xs" c="dimmed">
        {reflecting === 'saved' ? 'Đã ghi nhớ.' : 'Đang ghi nhớ…'}
      </Text>
    </div>
  )
}
