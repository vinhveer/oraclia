import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ask,
  type Casting,
  deleteMessagesFrom,
  listMessages,
  reflect,
  selectCards,
  subscribeToConversation,
  type AgentEvent,
  type DrawnCard,
  type Message,
} from '@db'

export interface PendingDraw {
  runId: string
  readingId: string
  deckSize: number
  pickCount: number
  positions: string[]
  reason: string
}

export interface ToolActivity {
  callId: string
  name: string
  status: 'running' | 'completed' | 'failed'
  detail: string
}

export type ChatPhase = 'idle' | 'thinking' | 'awaiting_cards' | 'interpreting' | 'reading'

/** Ngừng gõ bấy lâu thì agent quay lại nghĩ về những gì vừa nói. */
const REFLECT_AFTER_MS = 6000

export const DRAFT_ID = 'draft'

/**
 * Owns one conversation: the transcript, the live stream, and the suspend point
 * where the agent waits for the user to pick cards.
 */
export function useChat(
  conversationId: string | null,
  onConversationCreated: (id: string) => void,
  onTitle?: (conversationId: string, title: string) => void,
) {
  const [messages, setMessages] = useState<Message[]>([])
  const [phase, setPhase] = useState<ChatPhase>('idle')
  const [tools, setTools] = useState<ToolActivity[]>([])
  const [draw, setDraw] = useState<PendingDraw | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const streamingRef = useRef(false)
  /** Cuộc trò chuyện mà lượt hiện tại thuộc về, kể cả khi nó vừa được tạo. */
  const startedIn = useRef<string | null>(null)
  /**
   * Chữ về theo từng cục lớn, có khi cả đoạn một lần. Đệm lại rồi nhả đều tay
   * để bài đọc chảy ra thay vì bụp một phát — nhả nhanh dần khi hàng đợi dài
   * nên không bao giờ tụt lại sau luồng thật.
   */
  const queue = useRef('')
  const drain = useRef<ReturnType<typeof setInterval> | null>(null)
  const [thinking, setThinking] = useState('')
  const reflectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reflectAbort = useRef<AbortController | null>(null)
  const [reflecting, setReflecting] = useState<'idle' | 'thinking' | 'saved'>('idle')

  const cancelReflection = useCallback(() => {
    if (reflectTimer.current) clearTimeout(reflectTimer.current)
    reflectTimer.current = null
    reflectAbort.current?.abort()
    reflectAbort.current = null
    setReflecting('idle')
  }, [])

  /**
   * Hẹn một lượt phản tư sau khi người dùng im lặng. Mọi hoạt động — gõ phím,
   * gửi câu mới, đổi cuộc trò chuyện — đều huỷ lịch này.
   */
  const scheduleReflection = useCallback(
    (target: string) => {
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
    },
    [],
  )

  useEffect(() => cancelReflection, [cancelReflection])


  useEffect(() => {
    cancelReflection()
    setDraw(null)
    setTools([])
    setError('')
    setPhase('idle')
    if (!conversationId) {
      setMessages([])
      return
    }
    let active = true
    setLoading(true)
    listMessages(conversationId)
      .then((rows) => active && setMessages(rows))
      .catch((exception) => active && setError(message(exception)))
      .finally(() => active && setLoading(false))
    // Another tab (or a resumed run) writes straight to Postgres; mirror it here,
    // but never while this tab is the one streaming.
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

  useEffect(() => () => abort.current?.abort(), [])

  const patchDraft = useCallback((update: (draft: Message) => Message) => {
    setMessages((current) =>
      current.map((item) => (item.id === DRAFT_ID ? update(item) : item)),
    )
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
        const check = setInterval(() => {
          if (!queue.current) {
            clearInterval(check)
            resolve()
          }
        }, 30)
        setTimeout(() => {
          clearInterval(check)
          resolve()
        }, 4000)
      }),
    [],
  )

  useEffect(
    () => () => {
      if (drain.current) clearInterval(drain.current)
    },
    [],
  )

  const handle = useCallback(
    (event: AgentEvent) => {
      switch (event.type) {
        case 'run.started':
          startedIn.current = event.conversation_id
          if (!conversationId) onConversationCreated(event.conversation_id)
          break
        case 'tool.started':
          setPhase('thinking')
          setTools((current) => [
            ...current,
            {
              callId: event.call_id,
              name: event.name,
              status: 'running',
              detail: describeTool(event.name, event.arguments),
            },
          ])
          break
        case 'tool.completed':
          // Trừ lượt rút bài — chỗ đó còn phải chờ người dùng chọn.
          setPhase((current) => (current === 'awaiting_cards' ? current : 'interpreting'))
          setTools((current) =>
            current.map((tool) =>
              tool.callId === event.call_id
                ? { ...tool, status: 'completed', detail: event.summary || tool.detail }
                : tool,
            ),
          )
          break
        case 'tool.failed':
          setTools((current) =>
            current.map((tool) =>
              tool.callId === event.call_id
                ? { ...tool, status: 'failed', detail: event.message }
                : tool,
            ),
          )
          break
        case 'draw.requested':
          setDraw({
            runId: event.run_id,
            readingId: event.reading_id,
            deckSize: event.deck_size,
            pickCount: event.pick_count,
            positions: event.positions,
            reason: event.reason,
          })
          setPhase('awaiting_cards')
          break
        case 'cards.revealed':
          patchDraft((item) => ({ ...item, cards: event.cards as DrawnCard[] }))
          setPhase('interpreting')
          break
        case 'iching.cast':
          patchDraft((item) => ({ ...item, hexagram: event.casting as Casting }))
          setPhase('interpreting')
          break
        case 'thinking.delta':
          // Giữ trọn để người dùng bung ra đọc được; phần hiển thị mặc định chỉ
          // lấy đoạn cuối.
          setThinking((current) => (current + event.content).slice(-8000))
          break
        case 'message.delta':
          setPhase('reading')
          setThinking('')
          queue.current += event.content
          startDraining()
          break
        case 'message.completed':
          setMessages((current) =>
            current.map((item) => (item.id === DRAFT_ID ? { ...item, id: event.message_id } : item)),
          )
          break
        case 'conversation.titled':
          onTitle?.(event.conversation_id, event.title)
          break
        case 'run.error':
          setError(event.message)
          break
      }
    },
    [conversationId, onConversationCreated, onTitle, patchDraft, startDraining],
  )

  const reload = useCallback(async (target: string) => {
    try {
      setMessages(await listMessages(target))
    } catch {
      // Giữ nguyên bản tại chỗ nếu không tải lại được.
    }
  }, [])

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (trimmed.length < 3 || phase !== 'idle') return
      cancelReflection()
      setThinking('')
      queue.current = ''
      const controller = new AbortController()
      abort.current = controller
      streamingRef.current = true
      setError('')
      setTools([])
      setPhase('thinking')
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
        {
          id: DRAFT_ID,
          role: 'assistant',
          content: '',
          cards: null,
          hexagram: null,
          created_at: new Date().toISOString(),
        },
      ])
      try {
        startedIn.current = conversationId
        await ask({ conversationId, question: trimmed }, handle, controller.signal)
      } catch (exception) {
        setError(message(exception))
      } finally {
        streamingRef.current = false
        let parked = false
        setPhase((current) => {
          parked = current === 'awaiting_cards'
          return parked ? current : 'idle'
        })
        setThinking('')
        if (!parked && startedIn.current) {
          await flushQueue()
          await reload(startedIn.current)
          scheduleReflection(startedIn.current)
        }
      }
    },
    [cancelReflection, conversationId, flushQueue, handle, phase, reload, scheduleReflection],
  )

  const submit = useCallback(
    async (indices: number[]) => {
      if (!draw || indices.length !== draw.pickCount) return
      const controller = new AbortController()
      abort.current = controller
      streamingRef.current = true
      const pending = draw
      setDraw(null)
      setPhase('reading')
      setError('')
      try {
        await selectCards(
          { runId: pending.runId, readingId: pending.readingId, indices },
          handle,
          controller.signal,
        )
      } catch (exception) {
        setError(message(exception))
      } finally {
        streamingRef.current = false
        setPhase('idle')
        setThinking('')
        if (startedIn.current) {
          await flushQueue()
          await reload(startedIn.current)
          scheduleReflection(startedIn.current)
        }
      }
    },
    [draw, flushQueue, handle, reload, scheduleReflection],
  )

  const cancelDraw = useCallback(() => {
    // Leaving the run parked is fine: the reading row stays pending and the
    // placeholder disappears, so the user can simply ask again.
    setDraw(null)
    setPhase('idle')
    setMessages((current) => current.filter((item) => item.id !== DRAFT_ID))
  }, [])

  /**
   * Hỏi lại và sửa câu hỏi đều cắt lịch sử từ tin nhắn đó trở đi rồi gửi lại,
   * nên phần trả lời cũ không còn treo lơ lửng dưới một câu hỏi đã đổi.
   */
  const replaceFrom = useCallback(
    async (from: Message, question: string) => {
      if (!conversationId || phase !== 'idle') return
      const trimmed = question.trim()
      if (trimmed.length < 3) return
      try {
        await deleteMessagesFrom(conversationId, from.created_at)
      } catch (exception) {
        setError(message(exception))
        return
      }
      setMessages((current) =>
        current.filter((item) => item.created_at < from.created_at),
      )
      await send(trimmed)
    },
    [conversationId, phase, send],
  )

  return {
    messages,
    phase,
    tools,
    thinking,
    reflecting,
    /**
     * Người dùng đang gõ: dời lượt phản tư ra sau, chứ không huỷ — soạn dở rồi
     * bỏ đó thì vẫn nên ghi nhớ, chỉ là muộn hơn một chút.
     */
    noteActivity: () => {
      if (phase !== 'idle') return
      if (startedIn.current) scheduleReflection(startedIn.current)
      else cancelReflection()
    },
    draw,
    error,
    loading,
    send,
    submit,
    cancelDraw,
    setError,
    retry: (from: Message) => replaceFrom(from, from.content),
    edit: replaceFrom,
  }
}

function describeTool(name: string, args: Record<string, unknown>): string {
  if (name === 'draw_cards') {
    const positions = Array.isArray(args.positions) ? args.positions.length : 0
    return positions ? `Chuẩn bị ${positions} lá` : 'Chuẩn bị lượt rút bài'
  }
  if (name === 'cast_iching') return 'Gieo quẻ ba đồng xu'
  if (name === 'lookup_cards') return 'Tra nghĩa tham khảo'
  return 'Đang chạy'
}

function message(exception: unknown): string {
  if (exception instanceof DOMException && exception.name === 'AbortError') return ''
  return exception instanceof Error ? exception.message : 'Có lỗi xảy ra.'
}
