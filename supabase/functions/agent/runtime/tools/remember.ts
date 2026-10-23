import type { ToolDefinition } from '../../../_shared/types.ts'
import { MEMORY_KINDS, type MemoryKind, type NewMemory } from '../repositories/memories.ts'
import { Tool, type ToolContext, type ToolOutcome } from './tool.ts'
import { clip } from '../text.ts'

const MAX_ITEMS = 8

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
          items: {
            type: 'array',
            minItems: 1,
            maxItems: MAX_ITEMS,
            items: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description:
                    'Một điều, câu ngắn tiếng Việt tự đứng độc lập được khi đọc lại sau nhiều tháng.',
                },
                kind: {
                  type: 'string',
                  enum: MEMORY_KINDS,
                  description:
                    'profile: con người, hoàn cảnh lâu dài. preference: cách muốn được trả lời. ' +
                    'life_event: biến cố có mốc thời gian. ongoing: chuyện đang theo dõi, sẽ còn hỏi lại.',
                },
                importance: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 3,
                  description: '3: luôn cần biết. 2: hay liên quan. 1: chi tiết phụ.',
                },
                gist_en: {
                  type: 'string',
                  description: 'Cùng điều đó viết bằng tiếng Anh, một câu, dùng để tìm kiếm.',
                },
              },
              required: ['content', 'kind', 'importance', 'gist_en'],
            },
          },
        },
        required: ['items'],
      },
    },
  }

  async run(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const items = parseItems(args).slice(0, MAX_ITEMS)
    if (!items.length) {
      return { kind: 'result', summary: 'Không có gì mới để nhớ.', content: 'Đã biết cả rồi.' }
    }
    // Lượt reflect chạy nhiều lần trong một cuộc trò chuyện; repository tự lọc
    // trùng chữ và trùng nghĩa, chứ không thì cùng một điều bị ghi lại mỗi lần.
    const saved = await context.memories.add(context.userId, context.conversationId, items)
    if (!saved.length) {
      return { kind: 'result', summary: 'Không có gì mới để nhớ.', content: 'Đã biết cả rồi.' }
    }
    const facts = saved.map((item) => item.content)
    context.emit({ type: 'memory.saved', facts })
    return {
      kind: 'result',
      summary: `Đã nhớ ${facts.length} điều.`,
      content: `Đã lưu: ${facts.join(' | ')}`,
    }
  }
}

function parseItems(args: Record<string, unknown>): NewMemory[] {
  // Nhận cả dạng cũ `facts: string[]` từ run đỗ trước khi đổi schema.
  const raw = Array.isArray(args.items) ? args.items : Array.isArray(args.facts) ? args.facts : []
  return raw
    .map((item) => {
      const value = (typeof item === 'string' ? { content: item } : item) as Record<string, unknown>
      const kind = MEMORY_KINDS.includes(value.kind as MemoryKind)
        ? (value.kind as MemoryKind)
        : 'profile'
      return {
        content: clip(String(value.content ?? '').split(/\s+/).join(' ').trim(), 300),
        kind,
        importance: Math.min(3, Math.max(1, Number(value.importance) || 2)),
        gist_en: clip(String(value.gist_en ?? '').trim(), 300),
      }
    })
    .filter((item) => item.content.length > 3)
}
