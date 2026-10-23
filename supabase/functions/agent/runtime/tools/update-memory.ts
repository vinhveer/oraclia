import type { ToolDefinition } from '../../../_shared/types.ts'
import { MEMORY_KINDS, type MemoryKind } from '../repositories/memories.ts'
import { Tool, type ToolContext, type ToolOutcome } from './tool.ts'

/**
 * Sửa một điều đã nhớ khi hoàn cảnh đổi ("đang tìm việc" → "đã nhận việc ở X"),
 * thay vì để hai điều mâu thuẫn nằm cạnh nhau.
 */
export class UpdateMemoryTool extends Tool {
  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'update_memory',
      description:
        'Sửa một điều đã nhớ khi nó đã cũ, sai, hoặc trùng với điều khác (gộp lại). ' +
        'Dùng id rút gọn đứng đầu mỗi dòng trong danh sách đã nhớ.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Id rút gọn, ví dụ "3f2a9c1d".' },
          content: { type: 'string', description: 'Nội dung mới bằng tiếng Việt.' },
          gist_en: { type: 'string', description: 'Nội dung mới bằng tiếng Anh, một câu.' },
          kind: { type: 'string', enum: MEMORY_KINDS },
          importance: { type: 'integer', minimum: 1, maximum: 3 },
        },
        required: ['id', 'content', 'gist_en'],
      },
    },
  }

  async run(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const row = await context.memories.resolve(String(args.id ?? ''))
    if (!row) {
      return {
        kind: 'result',
        summary: 'Không tìm thấy điều cần sửa.',
        content: JSON.stringify({ error: 'Id không khớp đúng một điều đã nhớ.' }),
      }
    }
    const content = String(args.content ?? '').split(/\s+/).join(' ').trim().slice(0, 300)
    await context.memories.update(row.id, {
      content: content || undefined,
      gist_en: String(args.gist_en ?? '').trim().slice(0, 300) || undefined,
      kind: MEMORY_KINDS.includes(args.kind as MemoryKind) ? (args.kind as MemoryKind) : undefined,
      importance: args.importance ? Math.min(3, Math.max(1, Number(args.importance))) : undefined,
    })
    return { kind: 'result', summary: 'Đã sửa một điều đã nhớ.', content: 'Đã cập nhật.' }
  }
}
