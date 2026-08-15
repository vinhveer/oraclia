/**
 * Nạp một lần, dùng lại mãi. Dùng cho những thứ đắt mà phần lớn lượt không cần
 * tới — nạp sẵn là bắt mọi câu hỏi trả giá cho một khả năng.
 */
export type Lazy<T> = () => Promise<T>

export function memo<T>(load: () => Promise<T>): Lazy<T> {
  let cached: Promise<T> | null = null
  return () => (cached ??= load())
}
