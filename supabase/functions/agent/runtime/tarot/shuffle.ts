import { coinFlip, randomFloat, randomInt } from '../random.ts'

/**
 * Bảy lần riffle là ngưỡng Bayer–Diaconis: dưới mức đó cỗ bài vẫn còn nhớ thứ
 * tự cũ, quá mức đó thì thêm nữa cũng không khác gì.
 */
const RIFFLE_ROUNDS = 7

export interface Slot<T> {
  value: T
  /** Bài tây không dùng chiều lá; tarot thì có. */
  flipped: boolean
}

/**
 * Xào theo đúng cách người ta xào thật: riffle (chia đôi rồi đan), overhand
 * (bốc từng nhúm), cắt bài, và quay ngược vài đoạn — thay vì hoán vị toán học
 * rồi tung đồng xu cho từng lá.
 */
export function humanShuffle<T>(items: T[], { allowFlips = true } = {}): Slot<T>[] {
  let stack: Slot<T>[] = items.map((value) => ({ value, flipped: false }))

  for (let round = 0; round < RIFFLE_ROUNDS; round += 1) {
    stack = riffle(stack)
    if (randomInt(3) === 0) stack = overhand(stack)
    // Quay ngược một đoạn: đây mới là chỗ lá ngược thật sự sinh ra.
    if (allowFlips && randomInt(2) === 0) stack = turnPacket(stack)
  }
  // Người xào bao giờ cũng úp cọc bài xuống bàn và cắt một nhát cuối.
  if (allowFlips) stack = turnPacket(stack)
  return cut(stack)
}

/**
 * Mô hình Gilbert–Shannon–Reeds: cắt tại một điểm phân phối nhị thức, rồi thả
 * lá từ cọc nào có xác suất tỉ lệ với số lá còn lại của cọc đó.
 */
function riffle<T>(stack: Slot<T>[]): Slot<T>[] {
  const cutAt = binomial(stack.length)
  const left = stack.slice(0, cutAt)
  const right = stack.slice(cutAt)
  const merged: Slot<T>[] = []
  while (left.length || right.length) {
    const total = left.length + right.length
    if (randomFloat() < left.length / total) merged.push(left.shift()!)
    else merged.push(right.shift()!)
  }
  return merged
}

/** Bốc từng nhúm từ cọc này chồng ngược sang cọc kia. */
function overhand<T>(stack: Slot<T>[]): Slot<T>[] {
  const result: Slot<T>[] = []
  let rest = [...stack]
  while (rest.length) {
    const packet = 1 + randomInt(Math.min(12, rest.length))
    result.unshift(...rest.slice(0, packet))
    rest = rest.slice(packet)
  }
  return result
}

/** Quay ngang 180° một đoạn liền nhau: thứ tự giữ nguyên, chiều lá đảo lại. */
function turnPacket<T>(stack: Slot<T>[]): Slot<T>[] {
  const start = randomInt(stack.length)
  const end = start + 1 + randomInt(stack.length - start)
  return stack.map((slot, index) =>
    index >= start && index < end ? { ...slot, flipped: !slot.flipped } : slot,
  )
}

function cut<T>(stack: Slot<T>[]): Slot<T>[] {
  const at = Math.floor(stack.length / 3) + randomInt(Math.floor(stack.length / 3))
  return [...stack.slice(at), ...stack.slice(0, at)]
}

/** Xấp xỉ nhị thức B(n, 1/2) bằng n lần tung đồng xu. */
function binomial(n: number): number {
  let count = 0
  for (let index = 0; index < n; index += 1) if (coinFlip()) count += 1
  return count
}
