import { useEffect, type RefObject } from 'react'

/**
 * Closes a transient surface (menu, popover, dialog) on outside pointer press
 * or Escape. Listens on the capture-free bubble phase so a trigger's own click
 * handler runs first.
 */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onDismiss: () => void,
  options: { outside?: boolean } = {},
) {
  const { outside = true } = options

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }

    const onPointerDown = (event: PointerEvent) => {
      const el = ref.current
      if (el && !el.contains(event.target as Node)) onDismiss()
    }

    document.addEventListener('keydown', onKeyDown)
    if (outside) document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [ref, open, onDismiss, outside])
}
