import type { ToolDefinition } from '../../../_shared/types.ts'
import { Tool, type ToolContext, type ToolOutcome } from './tool.ts'

const MAX_PICK = 5
const FALLBACK_POSITIONS = ['Chuyện đang tới', 'Điều cần biết', 'Lời khuyên']

/**
 * Bói bài tây: cùng lối chơi với tarot — người hỏi tự rút từ bộ 52 lá úp mặt —
 * nhưng ít lá hơn, vì mỗi lá bài tây mang một nghĩa gọn chứ không nhiều tầng
 * như một lá tarot.
 */
export class DrawPlayingCardsTool extends Tool {
  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'draw_playing_cards',
      description:
        'Mở một lượt bói bài tây với bộ 52 lá. Tự quyết định lượt này cần bao nhiêu lá (1-5) ' +
        'và đặt tên từng vị trí. Người hỏi sẽ tự chọn từ bộ đã xáo úp mặt.',
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
    const positions = (Array.isArray(args.positions) ? args.positions : [])
      .map((item) => String(item).split(/\s+/).join(' ').trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, MAX_PICK)
    const chosen = positions.length ? positions : FALLBACK_POSITIONS
    const reason = String(args.reason ?? '').split(/\s+/).join(' ').slice(0, 200)

    const shuffled = (await context.playingDeck()).shuffle()
    const readingId = await context.readings.createPending({
      conversationId: context.conversationId,
      runId: context.runId,
      userId: context.userId,
      question: context.question,
      positions: chosen,
      reason,
      deck: 'playing',
      toolCallId: context.callId,
      shuffled,
    })

    context.emit({
      type: 'draw.requested',
      run_id: context.runId,
      reading_id: readingId,
      deck: 'playing',
      deck_size: shuffled.length,
      pick_count: chosen.length,
      positions: chosen,
      reason,
    })
    return { kind: 'interrupt', summary: `Đang chờ người hỏi chọn ${chosen.length} lá bài tây.` }
  }
}
