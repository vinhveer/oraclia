import type { AgentEvent } from '@db'

/**
 * Dòng hoạt động của một lượt. Trước đây giao diện suy ra "đang làm gì" từ một
 * biến `phase` được gán ở hơn mười chỗ, nên mỗi lần thêm một loại sự kiện lại
 * sót một tổ hợp và màn hình đứng im. Ở đây mọi sự kiện đi qua đúng một hàm
 * thuần, và giao diện chỉ việc vẽ lại danh sách này.
 */
export type ActivityKind = 'listening' | 'thinking' | 'tool' | 'awaiting_cards'

export interface Activity {
  id: string
  kind: ActivityKind
  label: string
  /** Chữ phụ: mẩu suy nghĩ đang chảy, hoặc tóm tắt kết quả của công cụ. */
  detail: string
  status: 'running' | 'done' | 'failed'
}

export interface TurnState {
  activities: Activity[]
  /** Chữ trả lời đã bắt đầu chảy — từ lúc này bản thân nội dung là chỉ báo. */
  answering: boolean
}

export const IDLE_TURN: TurnState = { activities: [], answering: false }

export const LISTENING: Activity = {
  id: 'listening',
  kind: 'listening',
  label: 'Oraclia đang lắng nghe câu hỏi',
  detail: '',
  status: 'running',
}

const WAITING_LABEL = 'Oraclia đang giải nghĩa'
const THINKING_LABEL = 'Oraclia đang suy nghĩ'

const TOOL_LABELS: Record<string, string> = {
  draw_cards: 'Xáo bài',
  cast_iching: 'Gieo quẻ Kinh Dịch',
  lookup_cards: 'Tra nghĩa lá bài',
  remember: 'Ghi nhớ',
  compact_history: 'Cô đọng bộ nhớ',
}

/** Bắt đầu một lượt: luôn có sẵn một chỉ báo trước cả khi server kịp trả lời. */
export function startTurn(): TurnState {
  return { activities: [LISTENING], answering: false }
}

const settle = (activities: Activity[]): Activity[] =>
  activities.map((item) => (item.status === 'running' ? { ...item, status: 'done' } : item))

const isRunning = (activities: Activity[]) => activities.some((item) => item.status === 'running')

/** Mở lại một chỗ chờ nếu vừa đóng hết — đây là chỗ giữ bất biến "không bao giờ trống". */
function waiting(activities: Activity[], label = WAITING_LABEL): Activity[] {
  if (isRunning(activities)) return activities
  return [
    ...activities,
    { id: `wait-${activities.length}`, kind: 'thinking', label, detail: '', status: 'running' },
  ]
}

export function reduceTurn(state: TurnState, event: AgentEvent): TurnState {
  const { activities } = state

  switch (event.type) {
    case 'thinking.delta': {
      const last = activities.at(-1)
      if (last?.status === 'running' && last.kind === 'thinking') {
        return {
          ...state,
          activities: [
            ...activities.slice(0, -1),
            {
              ...last,
              label: THINKING_LABEL,
              detail: (last.detail + event.content).slice(-8000),
            },
          ],
        }
      }
      return {
        ...state,
        activities: [
          ...settle(activities),
          {
            id: `think-${activities.length}`,
            kind: 'thinking',
            label: THINKING_LABEL,
            detail: event.content,
            status: 'running',
          },
        ],
      }
    }

    case 'tool.started':
      return {
        ...state,
        activities: [
          ...settle(activities),
          {
            id: event.call_id,
            kind: 'tool',
            label: TOOL_LABELS[event.name] ?? event.name,
            detail: describeArguments(event.name, event.arguments),
            status: 'running',
          },
        ],
      }

    case 'tool.completed':
    case 'tool.failed': {
      const done = activities.map((item) =>
        item.id === event.call_id
          ? {
              ...item,
              status: (event.type === 'tool.failed' ? 'failed' : 'done') as Activity['status'],
              detail: event.type === 'tool.failed' ? event.message : event.summary || item.detail,
            }
          : item,
      )
      // Công cụ xong thì model lại nghĩ tiếp; đừng để khoảng trống ở giữa.
      return { ...state, activities: state.answering ? done : waiting(done) }
    }

    case 'draw.requested':
      return {
        ...state,
        activities: [
          ...settle(activities),
          {
            id: `draw-${event.reading_id}`,
            kind: 'awaiting_cards',
            label: `Chờ bạn chọn ${event.pick_count} lá`,
            detail: event.reason,
            status: 'running',
          },
        ],
      }

    case 'cards.revealed':
    case 'iching.cast':
      return { ...state, activities: waiting(settle(activities)) }

    case 'message.delta':
      // Chữ đã chảy: bản thân nó là chỉ báo, không cần dòng chờ nào nữa.
      return { activities: settle(activities), answering: true }

    case 'run.error':
      return {
        ...state,
        activities: activities.map((item) =>
          item.status === 'running' ? { ...item, status: 'failed', detail: event.message } : item,
        ),
      }

    case 'message.completed':
    case 'run.completed':
      return { ...state, activities: settle(activities) }

    default:
      return state
  }
}

function describeArguments(name: string, args: Record<string, unknown>): string {
  if (name === 'draw_cards') {
    const positions = Array.isArray(args.positions) ? args.positions.length : 0
    return positions ? `Chuẩn bị ${positions} lá` : 'Chuẩn bị lượt rút bài'
  }
  if (name === 'cast_iching') return 'Ba đồng xu, sáu lần gieo'
  if (name === 'lookup_cards') return 'Tra nghĩa tham khảo'
  return ''
}

/**
 * Bất biến của cả màn hình: khi lượt chưa xong thì phải có một chỉ báo đang
 * chạy, hoặc chữ đang chảy. Vi phạm nghĩa là người dùng đang nhìn vào khoảng
 * trống và tưởng ứng dụng treo — đúng loại lỗi đã tái đi tái lại.
 */
export function hasIndicator(state: TurnState): boolean {
  return state.answering || isRunning(state.activities)
}
