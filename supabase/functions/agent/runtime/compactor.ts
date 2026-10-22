import type { ModelAdapter } from './model/factory.ts'
import type { ConversationRepository } from './repositories/conversations.ts'
import { assistantContent, buildHistory } from './history.ts'

const SYSTEM = `Bạn cô đọng một cuộc trò chuyện xem tarot / bài tây / Kinh Dịch thành bộ nhớ.
Viết văn xuôi gọn, dưới 600 từ, không tiêu đề. Gộp bộ nhớ cũ với phần mới, giữ:
người liên quan và vai trò, mục tiêu, nỗi lo, mốc thời gian, các lá / quẻ đã ra
(kèm vị trí) và kết luận chính của từng lượt đọc, điều người hỏi đã xác nhận hay
đính chính. Bỏ lời chào, câu đệm, phần giải nghĩa chung chung. Không suy diễn
thêm điều người hỏi chưa nói.`

/**
 * Cô đọng xác định: lịch sử vượt ngân sách thì gấp phần tràn vào bản tóm tắt.
 * Không chờ model phản tư tự nhận ra là nên cô đọng — chuyện đó lúc có lúc không,
 * và mỗi lần "không" là một khoảng hội thoại model không còn thấy.
 */
export class Compactor {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly adapter: ModelAdapter,
  ) {}

  async compact(conversationId: string): Promise<boolean> {
    const state = await this.conversations.state(conversationId)
    const { overflow } = buildHistory(state.pending)
    if (overflow <= 0) return false

    const folded = state.pending.slice(0, overflow)
    const transcript = folded
      .filter((row) => row.role === 'user' || row.role === 'assistant')
      .map((row) =>
        `${row.role === 'user' ? 'Người hỏi' : 'Oraclia'}: ${
          row.role === 'assistant' ? assistantContent(row) : row.content
        }`,
      )
      .join('\n\n')

    const summary = (
      await this.adapter.complete([
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Bộ nhớ cũ:\n${state.summary || '(chưa có)'}\n\nPhần cần gộp vào:\n${transcript}`,
        },
      ])
    ).trim()
    if (summary.length < 20) return false

    await this.conversations.saveSummary(
      conversationId,
      summary.slice(0, 6000),
      folded[folded.length - 1].created_at,
    )
    return true
  }
}
