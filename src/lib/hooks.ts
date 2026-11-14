import { useEffect, useState, useSyncExternalStore } from 'react'

/** Khớp media query, cập nhật khi đổi kích thước hay đổi chế độ hệ thống. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Giá trị trễ một nhịp: gõ liền tay thì chỉ giá trị cuối được dùng. */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** Màn hình nhỏ: danh sách trò chuyện nằm trong menu, không cố định bên trái. */
export const MOBILE_QUERY = '(max-width: 61.99em)'
