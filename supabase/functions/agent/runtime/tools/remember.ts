import type { ToolDefinition } from '../../../_shared/types.ts'
import { Tool, type ToolContext, type ToolOutcome } from './tool.ts'

const MAX_FACTS = 8

export class RememberTool extends Tool {
  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'remember',
      description:
        'Lưu những điều đáng nhớ lâu dài về người hỏi để dùng cho mọi cuộc trò chuyện sau này.',
      parameters: {
        type: 'object',
        properties: {
          facts: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: MAX_FACTS,
            description:
              'Mỗi phần tử một điều, viết thành câu ngắn tự đứng độc lập được khi đọc lại sau nhiều tháng.',
          },
        },
        required: ['facts'],
      },
    },
  }

  async run(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const existing = new Set(
      (await context.memories.list()).map((row) => normalise(row.content)),
    )
    const facts = (Array.isArray(args.facts) ? args.facts : [])
      .map((item) => String(item).split(/\s+/).join(' ').trim().slice(0, 300))
      .filter((item) => item.length > 3)
      // Lượt reflect chạy nhiều lần trong một cuộc trò chuyện, nên phải tự lọc
      // trùng chứ không thì cùng một điều bị ghi lại mỗi lần.
      .filter((item) => !existing.has(normalise(item)))
      .slice(0, MAX_FACTS)

    if (!facts.length) {
      return { kind: 'result', summary: 'Không có gì mới để nhớ.', content: 'Đã biết cả rồi.' }
    }

    await context.memories.add(context.userId, context.conversationId, facts)
    context.emit({ type: 'memory.saved', facts })
    return {
      kind: 'result',
      summary: `Đã nhớ ${facts.length} điều.`,
      content: `Đã lưu: ${facts.join(' | ')}`,
    }
  }
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[.,;:!?"'()]/g, '').split(/\s+/).join(' ').trim()
}
