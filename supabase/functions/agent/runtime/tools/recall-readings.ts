import type { ToolDefinition } from '../../../_shared/types.ts'
import { Tool, type ToolContext, type ToolOutcome } from './tool.ts'

/**
 * Nhớ lại các lượt đọc ở những cuộc trò chuyện khác — "tháng trước bạn rút Tòa
 * Tháp cho chính chuyện công việc này" là thứ chỉ người đọc quen mặt mới nói được.
 */
export class RecallReadingsTool extends Tool {
  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'recall_readings',
      description:
        'Tìm các lượt rút bài / gieo quẻ cũ của người này ở các cuộc trò chuyện khác, khi câu ' +
        'hỏi nối tiếp một chuyện họ từng hỏi. Trả về ngày, câu hỏi, lá/quẻ đã ra và kết luận.',
      parameters: {
        type: 'object',
        properties: {
          query_vi: { type: 'string', description: 'Chủ đề cần tìm, tiếng Việt.' },
          query_en: {
            type: 'string',
            description: 'Cùng chủ đề đó bằng tiếng Anh. Bắt buộc: tìm theo nghĩa chỉ chạy trên tiếng Anh.',
          },
        },
        required: ['query_vi', 'query_en'],
      },
    },
  }

  async run(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const rows = await context.readingRecords.search(
      String(args.query_vi ?? '').slice(0, 300),
      String(args.query_en ?? '').slice(0, 300),
      context.conversationId,
      3,
    )
    return {
      kind: 'result',
      summary: rows.length ? `Tìm thấy ${rows.length} lượt đọc cũ.` : 'Không có lượt đọc cũ liên quan.',
      content: JSON.stringify({
        readings: rows.map((row) => ({
          date: row.created_at.slice(0, 10),
          question: row.question,
          drawn: row.record,
          conclusion: row.synthesis,
        })),
      }),
    }
  }
}
