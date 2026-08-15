import type { Casting, ToolDefinition } from '../../../_shared/types.ts'
import { Tool, type ToolContext, type ToolOutcome } from './tool.ts'

export class CastIChingTool extends Tool {
  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'cast_iching',
      description:
        'Gieo một quẻ Kinh Dịch theo phép ba đồng xu. Trả về quẻ chính, các hào động và quẻ ' +
        'biến. Dùng khi người hỏi muốn xem Kinh Dịch, hỏi về thế cục/thời vận, hoặc khi một ' +
        'quẻ hợp hơn là trải bài tarot. Mỗi lượt chỉ gieo một lần.',
      parameters: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'Câu hỏi đưa vào quẻ, viết gọn lại thành một câu rõ ràng.',
          },
        },
        required: ['question'],
      },
    },
  }

  async run(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const asked = String(args.question ?? '').split(/\s+/).join(' ').slice(0, 300)
    const casting = (await context.caster()).cast(asked || context.question)

    await context.castings.create({
      conversationId: context.conversationId,
      runId: context.runId,
      userId: context.userId,
      casting,
    })

    context.onCasting(casting)
    context.emit({ type: 'iching.cast', casting })
    return {
      kind: 'result',
      summary: this.summarise(casting),
      content: this.describe(casting),
    }
  }

  private summarise(casting: Casting): string {
    const moving = casting.movingLines.length
      ? `, hào động ${casting.movingLines.join(', ')}`
      : ', không hào động'
    return `Quẻ ${casting.primary.number}. ${casting.primary.full_name}${moving}`
  }

  /** Những gì model đọc được sau khi gieo. */
  private describe(casting: Casting): string {
    const lineText = casting.tosses
      .map((toss, index) => {
        const label =
          toss === 9 ? 'dương động' : toss === 6 ? 'âm động' : toss === 7 ? 'dương' : 'âm'
        return `  hào ${index + 1}: ${label} (${toss})`
      })
      .join('\n')

    const changed = casting.changed
      ? `Quẻ biến: ${casting.changed.number}. ${casting.changed.full_name} — ${casting.changed.meaning}`
      : 'Không có hào động, nên không có quẻ biến: tình thế hiện tại là câu trả lời.'

    return `Người hỏi vừa gieo quẻ cho câu hỏi: ${casting.question}

Quẻ chính: ${casting.primary.number}. ${casting.primary.full_name} (${casting.primary.lower_trigram} dưới, ${casting.primary.upper_trigram} trên)
Từ khóa: ${casting.primary.keywords.join(', ')}
Ý nghĩa tham khảo: ${casting.primary.meaning}
Lời khuyên tham khảo: ${casting.primary.advice}

Sáu hào từ dưới lên:
${lineText}
Hào động: ${casting.movingLines.length ? casting.movingLines.join(', ') : 'không có'}
${changed}

Hãy luận quẻ theo mạch: tượng quẻ chính và vì sao nó ứng với câu hỏi; ý nghĩa
của (các) hào động ở đúng vị trí của nó; hướng chuyển sang quẻ biến nếu có; và
điều nên làm. Nói rõ đây là một cách soi chiếu, không phải dự đoán chắc chắn.
Không bịa thêm hào động hay quẻ khác ngoài dữ liệu trên.`
  }
}
