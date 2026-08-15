import type { ModelAdapter } from './model/factory.ts'
import type { ConversationRepository } from './repositories/conversations.ts'

const DEFAULT_TITLE = 'Cuộc trò chuyện mới'

/** Tiêu đề tạm, hiện ngay để sidebar có chữ đọc được trong lúc chờ model. */
export function provisionalTitle(question: string): string {
  const cleaned = question.split(/\s+/).join(' ').trim()
  return cleaned.length > 60 ? `${cleaned.slice(0, 57)}...` : cleaned || DEFAULT_TITLE
}

/**
 * Đặt tên cuộc trò chuyện từ câu hỏi đầu tiên. Chạy song song với vòng lặp
 * chính, kết quả gửi về qua sự kiện `conversation.titled`.
 */
export class Titler {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly adapter: ModelAdapter,
  ) {}

  async ensureTitle(conversationId: string, question: string): Promise<string | null> {
    const state = await this.conversations.titleState(conversationId)
    if (state?.title_generated) return null

    let title = ''
    try {
      title = await this.adapter.complete([
        {
          role: 'system',
          content:
            'Đặt tiêu đề tiếng Việt cho một cuộc trò chuyện, dựa trên câu hỏi đầu tiên. ' +
            '3-6 từ, viết hoa chữ đầu, không dấu ngoặc kép, không dấu chấm cuối, không ' +
            'giải thích. Chỉ trả về đúng tiêu đề.',
        },
        { role: 'user', content: question },
      ])
    } catch {
      title = ''
    }

    const cleaned = clean(title) || provisionalTitle(question)
    if (!cleaned) return null
    await this.conversations.rename(conversationId, cleaned, true)
    return cleaned
  }
}

function clean(value: string): string {
  return value
    .split('\n')[0]
    .replace(/^["'`\s]+|["'`.\s]+$/g, '')
    .split(/\s+/)
    .join(' ')
    .slice(0, 80)
}
