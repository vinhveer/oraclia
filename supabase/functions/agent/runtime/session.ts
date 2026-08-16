import type { Db } from '../../_shared/db.ts'
import type { ModelMessage } from '../../_shared/types.ts'
import { AgentError } from './errors.ts'
import { Agent, type AgentRun } from './agent.ts'
import { IChingCaster } from './iching/caster.ts'
import { memo } from './lazy.ts'
import { createModelAdapter, type ModelAdapter } from './model/factory.ts'
import { PromptBuilder } from './prompts/builder.ts'
import { CatalogRepository } from './repositories/catalog.ts'
import { MemoryRepository } from './repositories/memories.ts'
import { ClarificationRepository } from './repositories/clarifications.ts'
import { ConversationRepository } from './repositories/conversations.ts'
import { PromptRepository } from './repositories/prompts.ts'
import { CastingRepository, ReadingRepository } from './repositories/readings.ts'
import { RunRepository } from './repositories/runs.ts'
import { ToolCallRepository } from './repositories/tool-calls.ts'
import { StreamController } from './stream.ts'
import { provisionalTitle, Titler } from './titler.ts'
import { Deck } from './tarot/deck.ts'
import { PlayingDeck } from './tarot/playing-deck.ts'
import { AskUserTool } from './tools/ask-user.ts'
import { CastIChingTool } from './tools/cast-iching.ts'
import { CompactHistoryTool } from './tools/compact-history.ts'
import { RememberTool } from './tools/remember.ts'
import { DrawCardsTool } from './tools/draw-cards.ts'
import { DrawPlayingCardsTool } from './tools/draw-playing-cards.ts'
import { LookupCardsTool } from './tools/lookup-cards.ts'
import { ToolRegistry } from './tools/registry.ts'
import { PromptBuilder as Builder } from './prompts/builder.ts'

const RUNS_PER_HOUR = Number(Deno.env.get('AGENT_RUNS_PER_HOUR') ?? '60')

/**
 * Lượt phản tư bình thường do client hẹn sau khi người dùng ngừng gõ. Ai hỏi dồn
 * liên tục thì lịch đó bị huỷ mãi, nên cần một lưới an toàn — nhưng chạy nền,
 * không bao giờ nằm chắn giữa câu hỏi và câu trả lời.
 */
const REFLECT_SAFETY_NET = 30

/**
 * Gom mọi thứ một request cần: repository, adapter, tool. Hai lối vào — hỏi mới
 * và chọn bài xong — đều dựng cùng một bộ rồi giao cho `Agent`.
 */
export class AgentSession {
  readonly conversations: ConversationRepository
  readonly runs: RunRepository
  readonly readings: ReadingRepository
  readonly castings: CastingRepository
  readonly catalog: CatalogRepository
  readonly prompts: PromptRepository
  readonly toolCalls: ToolCallRepository
  readonly memories: MemoryRepository
  readonly clarifications: ClarificationRepository
  readonly adapter: ModelAdapter

  constructor(
    private readonly db: Db,
    serviceDb: Db,
    private readonly userId: string,
  ) {
    this.conversations = new ConversationRepository(db)
    this.runs = new RunRepository(db)
    this.readings = new ReadingRepository(db, serviceDb)
    this.castings = new CastingRepository(db)
    this.catalog = new CatalogRepository(db)
    this.prompts = new PromptRepository(db)
    this.toolCalls = new ToolCallRepository(db)
    this.memories = new MemoryRepository(db)
    this.clarifications = new ClarificationRepository(db)
    this.adapter = createModelAdapter()
  }

  async enforceRateLimit(): Promise<void> {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    if ((await this.runs.countSince(this.userId, since)) >= RUNS_PER_HOUR) {
      throw new AgentError(
        429,
        'Bạn đã hỏi khá nhiều trong một giờ qua. Hãy nghỉ một chút rồi quay lại.',
      )
    }
  }

