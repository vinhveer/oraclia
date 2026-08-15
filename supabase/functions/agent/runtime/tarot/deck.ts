import type { DrawnCard, HiddenCard, Orientation, TarotCard } from '../../../_shared/types.ts'
import { coinFlip, randomFloat, randomInt } from '../random.ts'

/**
 * Bảy lần riffle là ngưỡng Bayer–Diaconis: dưới mức đó cỗ bài vẫn còn nhớ thứ
 * tự cũ, quá mức đó thì thêm nữa cũng không khác gì.
 */
const RIFFLE_ROUNDS = 7

export class Deck {
  constructor(private readonly cards: TarotCard[]) {}

  get size(): number {
    return this.cards.length
  }

  /**
   * Xào theo đúng cách người ta xào thật: riffle (chia đôi rồi đan), overhand
   * (bốc từng nhúm), cắt bài, và quay ngược vài đoạn để sinh lá ngược — thay vì
   * hoán vị toán học rồi tung đồng xu cho từng lá.
   */
  shuffle(): HiddenCard[] {
    let stack: HiddenCard[] = this.cards.map((card) => ({
      card_id: card.id,
      orientation: 'upright' as Orientation,
    }))

    for (let round = 0; round < RIFFLE_ROUNDS; round += 1) {
      stack = this.riffle(stack)
      if (randomInt(3) === 0) stack = this.overhand(stack)
      // Quay ngược một đoạn: đây mới là chỗ lá ngược thật sự sinh ra.
      if (randomInt(2) === 0) stack = this.turnPacket(stack)
    }
    // Người xào bao giờ cũng úp cọc bài xuống bàn và cắt một nhát cuối.
    stack = this.turnPacket(stack)
    return this.cut(stack)
  }

  /**
   * Mô hình Gilbert–Shannon–Reeds: cắt tại một điểm phân phối nhị thức, rồi thả
   * lá từ cọc nào có xác suất tỉ lệ với số lá còn lại của cọc đó.
   */
  private riffle(stack: HiddenCard[]): HiddenCard[] {
    const cutAt = binomial(stack.length)
    const left = stack.slice(0, cutAt)
    const right = stack.slice(cutAt)
    const merged: HiddenCard[] = []
    while (left.length || right.length) {
      const total = left.length + right.length
      if (randomFloat() < left.length / total) merged.push(left.shift()!)
      else merged.push(right.shift()!)
    }
    return merged
  }

  /** Bốc từng nhúm từ cọc này chồng ngược sang cọc kia. */
  private overhand(stack: HiddenCard[]): HiddenCard[] {
    const result: HiddenCard[] = []
    let rest = [...stack]
    while (rest.length) {
      const packet = 1 + randomInt(Math.min(12, rest.length))
      result.unshift(...rest.slice(0, packet))
      rest = rest.slice(packet)
    }
    return result
  }

  /** Quay ngang 180° một đoạn liền nhau: thứ tự giữ nguyên, chiều lá đảo lại. */
  private turnPacket(stack: HiddenCard[]): HiddenCard[] {
    const start = randomInt(stack.length)
    const end = start + 1 + randomInt(stack.length - start)
    return stack.map((card, index) =>
      index >= start && index < end
        ? {
            ...card,
            orientation: (card.orientation === 'upright' ? 'reversed' : 'upright') as Orientation,
          }
        : card,
    )
  }

  private cut(stack: HiddenCard[]): HiddenCard[] {
    const at = Math.floor(stack.length / 3) + randomInt(Math.floor(stack.length / 3))
    return [...stack.slice(at), ...stack.slice(0, at)]
  }

  /** Lật các lá người hỏi đã chọn, theo đúng thứ tự vị trí đã đặt tên. */
  reveal(shuffled: HiddenCard[], indices: number[], positions: string[]): DrawnCard[] {
    if (!positions.length || indices.length !== positions.length) {
      throw new Error('Hãy chọn đúng số lá.')
    }
    if (new Set(indices).size !== indices.length) throw new Error('Không thể chọn trùng một lá.')
    if (indices.some((index) => !Number.isInteger(index) || index < 0 || index >= shuffled.length)) {
      throw new Error('Lá bài được chọn không hợp lệ.')
    }

    const byId = new Map(this.cards.map((card) => [card.id, card]))
    return indices.map((index, slot) => {
      const hidden = shuffled[index]
      const card = byId.get(hidden.card_id)
      if (!card) throw new Error('Lá bài không còn trong bộ.')
      return {
        id: card.id,
        name: card.name,
        name_vi: card.name_vi,
        arcana: card.arcana,
        suit: card.suit,
        image: card.image,
        orientation: hidden.orientation,
        position: positions[slot],
        keywords: card.keywords,
        meaning: hidden.orientation === 'reversed' ? card.reversed : card.upright,
      }
    })
  }
}

/** Xấp xỉ nhị thức B(n, 1/2) bằng n lần tung đồng xu. */
function binomial(n: number): number {
  let count = 0
  for (let index = 0; index < n; index += 1) if (coinFlip()) count += 1
  return count
}
