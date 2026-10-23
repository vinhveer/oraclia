import { create } from 'zustand'
import {
  answerClarify as answerClarifyApi,
  ask as askApi,
  deleteMessagesFrom,
  listMessages,
  listRatings,
  reflect as reflectApi,
  selectCards as selectCardsApi,
  type AgentEvent,
  type Casting,
  type DeckKind,
  type DrawnCard,
  type Message,
  type Rating,
} from '@db'
import {
  continueTurn,
  IDLE_TURN,
  reduceTurn,
  startTurn,
  type Activity,
  type TurnState,
} from './activity'

/** Khoá của cuộc chưa có id: câu hỏi đầu tiên ở /chat. */
export const NEW_THREAD = 'new'

/** Ngừng gõ bấy lâu thì agent quay lại nghĩ về những gì vừa nói. */
const REFLECT_AFTER_MS = 6000

export interface PendingDraw {
  kind: 'draw'
  runId: string
  readingId: string
  deck: DeckKind
  deckSize: number
  pickCount: number
  positions: string[]
  reason: string
}

export interface PendingClarify {
  kind: 'clarify'
  runId: string
  clarificationId: string
  question: string
  basedOn: string
  options: string[]
  allowFreeText: boolean
}

export type PendingRequest = PendingDraw | PendingClarify

export interface ChatMessage {
  /**
   * Id ổn định cho giao diện, không bao giờ đổi trong đời một tin nhắn — kể cả
   * khi server cấp id thật. Trước đây bản nháp đổi id lúc hoàn tất nên bị
   * remount: animation chạy lại, dòng hoạt động biến mất.
   */
  id: string
  serverId: string | null
  role: 'user' | 'assistant'
  content: string
  cards: DrawnCard[] | null
  hexagram: Casting | null
  createdAt: string
  /** Những gì Oraclia đã làm trong lượt này; giữ lại sau khi xong để xem lại. */
  activities: Activity[]
  status: 'running' | 'requires-action' | 'complete' | 'incomplete'
  /** Lượt đang chờ người dùng: chọn bài hoặc trả lời câu làm rõ. */
  request: PendingRequest | null
  /**
   * Đánh giá nằm ngay trên tin, không ở một bảng riêng của thread: assistant-ui
   * chỉ chuyển đổi lại tin khi chính object tin đổi, nên để chỗ khác thì nút
   * 👍 bấm rồi vẫn không sáng.
   */
  rating: Rating | null
}

export interface Thread {
  messages: ChatMessage[]
  loaded: boolean
  loading: boolean
  running: boolean
  turn: TurnState
  error: string
  reflecting: 'idle' | 'thinking' | 'saved'
}

const emptyThread = (): Thread => ({
  messages: [],
  loaded: false,
  loading: false,
  running: false,
  turn: IDLE_TURN,
  error: '',
  reflecting: 'idle',
})

interface ChatState {
  threads: Record<string, Thread>
}

/**
 * Mỗi cuộc trò chuyện một ngăn riêng. Stream ghi vào đúng ngăn của nó dù người
 * dùng đã chuyển sang cuộc khác hay sang trang cài đặt — nên không còn chuyện
 * tin của cuộc cũ đổ sang màn hình cuộc mới, và đọc bài không bị huỷ chỉ vì rời
 * màn hình chat.
 */
export const useChatStore = create<ChatState>(() => ({ threads: {} }))

export const selectThread = (key: string) => (state: ChatState) =>
  state.threads[key] ?? EMPTY

const EMPTY = emptyThread()

function update(key: string, patch: (thread: Thread) => Partial<Thread>) {
  useChatStore.setState((state) => {
    const current = state.threads[key] ?? emptyThread()
    return { threads: { ...state.threads, [key]: { ...current, ...patch(current) } } }
  })
}

