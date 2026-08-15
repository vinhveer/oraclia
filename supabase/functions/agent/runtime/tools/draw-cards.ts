import type { ToolDefinition } from '../../../_shared/types.ts'
import { Tool, type ToolContext, type ToolOutcome } from './tool.ts'

const MAX_PICK = 7
const FALLBACK_POSITIONS = ['Nguồn cơn', 'Hiện tại', 'Hướng mở']

export class DrawCardsTool extends Tool {
  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'draw_cards',
      description:
        'Mở một lượt rút bài tarot. Tự quyết định lượt này cần bao nhiêu lá (1-7) và đặt tên ' +
        'từng vị trí. Bộ 78 lá được xáo úp mặt; người hỏi sẽ tự chọn. Kết quả trả về là các lá đã lật.',
      parameters: {
        type: 'object',
        properties: {
          positions: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: MAX_PICK,
            description:
              'Tên từng vị trí bằng tiếng Việt, ngắn (2-5 từ), cụ thể theo câu hỏi. ' +
              'Số phần tử chính là số lá cần rút.',
          },
          reason: { type: 'string', description: 'Một câu ngắn giải thích vì sao chọn số lá này.' },
        },
        required: ['positions'],
      },
    },
  }

  async run(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    // Tin vào ý định của model chứ không tin định dạng: cắt gọt thay vì từ chối.
    const positions = (Array.isArray(args.positions) ? args.positions : [])
      .map((item) => String(item).split(/\s+/).join(' ').trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, MAX_PICK)
    const chosen = positions.length ? positions : FALLBACK_POSITIONS
    const reason = String(args.reason ?? '').split(/\s+/).join(' ').slice(0, 200)

    const shuffled = context.deck.shuffle()
    const readingId = await context.readings.createPending({
      conversationId: context.conversationId,
      runId: context.runId,
      userId: context.userId,
      question: context.question,
      positions: chosen,
      reason,
      shuffled,
    })

    context.emit({
      type: 'draw.requested',
      run_id: context.runId,
      reading_id: readingId,
      deck_size: shuffled.length,
      pick_count: chosen.length,
      positions: chosen,
      reason,
    })
    return { kind: 'interrupt', summary: `Đang chờ người hỏi chọn ${chosen.length} lá.` }
  }
}
