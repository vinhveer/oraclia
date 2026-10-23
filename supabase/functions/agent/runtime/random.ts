/**
 * SHUFFLE_SEED chỉ dành cho eval cục bộ: cùng câu hỏi, cùng lá, để so hai phiên
 * bản prompt trên đúng một trải bài. Production không đặt biến này nên luôn dùng
 * số ngẫu nhiên mã hoá — bộ bài úp không được đoán trước.
 */
const seeded = (() => {
  const seed = Deno.env.get('SHUFFLE_SEED')
  if (!seed) return null
  // mulberry32: đủ đều cho xáo bài, và tái lập được tuyệt đối.
  let state = [...seed].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261)
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return (value ^ (value >>> 14)) >>> 0
  }
})()

function nextUint32(): number {
  if (seeded) return seeded()
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return buffer[0]
}

/** Số ngẫu nhiên mã hoá, loại bỏ lệch modulo bằng rejection sampling. */
export function randomInt(bound: number): number {
  if (bound <= 1) return 0
  const limit = Math.floor(0xffffffff / bound) * bound
  let value = 0
  do {
    value = nextUint32()
  } while (value >= limit)
  return value % bound
}

export function randomFloat(): number {
  return nextUint32() / 0x100000000
}

export function coinFlip(): boolean {
  return randomInt(2) === 1
}
