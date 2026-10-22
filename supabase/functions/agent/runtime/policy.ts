import type { ModelMessage, ModelToolCall } from '../../_shared/types.ts'

/** Tối đa bao nhiêu câu làm rõ trong một run. Là trần, không phải chỉ tiêu. */
export const MAX_QUESTIONS = 3
/** Rút bài / gieo quẻ tối đa bao nhiêu lượt cho cùng một vấn đề. */
export const MAX_READINGS = 2

const READING_TOOLS = new Set(['draw_cards', 'draw_playing_cards', 'cast_iching'])

export interface PolicyInput {
  /** Transcript của run tới thời điểm này; mọi tool call đã có kết quả đều nằm trong đó. */
  transcript: ModelMessage[]
  /** Tên các lá đã lật và quẻ đã gieo trong run, để kiểm `based_on`. */
  revealedNames: string[]
}

export interface Violation {
  error: string
  hint: string
}

/**
 * Luật của lượt đọc, ép bằng code thay vì dặn trong prompt. Prompt v9→v18 đã
 * tốn mười vòng cãi nhau với model về đúng những luật này; code thì không cần
 * thuyết phục. Vi phạm trả về như một tool result có `error` + `hint`, để model
 * tự sửa ngay trong lượt kế.
 */
export function checkToolCall(
  call: ModelToolCall,
  args: Record<string, unknown>,
  input: PolicyInput,
): Violation | null {
  const history = completedCalls(input.transcript)
  const name = call.function.name

  if (name === 'ask_user') {
    const readings = history.filter((item) => READING_TOOLS.has(item.name))
    if (!readings.length) {
      return {
        error: 'Chưa rút bài hay gieo quẻ nên chưa được hỏi.',
        hint: 'Rút bài hoặc gieo quẻ ngay với những gì đang có, rồi mới đoán và hỏi.',
      }
    }
    const asked = history.filter((item) => item.name === 'ask_user')
    if (asked.some((item) => wasSkipped(item.result))) {
      return {
        error: 'Người hỏi đã bỏ qua câu làm rõ.',
        hint: 'Không hỏi thêm. Viết bài đọc ngay với những gì đang có.',
      }
    }
    if (asked.length >= MAX_QUESTIONS) {
      return {
        error: `Đã hỏi đủ ${MAX_QUESTIONS} câu.`,
        hint: 'Không hỏi thêm. Viết bài đọc đầy đủ ngay bây giờ.',
      }
    }
    const basedOn = normalise(String(args.based_on ?? ''))
    const names = input.revealedNames.map(normalise).filter(Boolean)
    const matches = names.some(
      (item) => basedOn.includes(item) || (basedOn.length >= 3 && item.includes(basedOn)),
    )
    if (names.length && !matches) {
      return {
        error: '`based_on` không khớp lá hay quẻ nào vừa ra.',
        hint: `Chép đúng một trong các tên: ${input.revealedNames.join(', ')}.`,
      }
    }
    return null
  }

  if (READING_TOOLS.has(name)) {
    const readings = history.filter((item) => READING_TOOLS.has(item.name))
    if (readings.length >= MAX_READINGS) {
      return {
        error: `Đã rút/gieo ${MAX_READINGS} lượt cho vấn đề này.`,
        hint: 'Không rút thêm. Gộp các lượt đã có thành một bài đọc và chốt.',
      }
    }
    if (name === 'cast_iching' && readings.some((item) => item.name === 'cast_iching')) {
      return {
        error: 'Mỗi lượt chỉ gieo một quẻ.',
        hint: 'Đọc quẻ đã gieo; không gieo lại.',
      }
    }
  }

  return null
}

interface CompletedCall {
  name: string
  result: string
}

/** Các tool call trong transcript đã có kết quả, theo thứ tự gọi. */
export function completedCalls(transcript: ModelMessage[]): CompletedCall[] {
  const results = new Map<string, string>()
  for (const message of transcript) {
    if (message.role === 'tool' && message.tool_call_id) {
      results.set(message.tool_call_id, message.content ?? '')
    }
  }
  const calls: CompletedCall[] = []
  for (const message of transcript) {
    for (const call of message.tool_calls ?? []) {
      const result = results.get(call.id)
      // Lời gọi bị luật chặn thì không tính là đã rút hay đã hỏi.
      if (result !== undefined && !isViolation(result)) {
        calls.push({ name: call.function.name, result })
      }
    }
  }
  return calls
}

/** Kết quả trả lời câu làm rõ, có cấu trúc để luật đọc được mà không phải đoán chữ. */
export function clarifyResult(answer: string, skipped: boolean, asked: number): string {
  return JSON.stringify({
    answer: skipped ? null : answer,
    skipped,
    asked,
    remaining: skipped ? 0 : Math.max(0, MAX_QUESTIONS - asked),
  })
}

export function violationResult(violation: Violation): string {
  return JSON.stringify({ error: violation.error, hint: violation.hint, policy: true })
}

function isViolation(result: string): boolean {
  return result.startsWith('{') && result.includes('"policy":true')
}

function wasSkipped(result: string): boolean {
  if (result.includes('"skipped":true')) return true
  // Run đỗ từ trước khi có kết quả dạng JSON.
  return result.startsWith('Người hỏi bỏ qua')
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFC')
    .replace(/[()"'`.,:;!?]/g, ' ')
    .split(/\s+/)
    .join(' ')
    .trim()
}
