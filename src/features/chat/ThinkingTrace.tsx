import { useState } from 'react'
import { CircularProgress, Icon } from '@/components'

/**
 * Khoảng chờ trước khi Oraclia nói câu đầu tiên. Model có reasoning phát ra cả
 * một dòng suy nghĩ trước đó — hiện nó lên để người dùng thấy có gì đang chạy,
 * chứ không phải màn hình treo.
 */
export function ThinkingTrace({ thinking }: { thinking: string }) {
  const [open, setOpen] = useState(false)
  const reasoning = thinking.trim()
  const tail = reasoning.length > 180 ? `...${reasoning.slice(-180)}` : reasoning

  return (
    <div className="md-fade-in mt-5 flex items-start gap-2 text-on-surface-variant">
      <span className="mt-0.5 shrink-0">
        <CircularProgress size={16} />
      </span>

      <div className="min-w-0 flex-1">
        {reasoning ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex items-center gap-1 md-label-lg transition-colors hover:text-on-surface"
            aria-expanded={open}
          >
            Oraclia đang suy nghĩ
            <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} />
          </button>
        ) : (
          <span className="md-label-lg">Oraclia đang giải nghĩa</span>
        )}

        {reasoning &&
          (open ? (
            <p className="mt-1.5 max-h-64 overflow-y-auto border-l-2 border-outline-variant pl-3 md-body-sm whitespace-pre-wrap opacity-70">
              {reasoning}
            </p>
          ) : (
            <p className="mt-0.5 line-clamp-2 md-body-sm opacity-60">{tail}</p>
          ))}
      </div>
    </div>
  )
}
