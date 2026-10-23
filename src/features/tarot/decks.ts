import type { DeckKind } from '@db'

/**
 * Mọi khác biệt giữa các bộ bài gom về một chỗ. Thêm bộ mới chỉ cần thêm một
 * mục ở đây, không phải đi sửa từng component.
 */
export interface DeckStyle {
  label: string
  back: string
  /** Kích thước gốc của ảnh, để giữ chỗ đúng tỉ lệ trước khi ảnh tải xong. */
  width: number
  height: number
  /** Bài tây hoa văn đối xứng nên chiều lá không mang nghĩa. */
  hasOrientation: boolean
}

export const DECKS: Record<DeckKind, DeckStyle> = {
  tarot: {
    label: 'tarot',
    back: 'cards/CardBacks.png',
    width: 300,
    height: 527,
    hasOrientation: true,
  },
  playing: {
    label: 'bài tây',
    back: 'baitay/back.png',
    width: 226,
    height: 314,
    hasOrientation: false,
  },
}

export const deckStyle = (kind: DeckKind = 'tarot'): DeckStyle => DECKS[kind] ?? DECKS.tarot

export const orientationLabel = (orientation: string) =>
  orientation === 'reversed' ? 'Ngược' : 'Xuôi'
