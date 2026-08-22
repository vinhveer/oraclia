import { useCallback, useEffect, useRef, useState } from 'react'
import {
  answerClarify,
  ask,
  deleteMessagesFrom,
  listMessages,
  reflect,
  selectCards,
  subscribeToConversation,
  type AgentEvent,
  type Casting,
  type DeckKind,
  type DrawnCard,
  type Message,
} from '@db'
import { hasIndicator, IDLE_TURN, reduceTurn, startTurn, type TurnState } from './activity'

export interface PendingDraw {
  runId: string
  readingId: string
  deck: DeckKind
  deckSize: number
  pickCount: number
  positions: string[]
  reason: string
}

export interface PendingClarify {
  runId: string
  clarificationId: string
  question: string
  basedOn: string
  options: string[]
  allowFreeText: boolean
}

export const DRAFT_ID = 'draft'

/** Ngừng gõ bấy lâu thì agent quay lại nghĩ về những gì vừa nói. */
const REFLECT_AFTER_MS = 6000

const emptyDraft = (): Message => ({
  id: DRAFT_ID,
  role: 'assistant',
  content: '',
  cards: null,
  hexagram: null,
  created_at: new Date().toISOString(),
})

/**
 * Sở hữu một cuộc trò chuyện: bản ghi, luồng đang chạy, và điểm dừng nơi agent
 * chờ người dùng chọn bài.
 *
 * Trạng thái "đang làm gì" nằm trọn trong `turn`, do `reduceTurn` sinh ra từ
 * chuỗi sự kiện. Không nơi nào khác được suy đoán điều đó.
 */
