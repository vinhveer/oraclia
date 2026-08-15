import type { ModelAdapter } from './model/factory.ts'
import type { ConversationRepository } from './repositories/conversations.ts'

const DEFAULT_TITLE = 'Cuộc trò chuyện mới'

/**
 * Đặt tên cuộc trò chuyện từ câu hỏi đầu tiên. Chạy trước khi vòng lặp bắt đầu
 * nên người dùng thấy tiêu đề thật ngay ở lượt đầu, không phải 80 ký tự cắt
 * ngang câu hỏi.
 */
export class Titler {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly adapter: ModelAdapter,
  ) {}

  async ensureTitle(conversationId: string, question: string): Promise<string | null> {
    const current = await this.conversations.title(conversationId)
    if (current && current !== DEFAULT_TITLE) return null

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

    const cleaned = clean(title) || clean(question).slice(0, 60)
    if (!cleaned) return null
    await this.conversations.rename(conversationId, cleaned)
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
