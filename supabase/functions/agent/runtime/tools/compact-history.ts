import type { ToolDefinition } from '../../../_shared/types.ts'
import { Tool, type ToolContext, type ToolOutcome } from './tool.ts'

export class CompactHistoryTool extends Tool {
  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'compact_history',
      description:
        'Thay bộ nhớ cô đọng của cuộc trò chuyện này bằng một bản mới, khi phần đầu hội thoại ' +
        'đã dài và không còn cần giữ nguyên văn.',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description:
              'Bộ nhớ mới, dưới 700 từ, gộp cả bộ nhớ cũ. Văn xuôi gọn, không tiêu đề.',
          },
        },
        required: ['summary'],
      },
    },
  }

  async run(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const summary = String(args.summary ?? '').trim()
    if (summary.length < 20) {
      return { kind: 'result', summary: 'Bản tóm tắt quá ngắn.', content: 'Bỏ qua, chưa cô đọng.' }
    }

    // Chỉ gấp phần đã nằm trong tóm tắt, giữ lại các lượt gần nhất nguyên văn.
    const marker = await context.conversations.summaryMarker(context.conversationId)
    const pending = await context.conversations.pendingSince(
      context.conversationId,
      marker?.compacted_until ?? null,
    )
    const keep = 4
    const until =
      pending.length > keep ? (pending.at(-keep - 1)?.created_at ?? null) : (marker?.compacted_until ?? null)

    await context.conversations.saveSummary(context.conversationId, summary.slice(0, 6000), until)
    context.emit({ type: 'history.compacted', length: summary.length })
    return {
      kind: 'result',
      summary: `Đã cô đọng ${summary.length} ký tự.`,
      content: 'Bộ nhớ cuộc trò chuyện đã được cập nhật.',
    }
  }
}