function updateDraft(key: string, patch: (message: ChatMessage) => Partial<ChatMessage>) {
  update(key, (thread) => {
    const index = findDraftIndex(thread.messages)
    if (index < 0) return {}
    const messages = [...thread.messages]
    messages[index] = { ...messages[index], ...patch(messages[index]) }
    return { messages }
  })
}

/** Tin trả lời đang chạy hoặc đang chờ người dùng — luôn là tin assistant cuối. */
function findDraftIndex(messages: ChatMessage[]): number {
  const index = messages.length - 1
  const last = messages[index]
  return last?.role === 'assistant' && (last.status === 'running' || last.status === 'requires-action')
    ? index
    : -1
}

export function isBusy(thread: Thread): boolean {
  return thread.running || findDraftIndex(thread.messages) >= 0
}

export function pendingRequest(thread: Thread): PendingRequest | null {
  const index = findDraftIndex(thread.messages)
  return index >= 0 ? thread.messages[index].request : null
}

// ---------------------------------------------------------------------------
// Tải và đồng bộ
// ---------------------------------------------------------------------------

const fromServer = (row: Message, rating: Rating | null = null): ChatMessage => ({
  id: row.id,
  serverId: row.id,
  role: row.role === 'user' ? 'user' : 'assistant',
  content: row.content,
  cards: row.cards,
  hexagram: row.hexagram,
  createdAt: row.created_at,
  activities: [],
  status: 'complete',
  request: null,
  rating,
})

export async function loadThread(id: string): Promise<void> {
  const thread = useChatStore.getState().threads[id]
  // Đang stream thì ngăn này là nguồn thật; tải đè lên sẽ xoá bản nháp.
  if (thread?.loaded || thread?.loading || thread?.running) return
  update(id, () => ({ loading: true, error: '' }))
  try {
    const [rows, ratings] = await Promise.all([listMessages(id), listRatings(id)])
    update(id, (current) =>
      current.running
        ? { loading: false }
        : {
            messages: rows.map((row) => fromServer(row, ratings[row.id] ?? null)),
            loaded: true,
            loading: false,
          },
    )
  } catch (exception) {
    update(id, () => ({ loading: false, error: describe(exception) }))
  }
}

/**
 * Tin mới từ tab khác hoặc thiết bị khác (Realtime). Realtime cũng báo lại cả
 * tin chính tab này vừa gửi, và có khi báo muộn — sau khi lượt đã đỗ chờ chọn
 * bài. Chèn mù thì câu hỏi hiện hai lần và lời xin rút bài bị đẩy khỏi cuối.
 */
export function receiveRow(id: string, row: Message) {
  update(id, (thread) => {
    if (!thread.loaded || isBusy(thread)) return {}
    if (thread.messages.some((message) => message.serverId === row.id)) return {}
    const local = thread.messages.findIndex(
      (message) =>
        !message.serverId && message.role === row.role && message.content.trim() === row.content.trim(),
    )
    if (local >= 0) {
      const messages = [...thread.messages]
      messages[local] = { ...messages[local], serverId: row.id, createdAt: row.created_at }
      return { messages }
    }
    return { messages: [...thread.messages, fromServer(row)] }
  })
}

/**
 * Gắn id thật của server vào các tin vừa tạo tại chỗ, không thay cả danh sách:
 * thay danh sách là remount mọi tin, còn ở đây giao diện không thấy gì thay đổi.
 */
async function reconcile(id: string) {
  let rows: Message[]
  try {
    rows = await listMessages(id)
  } catch {
    return
  }
  update(id, (thread) => {
    const used = new Set(thread.messages.map((message) => message.serverId).filter(Boolean))
    const available = rows.filter((row) => !used.has(row.id))
    const messages = thread.messages.map((message) => {
      if (message.serverId) return message
      const index = available.findIndex(
        (row) => row.role === message.role && row.content.trim() === message.content.trim(),
      )
      if (index < 0) return message
      const [row] = available.splice(index, 1)
      return { ...message, serverId: row.id, createdAt: row.created_at }
    })
    return { messages, loaded: true }
  })
}

