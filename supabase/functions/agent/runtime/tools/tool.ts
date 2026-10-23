import type { AgentEvent, Casting, ToolDefinition } from '../../../_shared/types.ts'
import type { Deck } from '../tarot/deck.ts'
import type { PlayingDeck } from '../tarot/playing-deck.ts'
import type { IChingCaster } from '../iching/caster.ts'
import type { Lazy } from '../lazy.ts'
import type { CatalogRepository } from '../repositories/catalog.ts'
import type { CastingRepository, ReadingRepository } from '../repositories/readings.ts'
import type { MemoryRepository } from '../repositories/memories.ts'
import type { ClarificationRepository } from '../repositories/clarifications.ts'
import type { ConversationRepository } from '../repositories/conversations.ts'
import type { KnowledgeRepository } from '../repositories/knowledge.ts'

/**
 * Tool hoặc trả về kết quả để vòng lặp đưa thẳng lại cho model, hoặc **ngắt**:
 * run đỗ ở `awaiting_input` cho tới khi người dùng thao tác. Hiện chỉ có lượt
 * chọn bài là ngắt, nhưng hình dạng này dùng chung cho mọi tool tương lai.
 */
export type ToolOutcome =
  | { kind: 'result'; content: string; summary: string }
  | { kind: 'interrupt'; summary: string }

export interface ToolContext {
  /** Id của chính lời gọi này; tool ngắt cần nó để lượt sau nối lại đúng chỗ. */
  callId: string
  userId: string
  conversationId: string
  runId: string
  question: string
  deck: Lazy<Deck>
  playingDeck: Lazy<PlayingDeck>
  caster: Lazy<IChingCaster>
  catalog: CatalogRepository
  readings: ReadingRepository
  castings: CastingRepository
  memories: MemoryRepository
  clarifications: ClarificationRepository
  conversations: ConversationRepository
  knowledge: KnowledgeRepository
  emit: (event: AgentEvent) => void
  /** Quẻ vừa gieo trong run này, để gắn vào tin nhắn khi lưu. */
  onCasting: (casting: Casting) => void
}

export abstract class Tool {
  abstract readonly definition: ToolDefinition

  get name(): string {
    return this.definition.function.name
  }

  abstract run(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome>
}
