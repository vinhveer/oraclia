import type { DeckKind } from '@db'

/**
 * Mọi khác biệt giữa các bộ bài gom về một chỗ. Thêm bộ mới chỉ cần thêm một
 * mục ở đây, không phải đi sửa từng component.
 */
export interface DeckStyle {
  label: string
  back: string
  /** Tỉ lệ khung ảnh, khác nhau giữa tarot và bài tây. */
  aspect: string
  /** Bài tây hoa văn đối xứng nên chiều lá không mang nghĩa. */
  hasOrientation: boolean
}

export const DECKS: Record<DeckKind, DeckStyle> = {
  tarot: {
    label: 'tarot',
    back: 'cards/CardBacks.png',
    aspect: 'aspect-[300/527]',
    hasOrientation: true,
  },
  playing: {
    label: 'bài tây',
    back: 'baitay/back.png',
    aspect: 'aspect-[226/314]',
    hasOrientation: false,
  },
}

export const deckStyle = (kind: DeckKind = 'tarot'): DeckStyle => DECKS[kind] ?? DECKS.tarot