// ---------------------------------------------------------------------------
// Một lượt chạy
// ---------------------------------------------------------------------------

type StreamCall = (onEvent: (event: AgentEvent) => void, signal: AbortSignal) => Promise<void>

const controllers = new Map<string, AbortController>()
/** Chữ về theo cục; gom lại và nhả mỗi khung hình một lần thay vì mỗi token. */
const pendingText = new Map<string, string>()
const frames = new Map<string, number>()
const adoptListeners = new Set<(from: string, to: string) => void>()
const titleListeners = new Set<(id: string, title: string) => void>()

/** Nghe lúc một cuộc mới nhận id thật, để đổi URL mà không gián đoạn stream. */
export function onAdopt(listener: (from: string, to: string) => void) {
  adoptListeners.add(listener)
  return () => {
    adoptListeners.delete(listener)
  }
}

export function onTitle(listener: (id: string, title: string) => void) {
  titleListeners.add(listener)
  return () => {
    titleListeners.delete(listener)
  }
}

function flushText(key: string) {
  const text = pendingText.get(key)
  frames.delete(key)
  if (!text) return
  pendingText.delete(key)
  updateDraft(key, (draft) => ({ content: draft.content + text }))
}

function queueText(key: string, text: string) {
  pendingText.set(key, (pendingText.get(key) ?? '') + text)
  if (!frames.has(key)) frames.set(key, requestAnimationFrame(() => flushText(key)))
}

/**
 * Cửa duy nhất cho mọi lượt chạy: hỏi mới, lật bài, trả lời làm rõ. Trước đây ba
 * bản sao gần giống nhau, mỗi bản sửa một kiểu.
 */
async function runStream(initialKey: string, call: StreamCall): Promise<void> {
  const ref = { key: initialKey }
  const controller = new AbortController()
  controllers.get(initialKey)?.abort()
  controllers.set(initialKey, controller)
  cancelReflection(initialKey)
  let parked = false

  update(ref.key, (thread) => ({ running: true, error: '', turn: thread.turn.activities.length ? thread.turn : startTurn() }))

  const handle = (event: AgentEvent) => {
    if (event.type === 'run.started' && ref.key === NEW_THREAD) {
      adopt(NEW_THREAD, event.conversation_id)
      controllers.delete(NEW_THREAD)
      controllers.set(event.conversation_id, controller)
      ref.key = event.conversation_id
    }
    const key = ref.key

    update(key, (thread) => ({ turn: reduceTurn(thread.turn, event) }))
    const activities = useChatStore.getState().threads[key]?.turn.activities ?? []
    updateDraft(key, () => ({ activities }))

    switch (event.type) {
      case 'conversation.titled':
        for (const listener of titleListeners) listener(event.conversation_id, event.title)
        break
      case 'draft.discarded':
        pendingText.delete(key)
        updateDraft(key, () => ({ content: '' }))
        break
      case 'message.delta':
        queueText(key, event.content)
        break
      case 'cards.revealed':
        updateDraft(key, () => ({ cards: event.cards }))
        break
      case 'iching.cast':
        updateDraft(key, () => ({ hexagram: event.casting }))
        break
      case 'draw.requested':
        parked = true
        updateDraft(key, () => ({
          status: 'requires-action',
          request: {
            kind: 'draw',
            runId: event.run_id,
            readingId: event.reading_id,
            deck: event.deck,
            deckSize: event.deck_size,
            pickCount: event.pick_count,
            positions: event.positions,
            reason: event.reason,
          },
        }))
        break
      case 'clarify.requested':
        parked = true
        updateDraft(key, () => ({
          status: 'requires-action',
          request: {
            kind: 'clarify',
            runId: event.run_id,
            clarificationId: event.clarification_id,
            question: event.question,
            basedOn: event.based_on,
            options: event.options,
            allowFreeText: event.allow_free_text,
          },
        }))
        break
      case 'message.completed':
        flushText(key)
        updateDraft(key, () => ({ serverId: event.message_id, status: 'complete', request: null }))
        break
      case 'run.error':
        update(key, () => ({ error: event.message }))
        break
    }
  }

  try {
    await call(handle, controller.signal)
  } catch (exception) {
    const message = describe(exception)
    if (message) update(ref.key, () => ({ error: message }))
  } finally {
    const key = ref.key
    if (frames.has(key)) cancelAnimationFrame(frames.get(key)!)
    flushText(key)
    if (controllers.get(key) === controller) controllers.delete(key)
    // Lượt chưa xong mà stream đã đóng (lỗi, mất mạng, bị huỷ): đánh dấu dở dang
    // để giao diện thôi quay vòng, thay vì treo ở "đang suy nghĩ" mãi.
    updateDraft(key, (draft) =>
      draft.status === 'running'
        ? {
            status: 'incomplete',
            request: null,
            // Chỉ báo "đang lắng nghe" không được quay tiếp sau khi lượt đã chết.
            activities: draft.activities.map((activity) =>
              activity.status === 'running' ? { ...activity, status: 'failed' } : activity,
            ),
          }
        : {},
    )
    update(key, (thread) => ({
      running: false,
      turn: parked ? thread.turn : IDLE_TURN,
    }))
    if (!parked && key !== NEW_THREAD) {
      await reconcile(key)
      scheduleReflection(key)
    }
  }
}

