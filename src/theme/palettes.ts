/**
 * Bốn màu chủ đạo của Oraclia. Chỉ màu nhấn đổi theo lựa chọn; nền, chữ, viền
 * giữ nguyên để đổi màu không làm đổi độ tương phản của cả app.
 */
export interface Palette {
  id: string
  name: string
  /** Màu gốc: sinh ra 10 sắc độ cho Mantine, và là swatch trong trang Giao diện. */
  seed: string
}

export const palettes: Palette[] = [
  { id: 'violet', name: 'Tím', seed: '#6750a4' },
  { id: 'teal', name: 'Lam ngọc', seed: '#00696d' },
  { id: 'amber', name: 'Hổ phách', seed: '#815500' },
  { id: 'rose', name: 'Hồng đất', seed: '#9c4146' },
]

export const DEFAULT_PALETTE = palettes[0]

export const findPalette = (id: string | null | undefined): Palette =>
  palettes.find((palette) => palette.id === id) ?? DEFAULT_PALETTE
