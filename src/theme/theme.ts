import {
  createTheme,
  type CSSVariablesResolver,
  type MantineColorsTuple,
  type MantineThemeOverride,
} from '@mantine/core'
import type { Palette } from './palettes'

/**
 * Nền tối lấy đúng các surface cũ của app (M3, hơi ấm, ngả tím rất nhẹ) thay vì
 * xám lạnh mặc định của Mantine. Thứ tự theo quy ước Mantine: 0 là chữ sáng nhất,
 * 7 là nền trang.
 */
const dark: MantineColorsTuple = [
  '#e6e0e9',
  '#cac4d0',
  '#938f99',
  '#6f6a76',
  '#49454f',
  '#36343b',
  '#211f26',
  '#141218',
  '#0f0d13',
  '#0a090c',
]

/**
 * Mười sắc độ mỗi palette, dựng từ đúng các tông M3 của bản cũ (10/30/40/80/90)
 * và nội suy OKLab cho phần còn lại. Không sinh lúc chạy: bộ sinh màu tự động đặt
 * seed tối vào sắc độ 9, khiến nút chính của Lam ngọc / Hổ phách nhạt tới mức chữ
 * trắng không đọc được. Ở đây sắc độ 7 = primary sáng (chữ trắng ≥ 6.4:1), sắc độ
 * 4 = primary tối (≥ 10.9:1 trên nền tối).
 */
const accentColors: Record<string, MantineColorsTuple> = {
  violet: ['#f9f5ff', '#f2ebff', '#eaddff', '#ddcdff', '#d0bcff', '#b4a0e8', '#8c78c6', '#6750a4', '#4f378b', '#361f74'],
  teal: ['#dbfdfe', '#b3fafd', '#6ff6fb', '#5ee7ed', '#4cd9df', '#3bbcc1', '#209196', '#00696d', '#004f52', '#003739'],
  amber: ['#fff5e7', '#ffebcf', '#ffddaf', '#ffcc82', '#feba4b', '#dda03a', '#ae791f', '#815500', '#623f00', '#452b00'],
  rose: ['#fff4f4', '#ffe9e8', '#ffdad9', '#ffc7c5', '#ffb3b2', '#e69696', '#c16b6d', '#9c4146', '#7e2a30', '#5e151c'],
}

/**
 * Đỏ cho hành động nguy hiểm, lấy từ màu error của bộ M3 cũ. Đỏ mặc định của
 * Mantine (#f03e3e ở sắc độ 7) chỉ đạt ~3.9:1 với chữ trắng và ~3.3:1 khi làm chữ
 * trên nền sáng — nút "Xoá toàn bộ ký ức" trượt kiểm tra tương phản.
 */
const red: MantineColorsTuple = [
  '#fff8f7',
  '#ffedea',
  '#ffdad6',
  '#ffc5bf',
  '#f2b8b5',
  '#e07a72',
  '#cc4a40',
  '#b3261e',
  '#8c1d18',
  '#601410',
]

export function buildTheme(palette: Palette): MantineThemeOverride {
  return createTheme({
    primaryColor: palette.id,
    // Sáng: sắc độ đậm cho nút đặc. Tối: sắc độ nhạt hơn để không chói trên nền đen.
    primaryShade: { light: 7, dark: 4 },
    autoContrast: true,
    colors: { ...accentColors, dark, red },
    fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
    fontFamilyMonospace: 'ui-monospace, "SF Mono", Menlo, monospace',
    headings: {
      fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
      fontWeight: '600',
      sizes: {
        h1: { fontSize: '1.625rem', lineHeight: '1.3' },
        h2: { fontSize: '1.25rem', lineHeight: '1.35' },
        h3: { fontSize: '1.0625rem', lineHeight: '1.4' },
      },
    },
    fontSizes: { xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.0625rem', xl: '1.25rem' },
    lineHeights: { md: '1.65' },
    defaultRadius: 'md',
    radius: { xs: '4px', sm: '6px', md: '8px', lg: '10px', xl: '12px' },
    shadows: {
      xs: '0 1px 2px rgba(0, 0, 0, 0.06)',
      sm: '0 1px 4px rgba(0, 0, 0, 0.08)',
      md: '0 2px 8px rgba(0, 0, 0, 0.10)',
      lg: '0 4px 12px rgba(0, 0, 0, 0.12)',
      xl: '0 6px 16px rgba(0, 0, 0, 0.14)',
    },
    cursorType: 'pointer',
    focusRing: 'auto',
    respectReducedMotion: true,
    components: {
      // iOS phóng to trang khi ô nhập có chữ nhỏ hơn 16px.
      Input: { defaultProps: { size: 'md' } },
      TextInput: { defaultProps: { size: 'md' } },
      PasswordInput: { defaultProps: { size: 'md' } },
      Textarea: { defaultProps: { size: 'md' } },
      Modal: {
        defaultProps: { centered: true, radius: 'lg', closeButtonProps: { 'aria-label': 'Đóng' } },
      },
      // 20px là dưới ngưỡng chạm tối thiểu (24px).
      Checkbox: { defaultProps: { size: 'md' } },
      Tooltip: { defaultProps: { openDelay: 400, withArrow: false } },
    },
  })
}

/** Nền trang sáng ngả ấm theo surface cũ; trắng tinh làm thẻ bài trông lạc tông. */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-body': '#fdfbfe',
    // Xám mặc định của Mantine chỉ đạt ~3.3:1 trên nền này; dùng on-surface-variant
    // của bộ màu cũ để chữ phụ vẫn đọc được (≥ 4.5:1).
    '--mantine-color-dimmed': '#5d5864',
    '--mantine-color-placeholder': '#6f6a76',
    '--app-surface': '#f6f2f8',
    '--app-surface-strong': '#ece6f0',
    '--app-border': '#e2dce6',
  },
  dark: {
    '--mantine-color-body': '#141218',
    '--app-surface': '#1d1b20',
    '--app-surface-strong': '#2b2930',
    '--app-border': '#36343b',
  },
})