/** Câu hỏi đầu tiên ở /chat vừa có id: chuyển nguyên ngăn sang id đó. */
function adopt(from: string, to: string) {
  useChatStore.setState((state) => {
    const { [from]: moving, ...rest } = state.threads
    return { threads: { ...rest, [to]: { ...(moving ?? emptyThread()), loaded: true } } }
  })
  for (const listener of adoptListeners) listener(from, to)
}

const localMessage = (role: ChatMessage['role'], content: string): ChatMessage => ({
  id: crypto.randomUUID(),
  serverId: null,
  role,
  content,
  cards: null,
  hexagram: null,
  createdAt: new Date().toISOString(),
  activities: role === 'assistant' ? startTurn().activities : [],
  status: role === 'assistant' ? 'running' : 'complete',
  request: null,
  rating: null,
})

export async function ask(key: string, question: string): Promise<void> {
  const trimmed = question.split(/\s+/).join(' ').trim()
  const thread = useChatStore.getState().threads[key] ?? EMPTY
  if (isBusy(thread)) return
  if (trimmed.length < 3) {
    update(key, () => ({ error: 'Câu hỏi ngắn quá, viết thêm một chút nhé.' }))
    return
  }
  update(key, (current) => ({
    messages: [...current.messages, localMessage('user', trimmed), localMessage('assistant', '')],
    turn: startTurn(),
  }))
  await runStream(key, (onEvent, signal) =>
    askApi({ conversationId: key === NEW_THREAD ? null : key, question: trimmed }, onEvent, signal),
  )
}

export async function submitCards(key: string, indices: number[]): Promise<void> {
  const request = pendingRequest(useChatStore.getState().threads[key] ?? EMPTY)
  if (request?.kind !== 'draw' || indices.length !== request.pickCount) return
  updateDraft(key, () => ({ status: 'running', request: null }))
  update(key, (thread) => ({ turn: continueTurn(thread.turn, 'Oraclia đang lật bài') }))
  await runStream(key, (onEvent, signal) =>
    selectCardsApi({ runId: request.runId, readingId: request.readingId, indices }, onEvent, signal),
  )
}

