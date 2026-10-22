import type { ToolDefinition } from '../../../_shared/types.ts'
import { Tool, type ToolContext, type ToolOutcome } from './tool.ts'

const MAX_OPTIONS = 4

/**
 * Hỏi lại người dùng một câu để làm rõ vấn đề. Đây là tool **ngắt**: run đỗ ở
 * `awaiting_input` cho tới khi có câu trả lời, giống hệt lượt chọn bài.
 */
export class AskUserTool extends Tool {
  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'ask_user',
      description:
        'Hỏi người hỏi một câu để làm rõ vấn đề trước khi bói. Dùng khi câu hỏi quá rộng hoặc ' +
        'thiếu bối cảnh khiến lượt bói dễ trả lời chung chung. Mỗi lượt hỏi đúng một câu.',
      parameters: {
        type: 'object',
        properties: {
          based_on: {
            type: 'string',
            description:
              'Tên lá hoặc tên quẻ vừa ra mà phỏng đoán này dựa vào, chép đúng như đã hiện. ' +
              'Chưa lật bài thì để trống — nhưng đừng hỏi khi chưa lật.',
          },
          question: {
            type: 'string',
            description:
              'Phỏng đoán để người hỏi gật hay lắc. CHỈ hỏi thứ họ chứng kiến được: việc đã ' +
              'xảy ra, ai dính vào, ai nói gì làm gì, chuyện bắt đầu từ khi nào, và cảm giác ' +
              'của CHÍNH họ. CẤM hỏi bụng dạ người khác (kể cả người thân): họ nghĩ gì, giận ' +
              'vì sao, còn thương không, định làm gì. CẤM hỏi chuyện sắp tới và kết quả. ' +
              'Phép thử: nếu họ phải bói mới biết câu trả lời thì đó là việc của bạn, không ' +
              'phải câu để hỏi họ. Không hỏi dạng phân loại hay dạng trống.',
          },
          options: {
            type: 'array',
            items: { type: 'string' },
            maxItems: MAX_OPTIONS,
            description:
              'Các lựa chọn gợi ý để bấm cho nhanh, mỗi lựa chọn 2-6 từ. Để trống nếu câu hỏi ' +
              'không hợp với việc chọn sẵn.',
          },
          allow_free_text: {
            type: 'boolean',
            description: 'Cho phép tự nhập câu trả lời. Mặc định true.',
          },
        },
        required: ['based_on', 'question'],
      },
    },
  }

  async run(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const question = String(args.question ?? '').split(/\s+/).join(' ').trim().slice(0, 300)
    const basedOn = String(args.based_on ?? '').split(/\s+/).join(' ').trim().slice(0, 80)
    if (!question) {
      return { kind: 'result', summary: 'Câu hỏi rỗng.', content: 'Không hỏi được, hãy bói luôn.' }
    }
    const options = (Array.isArray(args.options) ? args.options : [])
      .map((item) => String(item).split(/\s+/).join(' ').trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, MAX_OPTIONS)
    const allowFreeText = args.allow_free_text !== false

    const id = await context.clarifications.create({
      conversationId: context.conversationId,
      runId: context.runId,
      userId: context.userId,
      question,
      basedOn,
      options,
      allowFreeText,
    })

    context.emit({
      type: 'clarify.requested',
      run_id: context.runId,
      clarification_id: id,
      question,
      based_on: basedOn,
      options,
      allow_free_text: allowFreeText,
    })
    return { kind: 'interrupt', summary: 'Đang chờ người hỏi trả lời.' }
  }
}
