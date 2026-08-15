import type { DrawnCard, HiddenCard, Orientation, TarotCard } from '../../../_shared/types.ts'
import { humanShuffle } from './shuffle.ts'

/** Bộ 78 lá tarot: có chiều xuôi/ngược, mỗi chiều một nghĩa. */
export class Deck {
  constructor(private readonly cards: TarotCard[]) {}

  get size(): number {
    return this.cards.length
  }

  shuffle(): HiddenCard[] {
    return humanShuffle(this.cards).map((slot) => ({
      card_id: slot.value.id,
      orientation: (slot.flipped ? 'reversed' : 'upright') as Orientation,
    }))
  }

  /** Lật các lá người hỏi đã chọn, theo đúng thứ tự vị trí đã đặt tên. */
  reveal(shuffled: HiddenCard[], indices: number[], positions: string[]): DrawnCard[] {
    const byId = new Map(this.cards.map((card) => [card.id, card]))
    return pick(shuffled, indices, positions).map(({ hidden, position }) => {
      const card = byId.get(hidden.card_id)
      if (!card) throw new Error('Lá bài không còn trong bộ.')
      return {
        id: card.id,
        deck: 'tarot' as const,
        name: card.name,
        name_vi: card.name_vi,
        arcana: card.arcana,
        suit: card.suit,
        image: card.image,
        orientation: hidden.orientation,
        position,
        keywords: card.keywords,
        meaning: hidden.orientation === 'reversed' ? card.reversed : card.upright,
      }
    })
  }
}

/**
 * Kiểm tra lựa chọn dùng chung cho mọi bộ bài: đúng số lá, không trùng, không
 * vượt biên. Chỗ này là ranh giới tin cậy — chỉ số đến từ trình duyệt.
 */
export function pick(
  shuffled: HiddenCard[],
  indices: number[],
  positions: string[],
): { hidden: HiddenCard; position: string }[] {
  if (!positions.length || indices.length !== positions.length) {
    throw new Error('Hãy chọn đúng số lá.')
  }
  if (new Set(indices).size !== indices.length) throw new Error('Không thể chọn trùng một lá.')
  if (indices.some((index) => !Number.isInteger(index) || index < 0 || index >= shuffled.length)) {
    throw new Error('Lá bài được chọn không hợp lệ.')
  }
  return indices.map((index, slot) => ({ hidden: shuffled[index], position: positions[slot] }))
}