export async function answerClarify(key: string, answer: string, skipped = false): Promise<void> {
  const request = pendingRequest(useChatStore.getState().threads[key] ?? EMPTY)
  if (request?.kind !== 'clarify') return
  updateDraft(key, () => ({ status: 'running', request: null }))
  update(key, (thread) => ({ turn: continueTurn(thread.turn, 'Oraclia đang đọc tiếp') }))
  await runStream(key, (onEvent, signal) =>
    answerClarifyApi(
      { runId: request.runId, clarificationId: request.clarificationId, answer, skipped },
      onEvent,
      signal,
    ),
  )
}

/** Dừng lượt đang chạy. Câu trả lời dở dang vẫn ở lại để đọc. */
export function cancel(key: string) {
  controllers.get(key)?.abort()
}

/**
 * Hỏi lại và sửa câu hỏi đều cắt lịch sử từ câu hỏi đó trở đi rồi gửi lại, nên
 * phần trả lời cũ không còn treo dưới một câu hỏi đã đổi.
 */
export async function resend(key: string, messageId: string, question: string): Promise<void> {
  const thread = useChatStore.getState().threads[key]
  if (!thread || isBusy(thread)) return
  const index = thread.messages.findIndex((message) => message.id === messageId)
  if (index < 0) return
  const target = thread.messages[index]
  const removed = thread.messages.slice(index)
  // Cắt trên màn hình ngay khi bấm; đợi server xoá xong mới cắt thì câu trả lời
  // cũ còn treo đó cả nhịp, trông như chưa có gì xảy ra.
  update(key, (current) => ({ messages: current.messages.slice(0, index) }))
  if (target.serverId) {
    try {
      await deleteMessagesFrom(target.serverId)
    } catch (exception) {
      update(key, (current) => ({ messages: [...current.messages, ...removed], error: describe(exception) }))
      return
    }
  }
  await ask(key, question)
}

export function setRating(key: string, serverId: string, rating: Rating) {
  update(key, (thread) => ({
    messages: thread.messages.map((message) =>
      message.serverId === serverId ? { ...message, rating } : message,
    ),
  }))
}

export function clearError(key: string) {
  update(key, () => ({ error: '' }))
}

// ---------------------------------------------------------------------------
// Phản tư nền
// ---------------------------------------------------------------------------

const reflectTimers = new Map<string, ReturnType<typeof setTimeout>>()
const reflectAborts = new Map<string, AbortController>()

export function cancelReflection(key: string) {
  clearTimeout(reflectTimers.get(key))
  reflectTimers.delete(key)
  reflectAborts.get(key)?.abort()
  reflectAborts.delete(key)
}

/**
 * Hẹn một lượt phản tư sau khi người dùng im lặng. Gõ phím dời lịch ra sau chứ
 * không huỷ: soạn dở rồi bỏ đó thì vẫn nên ghi nhớ, chỉ là muộn hơn một chút.
 */
export function scheduleReflection(key: string) {
  if (key === NEW_THREAD) return
  const thread = useChatStore.getState().threads[key]
  if (!thread?.messages.length || isBusy(thread)) return
  cancelReflection(key)
  reflectTimers.set(
    key,
    setTimeout(() => {
      reflectTimers.delete(key)
      const controller = new AbortController()
      reflectAborts.set(key, controller)
      update(key, () => ({ reflecting: 'thinking' }))
      let touched = false
      reflectApi(
        key,
        (event) => {
          if (event.type === 'memory.saved' || event.type === 'history.compacted') touched = true
        },
        controller.signal,
      )
        .catch(() => undefined)
        .finally(() => {
          reflectAborts.delete(key)
          update(key, () => ({ reflecting: touched ? 'saved' : 'idle' }))
          if (touched) setTimeout(() => update(key, () => ({ reflecting: 'idle' })), 4000)
        })
    }, REFLECT_AFTER_MS),
  )
}

function describe(exception: unknown): string {
  if (exception instanceof DOMException && exception.name === 'AbortError') return ''
  return exception instanceof Error ? exception.message : 'Có lỗi xảy ra.'
}
