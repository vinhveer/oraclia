import type { Casting, HexagramLine, ToolDefinition } from '../../../_shared/types.ts'
import type { KnowledgeEntry } from '../repositories/knowledge.ts'
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
    const [movingLineTexts, knowledge] = await Promise.all([
      context.catalog.hexagramLines(casting.primary.number, casting.movingLines),
      context.knowledge.forCasting(casting),
    ])

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
      content: this.describe(casting, movingLineTexts, knowledge),
    }
  }

  private summarise(casting: Casting): string {
    const moving = casting.movingLines.length
      ? `, hào động ${casting.movingLines.join(', ')}`
      : ', không hào động'
    return `Quẻ ${casting.primary.number}. ${casting.primary.full_name}${moving}`
  }

  /** Những gì model đọc được sau khi gieo. */
  private describe(
    casting: Casting,
    movingLineTexts: HexagramLine[],
    knowledge: Map<string, KnowledgeEntry>,
  ): string {
    const deep = (id: string, label: string) => {
      const entry = knowledge.get(id)
      return entry ? `\n${label}:\n${entry.body_vi}\n` : ''
    }
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

    const moving = movingLineTexts.length
      ? `Dữ liệu hào động:\n${movingLineTexts
          .map((line) => {
            const entry = knowledge.get(`line:${line.hexagram_number}:${line.line_number}`)
            const reference = entry
              ? `Nguyên văn: ${line.source_text}\n${entry.body_vi}`
              : line.translation_vi && line.review_status === 'reviewed'
                ? `Bản Việt đã duyệt: ${line.translation_vi}`
                : `Nguyên văn Hán cổ: ${line.source_text}\n  Trạng thái: chưa có bản Việt được duyệt`
            return `- Hào ${line.line_number}: ${reference}`
          })
          .join('\n')}`
      : 'Không có hào động cần tra hào từ.'

    return `Người hỏi vừa gieo quẻ cho câu hỏi: ${casting.question}

Quẻ chính: ${casting.primary.number}. ${casting.primary.full_name} (${casting.primary.lower_trigram} dưới, ${casting.primary.upper_trigram} trên)
Từ khóa: ${casting.primary.keywords.join(', ')}
Ý nghĩa tham khảo: ${casting.primary.meaning}
Lời khuyên tham khảo: ${casting.primary.advice}
${deep(`hexagram:${casting.primary.number}`, 'Tri thức về quẻ chính')}
Kết quả sáu lần gieo, từ dưới lên:
${lineText}
Hào động: ${casting.movingLines.length ? casting.movingLines.join(', ') : 'không có'}
${moving}
${changed}
${casting.changed ? deep(`hexagram:${casting.changed.number}`, 'Tri thức về quẻ biến') : ''}
Phần "Tri thức" là nền để hiểu quẻ cho sâu; chọn ý hợp với câu hỏi, viết bằng lời của mình.

Viết 220-350 từ, dùng đúng ba tiêu đề Markdown: "### Thế quẻ" chốt tình hình hiện tại;
"### Điểm chuyển" gộp các hào động và hướng sang quẻ biến trong một đoạn ngắn; "### Nên làm"
nêu 1-2 hành động cụ thể. Không giảng lần lượt đủ sáu hào. Mỗi hào động tối đa
một câu. Nếu dữ liệu chỉ có nguyên văn Hán cổ, diễn giải thận trọng bằng lời đời
thường, không chép Hán văn ra câu trả lời và không gọi đó là bản dịch chuẩn.
Không bịa thêm lời hào, hào động hay quẻ khác ngoài dữ liệu trên.`
  }
}
