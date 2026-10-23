import type { ModelMessage, ToolDefinition } from '../../../_shared/types.ts'
import { ModelAdapter, type ModelStep, type StepHandlers } from './adapter.ts'

/**
 * Giữ cho môi trường dev vẫn dùng được khi chưa có API key: đi đúng vòng lặp
 * ấy, gọi tool thật, chỉ phần chữ là mẫu.
 *
 * E2E điều khiển kịch bản bằng marker trong câu hỏi:
 *   [e2e:chat]     trả lời thẳng, không tool
 *   [e2e:clarify]  rút bài → hỏi làm rõ → đọc
 *   [e2e:iching]   gieo quẻ → đọc
 *   [e2e:playing]  rút bài tây → đọc
 *   [e2e:long]     rút bài → bài đọc rất dài, chảy chậm (thử cuộn, rời trang giữa stream)
 *   [e2e:error]    model ném lỗi
 *   [e2e:remember] lượt phản tư sau đó ghi nhớ hai điều cố định
 * Không marker thì như cũ: rút tarot theo độ dài câu hỏi rồi đọc.
 */
export class DemoAdapter extends ModelAdapter {
  readonly name = 'demo'
  readonly demo = true

  async step(
    messages: ModelMessage[],
    tools: ToolDefinition[],
    handlers: StepHandlers,
  ): Promise<ModelStep> {
    const question = lastUserText(messages)
    const scenario = question.match(/\[e2e:(\w+)\]/)?.[1] ?? 'default'
    const done = toolResults(messages)
    const has = (name: string) => tools.some((tool) => tool.function.name === name)

    if (scenario === 'error') throw new Error('Demo: lỗi giả lập từ provider.')

    // Lượt phản tư: chỉ có tool trí nhớ, câu hỏi nằm trong đoạn hội thoại được đưa vào.
    if (has('remember')) {
      const transcript = messages.map((message) => message.content ?? '').join('\n')
      if (transcript.includes('[e2e:remember]') && !done.has('remember')) {
        return call('remember', {
          items: [
            {
              content: 'Làm thiết kế đồ hoạ ở một agency',
              kind: 'profile',
              importance: 3,
              gist_en: 'Works as a graphic designer at an agency',
            },
            {
              content: 'Muốn câu trả lời ngắn và thẳng',
              kind: 'preference',
              importance: 2,
              gist_en: 'Prefers short, direct answers',
            },
          ],
        })
      }
      return { content: 'bỏ qua', toolCalls: [] }
    }

    if (scenario === 'chat' || !has('draw_cards')) {
      await stream(handlers, 'Mình nghe đây. Đây là câu trả lời mẫu, không rút bài.', 15)
      return { content: 'Mình nghe đây. Đây là câu trả lời mẫu, không rút bài.', toolCalls: [] }
    }

    if (scenario === 'iching' && !done.has('cast_iching')) {
      return call('cast_iching', { question: question.replace(/\[e2e:\w+\]/, '').trim() })
    }
    if (scenario === 'playing' && !done.has('draw_playing_cards')) {
      return call('draw_playing_cards', {
        positions: ['Chuyện đang tới', 'Lời khuyên'],
        reason: 'Demo bài tây hai lá.',
      })
    }
    if (!['iching', 'playing'].includes(scenario) && !done.has('draw_cards')) {
      const positions = planPositions(question.replace(/\[e2e:\w+\]/, ''))
      return call('draw_cards', {
        positions,
        reason: `Demo mode chọn ${positions.length} lá theo độ dài câu hỏi.`,
      })
    }
    if (scenario === 'clarify' && !done.has('ask_user')) {
      const first = parseDrawResult(done.get('draw_cards') ?? '')[0]
      return call('ask_user', {
        based_on: first?.name_vi ?? '',
        question: 'Chuyện này bắt đầu từ khi bạn đổi chỗ làm phải không?',
        options: ['Đúng vậy', 'Không phải', 'Trước đó nữa'],
        allow_free_text: true,
      })
    }

    for (const thought of ['Đọc lại câu hỏi', ' và các lá vừa lật', ' để tìm mạch chung...']) {
      await new Promise((resolve) => setTimeout(resolve, 250))
      handlers.onReasoning?.(thought)
    }

    const text =
      scenario === 'iching'
        ? ichingReading()
        : demoReading(messages, scenario === 'long' ? 20 : 1)
    await stream(handlers, text, scenario === 'long' ? 40 : 15)
    return { content: text, toolCalls: [], finishReason: 'stop' }
  }

  async complete(messages: ModelMessage[]): Promise<string> {
    return (messages.at(-1)?.content ?? '').slice(-5000)
  }
}

let callCounter = 0

function call(name: string, args: Record<string, unknown>): ModelStep {
  callCounter += 1
  return {
    content: '',
    toolCalls: [
      {
        id: `demo_${name}_${callCounter}`,
        type: 'function',
        function: { name, arguments: JSON.stringify(args) },
      },
    ],
    finishReason: 'tool_calls',
  }
}

async function stream(handlers: StepHandlers, text: string, delayMs: number): Promise<void> {
  for (let index = 0; index < text.length; index += 18) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    handlers.onDelta(text.slice(index, index + 18))
  }
}

/** Kết quả tool đã có trong transcript, theo tên tool. */
function toolResults(messages: ModelMessage[]): Map<string, string> {
  const names = new Map<string, string>()
  for (const message of messages) {
    for (const item of message.tool_calls ?? []) names.set(item.id, item.function.name)
  }
  const results = new Map<string, string>()
  for (const message of messages) {
    if (message.role !== 'tool' || !message.tool_call_id) continue
    const name = names.get(message.tool_call_id)
    if (name) results.set(name, message.content ?? '')
  }
  return results
}

function ichingReading(): string {
  return (
    '### Thế quẻ\n\nQuẻ mẫu cho thấy thời điểm cần kiên nhẫn tích lực trước khi hành động.\n\n' +
    '### Điểm chuyển\n\nHào động nhắc rằng thay đổi đến từ một quyết định nhỏ nhưng rõ ràng.\n\n' +
    '### Nên làm\n\n**Giữ nhịp đều, chuẩn bị kỹ rồi mới bước.**'
  )
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

function demoReading(messages: ModelMessage[], repeat = 1): string {
  const results = toolResults(messages)
  const cards = parseDrawResult(results.get('draw_cards') ?? results.get('draw_playing_cards') ?? '')
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
        }. ${card.meaning}\n\n${'Lá này còn gợi ý nhìn lại nhịp sống thường ngày. '.repeat(repeat - 1)}${
          repeat > 1 ? '\n\n' : ''
        }`,
    )
    .join('')
  const tail =
    '### Tóm lại\n\n' +
    '**Bạn cần chốt phần mình kiểm soát được trước khi chờ tình thế tự thay đổi.**\n\n' +
    '- Chọn một việc có thể làm ngay và đặt thời hạn rõ.\n' +
    '- Đừng quyết định chỉ để thoát khỏi cảm giác sốt ruột.'
  return head + body + tail
}