  /** Câu hỏi mới: tạo run, dựng transcript mở đầu. */
  async start(payload: Record<string, unknown>, stream: StreamController) {
    const question = String(payload.question ?? '').split(/\s+/).join(' ').trim()
    if (question.length < 3) throw new AgentError(422, 'Câu hỏi quá ngắn.')
    if (question.length > 1000) throw new AgentError(422, 'Câu hỏi quá dài.')

    const conversationId = await this.conversations.ensure(
      this.userId,
      typeof payload.conversation_id === 'string' ? payload.conversation_id : null,
    )

    const [state, prompt, settings, memories, asked, uncompacted] = await Promise.all([
      this.conversations.state(conversationId),
      this.prompts.active('reader'),
      this.prompts.userSettings(),
      this.memories.list(40),
      this.clarifications.recentQuestions(8),
      this.conversations.uncompactedCount(conversationId),
    ])

    await this.conversations.addMessage(conversationId, this.userId, 'user', question)

    // Tiêu đề tạm cắt từ chính câu hỏi, hiện ngay lập tức; model thay bằng bản
    // gọn hơn khi nó viết xong.
    const titleState = await this.conversations.titleState(conversationId)
    if (!titleState?.title_generated) {
      const provisional = provisionalTitle(question)
      await this.conversations.rename(conversationId, provisional)
      stream.emit({
        type: 'conversation.titled',
        conversation_id: conversationId,
        title: provisional,
      })
    }

    // Đặt tên chạy song song với vòng lặp chính. Chờ nó xong mới bắt đầu đọc bài
    // khiến người hỏi ngồi nhìn màn hình trống gần chín giây — model có reasoning
    // nghĩ khá lâu cho cả một câu tiêu đề. Nó vẫn kịp về trước khi câu trả lời
    // bắt đầu chảy, nên sidebar không thấy khác gì.
    new Titler(this.conversations, this.adapter)
      .ensureTitle(conversationId, question)
      .then((title) => {
        if (title) {
          stream.emit({ type: 'conversation.titled', conversation_id: conversationId, title })
        }
      })
      .catch(() => undefined)

    const builder = new PromptBuilder(
      prompt.body,
      settings,
      memories.map((row) => row.content),
      asked,
    )
    const messages = builder.runMessages(state.summary, state.recent, question)
    const runId = await this.runs.create({
      conversationId,
      userId: this.userId,
      model: this.adapter.name,
      promptVersion: prompt.version,
      question,
      state: messages,
    })

    if (uncompacted > REFLECT_SAFETY_NET) this.reflectInBackground(conversationId)

    return {
      runId,
      conversationId,
      messages,
      agentRun: this.buildRun({ runId, conversationId, question, stream }),
    }
  }

  /** Người hỏi đã chọn bài: lật bài và nối lại đúng transcript đang đỗ. */
  async resume(payload: Record<string, unknown>, stream: StreamController) {
    const runId = String(payload.run_id ?? '')
    const readingId = String(payload.reading_id ?? '')
    const indices = Array.isArray(payload.indices) ? payload.indices.map(Number) : []

    const run = await this.runs.get(runId)
    if (!run || run.status !== 'awaiting_input') {
      throw new AgentError(409, 'Lượt rút bài đã hết hạn.')
    }

    // Quyền sở hữu do RLS chứng minh ở bước này; chỉ sau đó mới lấy bộ bài úp
    // bằng service role, danh tính duy nhất được phép nhìn thấy nó.
    const reading = await this.readings.pending(readingId, runId)
    if (!reading || reading.status !== 'pending') {
      throw new AgentError(409, 'Lượt rút bài đã hết hạn.')
    }
    const deckOrder = await this.readings.deck(reading.id)
    if (!deckOrder.length) throw new AgentError(409, 'Bộ bài của lượt này không còn khả dụng.')

    // Lật đúng bộ đã xáo lúc đầu; bảng quẻ vẫn để lười.
    const isPlaying = reading.deck === 'playing'
    const cards = isPlaying ? undefined : await this.catalog.cards()

    let revealed
    try {
      const deck = isPlaying
        ? new PlayingDeck(await this.catalog.playingCards())
        : new Deck(cards!)
      revealed = deck.reveal(deckOrder, indices, reading.positions)
    } catch (exception) {
      throw new AgentError(
        422,
        exception instanceof Error ? exception.message : 'Lựa chọn không hợp lệ.',
      )
    }
    await this.readings.markRevealed(reading.id, revealed)

    // Nối lại đúng lời gọi đã mở lượt rút này, theo id đã lưu cùng hàng reading.
    // Dò theo tên công cụ thì mỗi công cụ ngắt mới lại phải sửa chỗ này.
    const state = run.state as ModelMessage[]
    const openCalls = [...state]
      .reverse()
      .find((message) => message.role === 'assistant' && message.tool_calls?.length)?.tool_calls
    const pendingCall =
      openCalls?.find((call) => call.id === reading.tool_call_id) ??
      // Hàng cũ tạo trước khi có cột này thì lấy lời gọi rút bài gần nhất.
      openCalls?.find((call) => call.function.name.startsWith('draw_'))
    if (!pendingCall) throw new AgentError(409, 'Không tìm thấy lượt rút bài đang chờ.')

    state.push({
      role: 'tool',
      tool_call_id: pendingCall.id,
      content: PromptBuilder.drawResult(run.question, revealed),
    })
    await this.runs.setStatus(run.id, 'running')

    return {
      runId: run.id,
      conversationId: run.conversation_id,
      cards: revealed,
      messages: state,
      agentRun: this.buildRun({
        runId: run.id,
        conversationId: run.conversation_id,
        question: run.question,
        stream,
        revealed,
        cards,
      }),
    }
  }

