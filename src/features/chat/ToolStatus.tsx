import { CircularProgress, Icon } from '@/components'
import { cn } from '@/lib/cn'
import type { ToolActivity } from './useChat'

const labels: Record<string, string> = {
  draw_cards: 'Xáo bài',
  lookup_cards: 'Tra nghĩa lá bài',
  cast_iching: 'Gieo quẻ Kinh Dịch',
}

/** Shows what the agent is doing between "sent" and "answering". */
export function ToolStatus({ tools, thinking }: { tools: ToolActivity[]; thinking: boolean }) {
  if (!tools.length && !thinking) return null

  return (
    <div className="md-fade-in flex flex-col gap-1.5">
      {thinking && !tools.length && (
        <Row icon={<CircularProgress size={16} />} text="Oraclia đang lắng nghe câu hỏi..." />
      )}
      {tools.map((tool) => (
        <Row
          key={tool.callId}
          icon={
            tool.status === 'running' ? (
              <CircularProgress size={16} />
            ) : (
              <Icon
                name={tool.status === 'failed' ? 'error' : 'check'}
                size={16}
                className={tool.status === 'failed' ? 'text-error' : 'text-primary'}
              />
            )
          }
          text={`${labels[tool.name] ?? tool.name} · ${tool.detail}`}
          muted={tool.status === 'completed'}
        />
      ))}
    </div>
  )
}

function Row({
  icon,
  text,
  muted = false,
}: {
  icon: React.ReactNode
  text: string
  muted?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 md-label-lg',
        muted ? 'text-on-surface-variant' : 'text-on-surface',
      )}
    >
      <span className="grid size-5 shrink-0 place-items-center">{icon}</span>
      {text}
    </div>
  )
}
