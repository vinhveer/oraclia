import { useState } from 'react'
import { CircularProgress, Icon } from '@/components'
import { cn } from '@/lib/cn'
import type { Activity } from './activity'

/**
 * Vẽ đúng dòng hoạt động mà reducer sinh ra — không suy đoán gì thêm. Trước đây
 * phần này bị chia làm hai chỗ render khác nhau, nên có lúc chỉ báo hiện phía
 * trên cả lá bài, có lúc không hiện gì cả.
 */
export function ActivityTrace({ activities }: { activities: Activity[] }) {
  if (!activities.length) return null

  return (
    <div className="md-fade-in mt-4 flex flex-col gap-1.5">
      {activities.map((activity) => (
        <Row key={activity.id} activity={activity} />
      ))}
    </div>
  )
}

function Row({ activity }: { activity: Activity }) {
  const [open, setOpen] = useState(false)
  const running = activity.status === 'running'
  // Dòng suy nghĩ dài thì cho bung ra đọc; những dòng khác chỉ có một câu.
  const expandable = activity.kind === 'thinking' && activity.detail.length > 0
  const tail =
    activity.detail.length > 180 ? `...${activity.detail.slice(-180)}` : activity.detail

  return (
    <div
      className={cn(
        'flex items-start gap-2',
        activity.status === 'failed' ? 'text-error' : 'text-on-surface-variant',
      )}
    >
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center">
        {running ? (
          <CircularProgress size={16} />
        ) : (
          <Icon
            name={activity.status === 'failed' ? 'error' : 'check'}
            size={16}
            className={activity.status === 'failed' ? 'text-error' : 'text-primary'}
          />
        )}
      </span>

      <div className="min-w-0 flex-1">
        {expandable ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="flex items-center gap-1 md-label-lg transition-colors hover:text-on-surface"
          >
            {activity.label}
            <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} />
          </button>
        ) : (
          <p className="md-label-lg">
            {activity.label}
            {activity.detail && !expandable && (
              <span className="opacity-70"> · {activity.detail}</span>
            )}
          </p>
        )}

        {expandable &&
          (open ? (
            <p className="mt-1.5 max-h-64 overflow-y-auto border-l-2 border-outline-variant pl-3 md-body-sm whitespace-pre-wrap opacity-70">
              {activity.detail}
            </p>
          ) : (
            running && <p className="mt-0.5 line-clamp-2 md-body-sm opacity-60">{tail}</p>
          ))}
      </div>
    </div>
  )
}