  /**
   * Lượt phản tư, gọi khi người dùng ngừng gõ một lúc. Agent đọc lại đoạn vừa
   * nói và tự quyết định nhớ gì / cô đọng gì bằng tool — thay cho ngưỡng "quá
   * 12 tin nhắn thì tóm tắt" cứng nhắc trước đây.
   */
  async reflect(payload: Record<string, unknown>, stream: StreamController) {
    const conversationId = String(payload.conversation_id ?? '')
    if (!conversationId) throw new AgentError(422, 'Thiếu cuộc trò chuyện.')

    const marker = await this.conversations.reflectionMarker(conversationId)
    if (!marker) throw new AgentError(404, 'Không tìm thấy cuộc trò chuyện.')

    // Không có gì mới kể từ lượt phản tư trước thì thôi, khỏi tốn một lượt model.
    const newest = await this.conversations.newestMessageAt(conversationId)
    if (!newest || (marker.reflected_at && newest <= marker.reflected_at)) return null

    const summaryMarker = await this.conversations.summaryMarker(conversationId)
    const [prompt, memories, turns, pending] = await Promise.all([
      this.prompts.active('reflector'),
      this.memories.list(40),
      this.conversations.recentTurns(conversationId, 16),
      this.conversations.pendingSince(conversationId, summaryMarker?.compacted_until ?? null),
    ])
    if (turns.length < 2) return null

    const messages = Builder.reflectMessages(
      prompt.body,
      marker.context_summary ?? '',
      memories.map((row) => row.content),
      turns,
      pending.length,
    )

    const runId = await this.runs.create({
      conversationId,
      userId: this.userId,
      model: this.adapter.name,
      promptVersion: `reflect:${prompt.version}`,
      question: '(reflect)',
      state: messages,
    })

    const registry = new ToolRegistry(
      [new RememberTool(), new CompactHistoryTool()],
      this.toolCalls,
    )
    const agent = new Agent({
      adapter: this.adapter,
      registry,
      runs: this.runs,
      conversations: this.conversations,
      stream,
    })

    await this.conversations.markReflected(conversationId)

    return {
      runId,
      conversationId,
      messages,
      agentRun: {
        agent,
        run: {
          runId,
          conversationId,
          userId: this.userId,
          cards: null,
          persistMessage: false,
          toolContext: {
            callId: '',
            userId: this.userId,
            conversationId,
            runId,
            question: '(reflect)',
            // Lượt phản tư không đụng tới bài hay quẻ.
            deck: memo(async () => new Deck([])),
            playingDeck: memo(async () => new PlayingDeck([])),
            caster: memo(async () => new IChingCaster([])),
            catalog: this.catalog,
            readings: this.readings,
            castings: this.castings,
            memories: this.memories,
            clarifications: this.clarifications,
            conversations: this.conversations,
            emit: (event) => stream.emit(event),
          },
        },
      },
    }
  }

