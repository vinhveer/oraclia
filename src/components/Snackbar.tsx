import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { Ripple } from './Ripple'
import { cn } from '@/lib/cn'

export interface SnackbarOptions {
  message: string
  actionLabel?: string
  onAction?: () => void
  /** ms before auto-dismiss; 0 keeps it up until dismissed. */
  duration?: number
  dismissible?: boolean
}

interface SnackbarEntry extends SnackbarOptions {
  id: number
}

const SnackbarContext = createContext<((options: SnackbarOptions) => void) | null>(null)

let snackId = 0

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<SnackbarEntry[]>([])

  const dismiss = useCallback((id: number) => {
    setQueue((prev) => prev.filter((entry) => entry.id !== id))
  }, [])

  const show = useCallback((options: SnackbarOptions) => {
    // M3 shows one snackbar at a time; a new one replaces the current.
    setQueue([{ ...options, id: ++snackId }])
  }, [])

  const value = useMemo(() => show, [show])

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex flex-col items-center gap-2 p-4">
          {queue.map((entry) => (
            <SnackbarView key={entry.id} entry={entry} onDismiss={() => dismiss(entry.id)} />
          ))}
        </div>,
        document.body,
      )}
    </SnackbarContext.Provider>
  )
}

export function useSnackbar() {
  const show = useContext(SnackbarContext)
  if (!show) throw new Error('useSnackbar must be used inside a <SnackbarProvider>')
  return show
}

function SnackbarView({ entry, onDismiss }: { entry: SnackbarEntry; onDismiss: () => void }) {
  const { duration = 4000 } = entry

  useEffect(() => {
    if (duration <= 0) return
    const timer = window.setTimeout(onDismiss, duration)
    return () => window.clearTimeout(timer)
  }, [duration, onDismiss])

  return (
    <div
      role="status"
      className="md-slide-up pointer-events-auto flex min-h-12 w-full max-w-[560px] items-center gap-2 rounded-xs bg-inverse-surface px-4 py-2 text-inverse-on-surface shadow-e3"
    >
      <span className="flex-1 md-body-md">{entry.message}</span>
      {entry.actionLabel && (
        <button
          type="button"
          onClick={() => {
            entry.onAction?.()
            onDismiss()
          }}
          className="group relative -mr-1 overflow-hidden rounded-full px-3 py-2 md-label-lg text-inverse-primary"
        >
          <Ripple />
          <span className="relative z-10">{entry.actionLabel}</span>
        </button>
      )}
      {entry.dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={cn('group relative rounded-full p-2 hover:bg-current/10')}
        >
          <Icon name="close" size={18} />
        </button>
      )}
    </div>
  )
}
