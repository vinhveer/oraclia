import type { ToolDefinition } from '../../../_shared/types.ts'
import { Tool, type ToolContext, type ToolOutcome } from './tool.ts'

const KINDS = ['card', 'playing', 'suit', 'hexagram', 'hexagram_line', 'combo', 'concept']

/**
 * Tra kho tri thức khi cần hiểu sâu hơn phần đã có sẵn trong kết quả rút bài:
 * hai lá đi cùng nhau nghĩa là gì, một lá ở vị trí khác ra sao, một khái niệm
 * Kinh Dịch. Lá và quẻ vừa ra đã được đưa sẵn tri thức, không cần tra lại.
 */
export class SearchKnowledgeTool extends Tool {
  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description:
        'Tra kho tri thức tarot, bài tây, Kinh Dịch (nghĩa sâu theo chiều, theo mảng đời sống, ' +
        'theo vị trí, cặp lá hay đi cùng, hồ sơ chất, thoán từ, hào từ). Dùng khi cần đối chiếu ' +
        'điều chưa có trong kết quả rút bài / gieo quẻ. Không dùng để rút thêm bài.',
      parameters: {
        type: 'object',
        properties: {
          query_vi: {
            type: 'string',
            description: 'Truy vấn tiếng Việt: tên lá/quẻ hoặc chủ đề, ví dụ "Ba Kiếm cạnh Mười Kiếm".',
          },
          query_en: {
            type: 'string',
            description:
              'Cùng truy vấn đó viết bằng tiếng Anh, dùng tên lá/quẻ tiếng Anh, ví dụ ' +
              '"Three of Swords next to Ten of Swords". Bắt buộc: tìm theo nghĩa chỉ chạy trên tiếng Anh.',
          },
          kinds: {
            type: 'array',
            items: { type: 'string', enum: KINDS },
            description:
              'Giới hạn loại mục theo bộ đang đọc: tarot → card, suit; bài tây → playing; ' +
              'Kinh Dịch → hexagram, hexagram_line. Bỏ trống thì tìm cả ba bộ lẫn nhau.',
          },
        },
        required: ['query_vi', 'query_en'],
      },
    },
  }

  async run(args: Record<string, unknown>, context: ToolContext): Promise<ToolOutcome> {
    const queryVi = String(args.query_vi ?? '').slice(0, 300)
    const queryEn = String(args.query_en ?? '').slice(0, 300)
    const kinds = (Array.isArray(args.kinds) ? args.kinds : [])
      .map(String)
      .filter((kind) => KINDS.includes(kind))
    if (!queryVi.trim() && !queryEn.trim()) {
      return { kind: 'result', summary: 'Truy vấn rỗng.', content: JSON.stringify({ results: [] }) }
    }
    const results = await context.knowledge.search(queryVi, queryEn, kinds, 4)
    return {
      kind: 'result',
      summary: results.length ? `Tra được ${results.length} mục tri thức.` : 'Không có mục phù hợp.',
      content: JSON.stringify({
        results: results.map((entry) => ({ id: entry.id, title: entry.title, body: entry.body_vi })),
      }),
    }
  }
}
