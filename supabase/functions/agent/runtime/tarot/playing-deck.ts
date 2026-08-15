import type { DrawnCard, HiddenCard, PlayingCard } from '../../../_shared/types.ts'
import { pick } from './deck.ts'
import { humanShuffle } from './shuffle.ts'

/**
 * Bộ bài tây 52 lá. Khác tarot ở chỗ không có lá ngược: mặt sau và hoa văn đối
 * xứng nên chiều lá không mang nghĩa gì, xào mà lật chiều chỉ là bịa thêm.
 */
export class PlayingDeck {
  constructor(private readonly cards: PlayingCard[]) {}

  get size(): number {
    return this.cards.length
  }

  shuffle(): HiddenCard[] {
    return humanShuffle(this.cards, { allowFlips: false }).map((slot) => ({
      card_id: slot.value.id,
      orientation: 'upright' as const,
    }))
  }

  reveal(shuffled: HiddenCard[], indices: number[], positions: string[]): DrawnCard[] {
    const byId = new Map(this.cards.map((card) => [card.id, card]))
    return pick(shuffled, indices, positions).map(({ hidden, position }) => {
      const card = byId.get(hidden.card_id)
      if (!card) throw new Error('Lá bài không còn trong bộ.')
      return {
        id: card.id,
        deck: 'playing' as const,
        name: card.id,
        name_vi: card.name_vi,
        arcana: 'playing',
        suit: card.suit,
        image: card.image,
        orientation: 'upright' as const,
        position,
        keywords: card.keywords,
        meaning: card.meaning,
      }
    })
  }
}