  /**
   * Người hỏi vừa trả lời câu làm rõ: nối câu trả lời vào đúng tool call đang
   * mở rồi cho run chạy tiếp — cùng khuôn với lượt lật bài.
   */
  async answerClarification(payload: Record<string, unknown>, stream: StreamController) {
    const runId = String(payload.run_id ?? '')
    const clarificationId = String(payload.clarification_id ?? '')
    const skipped = payload.skipped === true
    const answer = String(payload.answer ?? '').split(/\s+/).join(' ').trim().slice(0, 500)
    if (!skipped && !answer) throw new AgentError(422, 'Chưa có câu trả lời.')

    const run = await this.runs.get(runId)
    if (!run || run.status !== 'awaiting_input') {
      throw new AgentError(409, 'Câu hỏi này đã hết hạn.')
    }
    const pending = await this.clarifications.pending(clarificationId, runId)
    if (!pending || pending.status !== 'pending') {
      throw new AgentError(409, 'Câu hỏi này đã được trả lời.')
    }

    await this.clarifications.answer(clarificationId, answer, skipped)

    const state = run.state as ModelMessage[]
    const call = [...state]
      .reverse()
      .find((message) => message.role === 'assistant' && message.tool_calls?.length)
      ?.tool_calls?.find((item) => item.function.name === 'ask_user')
    if (!call) throw new AgentError(409, 'Không tìm thấy câu hỏi đang chờ.')

    // Nhắc ngay tại chỗ thay vì trông vào prompt tĩnh: model đọc tool result sát
    // lúc quyết định, nên chỉ dẫn đặt ở đây mới được nghe. Dặn trong prompt dài
    // 5000 chữ thì nó hỏi một câu rồi đọc luôn.
    const asked = await this.clarifications.countForRun(run.id)
    const nudge = skipped
      ? 'Người hỏi bỏ qua câu này. Đừng hỏi nữa, viết bài đọc ngay với những gì đang có.'
      : asked >= 3
        ? 'Đã hỏi đủ ba câu. Không hỏi thêm. Viết bài đọc đầy đủ ngay bây giờ.'
        : `Đây là câu làm rõ thứ ${asked} của lượt này (trần là 3, không phải chỉ tiêu). ` +
          'Chỉ hỏi tiếp khi còn một mấu chốt THẬT khiến bài đọc sẽ khác đi — người nào ' +
          'dính vào, điều gì đang giấu, quyết định nào đang treo, mọi thứ đổi từ khi nào ' +
          '— và họ phải tự trả lời được. Không còn gì như thế thì viết bài đọc ngay, ' +
          'đừng hỏi thêm cho có.'

    state.push({
      role: 'tool',
      tool_call_id: call.id,
      content: skipped ? nudge : `Người hỏi trả lời: ${answer}\n\n(${nudge})`,
    })
    await this.runs.setStatus(run.id, 'running')

    // Bài và quẻ đã ra ở lượt trước của chính run này; không mang theo thì tin
    // nhắn cuối lưu ra sẽ trống trơn dù trên màn hình vẫn thấy.
    const [revealed, casting] = await Promise.all([
      this.readings.latestRevealed(run.id),
      this.castings.latest(run.id),
    ])
    const built = this.buildRun({
      runId: run.id,
      conversationId: run.conversation_id,
      question: run.question,
      stream,
      revealed: revealed ?? undefined,
    })
    built.run.casting = casting

    return {
      runId: run.id,
      conversationId: run.conversation_id,
      messages: state,
      agentRun: built,
    }
  }

  /**
   * Chạy lượt phản tư trên một stream riêng: dùng chung stream với lượt chính
   * thì chữ của nó sẽ chảy lẫn vào câu trả lời người dùng đang đọc.
   */
  private reflectInBackground(conversationId: string): void {
    const silent = new StreamController()
    const task = this.reflect({ conversation_id: conversationId }, silent)
      .then((reflection) =>
        reflection?.agentRun.agent.run(reflection.agentRun.run, reflection.messages),
      )
      .catch(() => undefined)
      .finally(() => silent.close())

    // Worker bị dừng ngay khi response chính đóng, mà lượt phản tư còn chạy lâu
    // hơn câu trả lời; không giữ lại thì nó chết giữa chừng mà không báo gì.
    const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })
      .EdgeRuntime
    runtime?.waitUntil?.(task)
  }

  private buildRun(input: {
    runId: string
    conversationId: string
    question: string
    stream: StreamController
    revealed?: Awaited<ReturnType<Deck['reveal']>>
    /** Đã nạp sẵn ở lượt lật bài; các lượt khác để tool tự nạp khi cần. */
    cards?: Awaited<ReturnType<CatalogRepository['cards']>>
  }): { agent: Agent; run: AgentRun } {
    const registry = new ToolRegistry(
      [
        new AskUserTool(),
        new DrawCardsTool(),
        new DrawPlayingCardsTool(),
        new LookupCardsTool(),
        new CastIChingTool(),
      ],
      this.toolCalls,
    )

    const agent = new Agent({
      adapter: this.adapter,
      registry,
      runs: this.runs,
      conversations: this.conversations,
      stream: input.stream,
    })

    const run: AgentRun = {
      runId: input.runId,
      conversationId: input.conversationId,
      userId: this.userId,
      cards: input.revealed ?? null,
      toolContext: {
        callId: '',
        userId: this.userId,
        conversationId: input.conversationId,
        runId: input.runId,
        question: input.question,
        // Nạp lười: 78 lá và 64 quẻ là hai truy vấn nặng nhất, mà phần lớn lượt
        // chỉ trò chuyện chứ không rút bài. Nạp sẵn là bắt mọi câu hỏi trả giá
        // cho khả năng có thể cần tới.
        deck: memo(async () => new Deck(input.cards ?? (await this.catalog.cards()))),
        playingDeck: memo(async () => new PlayingDeck(await this.catalog.playingCards())),
        caster: memo(async () => new IChingCaster(await this.catalog.hexagrams())),
        catalog: this.catalog,
        readings: this.readings,
        castings: this.castings,
        memories: this.memories,
        clarifications: this.clarifications,
        conversations: this.conversations,
        emit: (event) => input.stream.emit(event),
      },
    }

    return { agent, run }
  }
}
