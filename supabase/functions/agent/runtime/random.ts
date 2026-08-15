/** Số ngẫu nhiên mã hoá, loại bỏ lệch modulo bằng rejection sampling. */
export function randomInt(bound: number): number {
  if (bound <= 1) return 0
  const limit = Math.floor(0xffffffff / bound) * bound
  const buffer = new Uint32Array(1)
  let value = 0
  do {
    crypto.getRandomValues(buffer)
    value = buffer[0]
  } while (value >= limit)
  return value % bound
}

export function randomFloat(): number {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return buffer[0] / 0x100000000
}

export function coinFlip(): boolean {
  return randomInt(2) === 1
}
