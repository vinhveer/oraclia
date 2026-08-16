import type { ModelMessage, ToolDefinition } from '../../../_shared/types.ts'
import { ModelAdapter, type ModelStep, type StepHandlers } from './adapter.ts'

/**
 * Giữ cho môi trường dev vẫn dùng được khi chưa có API key: đi đúng vòng lặp
 * ấy, gọi tool thật, chỉ phần chữ là mẫu.
 */
export class DemoAdapter extends ModelAdapter {
  readonly name = 'demo'
  readonly demo = true

  async step(
    messages: ModelMessage[],
    tools: ToolDefinition[],
    handlers: StepHandlers,
  ): Promise<ModelStep> {
    const drawn = messages.some((message) => message.role === 'tool')
    if (!drawn && tools.some((tool) => tool.function.name === 'draw_cards')) {
      const positions = planPositions(lastUserText(messages))
      return {
        content: '',
        toolCalls: [
          {
            id: 'demo_draw',
            type: 'function',
            function: {
              name: 'draw_cards',
              arguments: JSON.stringify({
                positions,
                reason: `Demo mode chọn ${positions.length} lá theo độ dài câu hỏi.`,
              }),
            },
          },
        ],
      }
    }

    for (const thought of ['Đọc lại câu hỏi', ' và các lá vừa lật', ' để tìm mạch chung...']) {
      await new Promise((resolve) => setTimeout(resolve, 250))
      handlers.onReasoning?.(thought)
    }

    const text = demoReading(messages)
    for (let index = 0; index < text.length; index += 18) {
      await new Promise((resolve) => setTimeout(resolve, 15))
      handlers.onDelta(text.slice(index, index + 18))
    }
    return { content: text, toolCalls: [] }
  }

  async complete(messages: ModelMessage[]): Promise<string> {
    return (messages.at(-1)?.content ?? '').slice(-5000)
  }
}

function lastUserText(messages: ModelMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') return messages[index].content ?? ''
  }
  return ''
}

function planPositions(question: string): string[] {
  const words = question.trim().split(/\s+/).length
  if (words <= 6) return ['Điều cần nhìn thấy']
  if (words <= 14) return ['Nguồn cơn', 'Hiện tại', 'Hướng mở']
  return ['Điều cốt lõi', 'Điều đang níu lại', 'Điều chưa thấy', 'Hướng mở', 'Lời nhắc']
}

/** Đọc lại đúng các dòng lá mà prompt builder đã viết ra, để chữ mẫu gọi đúng tên lá. */
function parseDrawResult(content: string) {
  const cards: { position: string; name_vi: string; orientation?: string; meaning: string }[] = []
  const lines = content.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const header = lines[index].match(/^- (.+?): (.+?) \(.+?\)(?:, (upright|reversed))?$/)
    if (!header) continue
    const meaning = lines[index + 2]?.replace(/^\s*Nghĩa tham khảo:\s*/, '').trim() ?? ''
    cards.push({ position: header[1], name_vi: header[2], orientation: header[3], meaning })
  }
  return cards
}

function demoReading(messages: ModelMessage[]): string {
  const toolResult = [...messages].reverse().find((message) => message.role === 'tool')
  const cards = parseDrawResult(toolResult?.content ?? '')
  const head =
    '### Bức tranh chung\n\n' +
    'Trải bài cho thấy vấn đề đang đi từ chỗ chưa rõ sang một lựa chọn cụ thể. ' +
    'Điểm quan trọng là nhìn đúng phần bạn có thể chủ động.\n\n' +
    '### Từng lá\n\n'
  const body = cards
    .map(
      (card, index) =>
        `[[card:${index + 1}]]\n\n**${card.position} — ${card.name_vi}**${
          card.orientation
            ? ` ở chiều ${card.orientation === 'reversed' ? 'ngược' : 'xuôi'}`
            : ''
        }. ${card.meaning}\n\n`,
    )
    .join('')
  const tail =
    '### Tóm lại\n\n' +
    '**Bạn cần chốt phần mình kiểm soát được trước khi chờ tình thế tự thay đổi.**\n\n' +
    '- Chọn một việc có thể làm ngay và đặt thời hạn rõ.\n' +
    '- Đừng quyết định chỉ để thoát khỏi cảm giác sốt ruột.'
  return head + body + tail
}
