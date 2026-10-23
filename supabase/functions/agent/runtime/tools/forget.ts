import type { ToolDefinition } from '../../../_shared/types.ts'
import { Tool, type ToolContext, type ToolOutcome } from './tool.ts'

/** Bỏ một điều đã nhớ không còn đúng hoặc người hỏi đã nói không muốn bị nhớ. */
export class ForgetTool extends Tool {
  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'forget',
      description:
        'Xoá một điều đã nhớ khi nó không còn đúng và không thể sửa thành điều đúng, hoặc khi ' +
        'người hỏi muốn quên. Dùng id rút gọn đứng đầu dòng.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Id rút gọn, ví dụ "3f2a9c1d".' },
          reason: { type: 'string', description: 'Một câu: vì sao bỏ.' },
        },
        required: ['id', 'reason'],
      },
    },
  }

  async run(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const row = await context.memories.resolve(String(args.id ?? ''))
    if (!row) {
      return {
        kind: 'result',
        summary: 'Không tìm thấy điều cần quên.',
        content: JSON.stringify({ error: 'Id không khớp đúng một điều đã nhớ.' }),
      }
    }
    await context.memories.remove(row.id)
    return { kind: 'result', summary: 'Đã bỏ một điều đã nhớ.', content: 'Đã xoá.' }
  }
}
