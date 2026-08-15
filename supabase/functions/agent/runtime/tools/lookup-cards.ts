import type { TarotCard, ToolDefinition } from '../../../_shared/types.ts'
import { Tool, type ToolContext, type ToolOutcome } from './tool.ts'

export class LookupCardsTool extends Tool {
  constructor(private readonly catalog: TarotCard[]) {
    super()
  }

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'lookup_cards',
      description:
        'Tra nghĩa tham khảo của các lá cụ thể trong bộ 78 lá. Dùng khi cần đối chiếu, ' +
        'không phải để rút thêm bài.',
      parameters: {
        type: 'object',
        properties: {
          card_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Mã lá, ví dụ "major-00" hoặc "wands-09".',
          },
          query: { type: 'string', description: 'Tìm theo tên tiếng Việt hoặc tiếng Anh.' },
        },
      },
    },
  }

  async run(args: Record<string, unknown>, _context: ToolContext): Promise<ToolOutcome> {
    const ids = (Array.isArray(args.card_ids) ? args.card_ids : []).map(String)
    const query = String(args.query ?? '').toLowerCase().trim()
    let matches = this.catalog.filter((card) => ids.includes(card.id))
    if (!matches.length && query) {
      matches = this.catalog.filter(
        (card) =>
          card.name.toLowerCase().includes(query) || card.name_vi.toLowerCase().includes(query),
      )
    }
    matches = matches.slice(0, 10)
    return {
      kind: 'result',
      summary: matches.length ? `Tra ${matches.length} lá.` : 'Không tìm thấy lá phù hợp.',
      content: JSON.stringify({
        cards: matches.map((card) => ({
          id: card.id,
          name: card.name,
          name_vi: card.name_vi,
          keywords: card.keywords,
          upright: card.upright,
          reversed: card.reversed,
        })),
      }),
    }
  }
}