export function useChat(
  conversationId: string | null,
  onConversationCreated: (id: string) => void,
  onTitle?: (conversationId: string, title: string) => void,
) {
  const [messages, setMessages] = useState<Message[]>([])
  const [turn, setTurn] = useState<TurnState>(IDLE_TURN)
  const [draw, setDraw] = useState<PendingDraw | null>(null)
  const [clarify, setClarify] = useState<PendingClarify | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [reflecting, setReflecting] = useState<'idle' | 'thinking' | 'saved'>('idle')

  const abort = useRef<AbortController | null>(null)
  const streamingRef = useRef(false)
  /** Cuộc trò chuyện mà lượt hiện tại thuộc về, kể cả khi nó vừa được tạo. */
  const startedIn = useRef<string | null>(null)
  /**
   * Chữ về theo từng cục lớn, có khi cả đoạn một lần. Đệm lại rồi nhả đều tay
   * để bài đọc chảy ra thay vì bụp một phát; nhả nhanh dần khi hàng đợi dài nên
   * không bao giờ tụt lại sau luồng thật.
   */
  const queue = useRef('')
  const drain = useRef<ReturnType<typeof setInterval> | null>(null)
  const reflectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reflectAbort = useRef<AbortController | null>(null)

  const busy =
    draw !== null || clarify !== null || turn.activities.length > 0 || turn.answering

  const cancelReflection = useCallback(() => {
    if (reflectTimer.current) clearTimeout(reflectTimer.current)
    reflectTimer.current = null
    reflectAbort.current?.abort()
    reflectAbort.current = null
    setReflecting('idle')
  }, [])

  /**
   * Hẹn một lượt phản tư sau khi người dùng im lặng. Mọi hoạt động — gõ phím,
   * gửi câu mới, đổi cuộc trò chuyện — đều dời hoặc huỷ lịch này.
   */
  const scheduleReflection = useCallback((target: string) => {
    if (reflectTimer.current) clearTimeout(reflectTimer.current)
    reflectTimer.current = setTimeout(() => {
      const controller = new AbortController()
      reflectAbort.current = controller
      setReflecting('thinking')
      let touched = false
      reflect(
        target,
        (event) => {
          if (event.type === 'memory.saved' || event.type === 'history.compacted') touched = true
        },
        controller.signal,
      )
        .catch(() => undefined)
        .finally(() => {
          reflectAbort.current = null
          setReflecting(touched ? 'saved' : 'idle')
          if (touched) setTimeout(() => setReflecting('idle'), 4000)
        })
    }, REFLECT_AFTER_MS)
  }, [])

  useEffect(() => {
    // Câu hỏi đầu tiên bắt đầu ở /chat. Khi nhận run.started, URL được thay bằng
    // conversation vừa tạo và effect này chạy lại. Đó vẫn là cùng một lượt nên
    // không được xoá draft, hàng đợi token hay trạng thái hoạt động giữa stream.
    const adoptingCurrentRun =
      streamingRef.current && startedIn.current !== null && startedIn.current === conversationId

    cancelReflection()
    if (!adoptingCurrentRun) {
      setTurn(IDLE_TURN)
      setDraw(null)
      setClarify(null)
      setError('')
      queue.current = ''
    }
    if (!conversationId) {
      setMessages([])
      return
    }
    let active = true
    if (!adoptingCurrentRun) {
      setLoading(true)
      listMessages(conversationId)
        .then((rows) => active && setMessages(rows))
        .catch((exception) => active && setError(describe(exception)))
        .finally(() => active && setLoading(false))
    }
    // Tab khác (hoặc một lượt chạy nơi khác) ghi thẳng vào Postgres; soi theo,
    // nhưng không bao giờ trong lúc chính tab này đang stream.
    const unsubscribe = subscribeToConversation(conversationId, (row) => {
      if (streamingRef.current) return
      setMessages((current) =>
        current.some((item) => item.id === row.id)
          ? current
          : [
              ...current,
              {
                id: row.id,
                role: row.role,
                content: row.content,
                cards: row.cards,
                hexagram: row.hexagram,
                created_at: row.created_at,
              },
            ],
      )
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [cancelReflection, conversationId])

  useEffect(
    () => () => {
      abort.current?.abort()
      if (drain.current) clearInterval(drain.current)
    },
    [],
  )

  const patchDraft = useCallback((update: (draft: Message) => Message) => {
    setMessages((current) => current.map((item) => (item.id === DRAFT_ID ? update(item) : item)))
  }, [])

  const startDraining = useCallback(() => {
    if (drain.current) return
    drain.current = setInterval(() => {
      if (!queue.current) {
        clearInterval(drain.current!)
        drain.current = null
        return
      }
      const step = Math.max(2, Math.ceil(queue.current.length / 12))
      const chunk = queue.current.slice(0, step)
      queue.current = queue.current.slice(step)
      patchDraft((item) => ({ ...item, content: item.content + chunk }))
    }, 24)
  }, [patchDraft])

  /** Chờ nhả hết chữ đang đệm trước khi tải lại tin nhắn thật từ DB. */
  const flushQueue = useCallback(
    () =>
      new Promise<void>((resolve) => {
        const started = Date.now()
        const check = setInterval(() => {
          if (!queue.current || Date.now() - started > 4000) {
            clearInterval(check)
            resolve()
          }
        }, 30)
      }),
    [],
  )

  /**
   * Một cửa duy nhất cho mọi sự kiện. Dòng hoạt động do reducer lo; ở đây chỉ
   * còn những việc phải chạm ra ngoài: nội dung tin nhắn, lượt rút bài, tiêu đề.
   */
  const handle = useCallback(
    (event: AgentEvent) => {
      setTurn((current) => reduceTurn(current, event))

      switch (event.type) {
        case 'run.started':
          startedIn.current = event.conversation_id
          if (!conversationId) onConversationCreated(event.conversation_id)
          break
        case 'conversation.titled':
          onTitle?.(event.conversation_id, event.title)
          break
        case 'clarify.requested':
          setClarify({
            runId: event.run_id,
            clarificationId: event.clarification_id,
            question: event.question,
            basedOn: event.based_on,
            options: event.options,
            allowFreeText: event.allow_free_text,
          })
          break
        case 'draw.requested':
          setDraw({
            runId: event.run_id,
            readingId: event.reading_id,
            deck: event.deck,
            deckSize: event.deck_size,
            pickCount: event.pick_count,
            positions: event.positions,
            reason: event.reason,
          })
          break
        case 'cards.revealed':
          patchDraft((item) => ({ ...item, cards: event.cards as DrawnCard[] }))
          break
        case 'iching.cast':
          patchDraft((item) => ({ ...item, hexagram: event.casting as Casting }))
          break
        case 'message.delta':
          queue.current += event.content
          startDraining()
          break
        case 'message.completed':
          setMessages((current) =>
            current.map((item) => (item.id === DRAFT_ID ? { ...item, id: event.message_id } : item)),
          )
          break
        case 'run.error':
          setError(event.message)
          break
      }
    },
    [conversationId, onConversationCreated, onTitle, patchDraft, startDraining],
  )

  /** Khép lại một lượt: xả nốt chữ, tải lại bản thật, rồi hẹn lượt phản tư. */
  const finishTurn = useCallback(
    async (parked: boolean) => {
      streamingRef.current = false
      // Lượt đỗ lại chờ chọn bài thì chưa xong: giữ nguyên dòng hoạt động.
      if (parked) return
      setTurn(IDLE_TURN)
      if (!startedIn.current) return
      await flushQueue()
      try {
        setMessages(await listMessages(startedIn.current))
      } catch {
        // Giữ nguyên bản tại chỗ nếu không tải lại được.
      }
      scheduleReflection(startedIn.current)
    },
    [flushQueue, scheduleReflection],
  )

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (trimmed.length < 3 || busy) return

      cancelReflection()
      queue.current = ''
      const controller = new AbortController()
      abort.current = controller
      streamingRef.current = true
      startedIn.current = conversationId
      setError('')
      setTurn(startTurn())
      setMessages((current) => [
        ...current,
        {
          id: `local-${Date.now()}`,
          role: 'user',
          content: trimmed,
          cards: null,
          hexagram: null,
          created_at: new Date().toISOString(),
        },
        emptyDraft(),
      ])

      let parked = false
      try {
        await ask(
          { conversationId, question: trimmed },
          (event) => {
            if (event.type === 'draw.requested' || event.type === 'clarify.requested') {
              parked = true
            }
            handle(event)
          },
          controller.signal,
        )
      } catch (exception) {
        setError(describe(exception))
      } finally {
        await finishTurn(parked)
      }
    },
    [busy, cancelReflection, conversationId, finishTurn, handle],
  )

  const submit = useCallback(
    async (indices: number[]) => {
      if (!draw || indices.length !== draw.pickCount) return
      const pending = draw
      const controller = new AbortController()
      abort.current = controller
      streamingRef.current = true
      queue.current = ''
      setDraw(null)
      setError('')
      // Chỉ báo phải có ngay từ lúc bấm, không đợi server trả sự kiện đầu tiên.
      setTurn(startTurn())
      let parked = false
      try {
        await selectCards(
          { runId: pending.runId, readingId: pending.readingId, indices },
          (event) => {
            if (event.type === 'draw.requested' || event.type === 'clarify.requested') {
              parked = true
            }
            handle(event)
          },
          controller.signal,
        )
      } catch (exception) {
        setError(describe(exception))
      } finally {
        await finishTurn(parked)
      }
    },
    [draw, finishTurn, handle],
  )

  /** Trả lời câu hỏi làm rõ; `skipped` là khi người dùng muốn bói luôn. */
  const respond = useCallback(
    async (answer: string, skipped = false) => {
      if (!clarify) return
      const pending = clarify
      const controller = new AbortController()
      abort.current = controller
      streamingRef.current = true
      queue.current = ''
      setClarify(null)
      setError('')
      setTurn(startTurn())
      let parked = false
      try {
        await answerClarify(
          {
            runId: pending.runId,
            clarificationId: pending.clarificationId,
            answer,
            skipped,
          },
          (event) => {
            if (event.type === 'draw.requested' || event.type === 'clarify.requested') {
              parked = true
            }
            handle(event)
          },
          controller.signal,
        )
      } catch (exception) {
        setError(describe(exception))
      } finally {
        await finishTurn(parked)
      }
    },
    [clarify, finishTurn, handle],
  )

  const cancelDraw = useCallback(() => {
    // Để run đỗ lại cũng không sao: hàng reading vẫn ở trạng thái chờ, người
    // dùng chỉ việc hỏi lại.
    setDraw(null)
    setTurn(IDLE_TURN)
    setMessages((current) => current.filter((item) => item.id !== DRAFT_ID))
  }, [])

  /**
   * Hỏi lại và sửa câu hỏi đều cắt lịch sử từ tin nhắn đó trở đi rồi gửi lại,
   * nên phần trả lời cũ không còn treo lơ lửng dưới một câu hỏi đã đổi.
   */
  const replaceFrom = useCallback(
    async (from: Message, question: string) => {
      if (!conversationId || busy) return
      const trimmed = question.trim()
      if (trimmed.length < 3) return
      try {
        await deleteMessagesFrom(conversationId, from.created_at)
      } catch (exception) {
        setError(describe(exception))
        return
      }
      setMessages((current) => current.filter((item) => item.created_at < from.created_at))
      await send(trimmed)
    },
    [busy, conversationId, send],
  )

  // Bất biến của màn hình, kiểm ngay tại nguồn thay vì đợi người dùng báo treo.
  useEffect(() => {
    if (import.meta.env.DEV && streamingRef.current && !hasIndicator(turn)) {
      console.warn('[useChat] lượt đang chạy mà không có chỉ báo nào', turn)
    }
  }, [turn])

  return {
    messages,
    turn,
    busy,
    draw,
    clarify,
    respond,
    error,
    loading,
    reflecting,
    send,
    submit,
    cancelDraw,
    setError,
    retry: (from: Message) => replaceFrom(from, from.content),
    edit: replaceFrom,
    /**
     * Người dùng đang gõ: dời lượt phản tư ra sau, chứ không huỷ — soạn dở rồi
     * bỏ đó thì vẫn nên ghi nhớ, chỉ là muộn hơn một chút.
     */
    noteActivity: () => {
      if (busy) return
      if (startedIn.current) scheduleReflection(startedIn.current)
      else cancelReflection()
    },
  }
}

function describe(exception: unknown): string {
  if (exception instanceof DOMException && exception.name === 'AbortError') return ''
  return exception instanceof Error ? exception.message : 'Có lỗi xảy ra.'
}
