import type { ChatTurn } from '../../_shared/types.ts'
import type { ModelAdapter } from './model/factory.ts'
import type { ConversationRepository } from './repositories/conversations.ts'
import type { PromptRepository } from './repositories/prompts.ts'
import { PromptBuilder } from './prompts/builder.ts'

// Lưới an toàn, không phải cơ chế chính: việc cô đọng bình thường do lượt phản
// tư lo (runtime/tools/compact-history.ts), nơi model tự quyết định nhớ gì. Cái
// này chỉ bắt trường hợp người dùng nói liên tục không nghỉ, khiến lượt phản tư
// không bao giờ có cơ hội chạy.
const THRESHOLD = 24
const KEEP = 6

/**
 * Cuộc trò chuyện dài được gấp vào `context_summary` thay vì gửi lại toàn bộ.
 */
export class Compactor {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly prompts: PromptRepository,
    private readonly adapter: ModelAdapter,
  ) {}

  async run(conversationId: string): Promise<void> {
    const marker = await this.conversations.summaryMarker(conversationId)
    if (!marker) return

    const pending = await this.conversations.pendingSince(conversationId, marker.compacted_until)
    if (pending.length <= THRESHOLD) return

    const stale = pending.slice(0, pending.length - KEEP)
    const prompt = await this.prompts.active('compactor')
    try {
      const summary = await this.adapter.complete([
        { role: 'system', content: prompt.body },
        {
          role: 'user',
          content: PromptBuilder.compactionInput(
            marker.context_summary ?? '',
            stale.map((row) => ({ role: row.role as ChatTurn['role'], content: row.content })),
          ),
        },
      ])
      await this.conversations.saveSummary(
        conversationId,
        summary || (marker.context_summary ?? ''),
        stale.at(-1)?.created_at ?? marker.compacted_until,
      )
    } catch {
      // Cô đọng hỏng thì thôi, không được phép chặn lượt đọc.
    }
  }
}
