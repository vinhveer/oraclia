import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Theme } from '@astryxdesign/core/theme'
import { InternationalizationProvider } from '@astryxdesign/core/i18n'
import viVN from '@astryxdesign/core/locales/vi-VN.generated.js'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { useMediaQuery } from '@/lib/hooks'
import { findPalette, palettes, type Palette } from './palettes'

const COLOR_SCHEME_KEY = 'oraclia.color-scheme'
const PALETTE_KEY = 'oraclia.palette'

export type ColorScheme = 'light' | 'dark' | 'auto'

interface ThemeValue {
  palette: Palette
  setPaletteId: (id: string) => void
  palettes: Palette[]
  colorScheme: ColorScheme
  /** Sáng hay tối thật sự đang hiện (đã giải 'auto'). */
  resolvedScheme: 'light' | 'dark'
  setColorScheme: (scheme: ColorScheme) => void
}

const ThemeContext = createContext<ThemeValue | null>(null)

/**
 * Chữ của chính Astryx (nút gửi, nút cuộn, nút đóng…) theo tiếng Việt. Vài
 * nhãn đổi cho khớp cách nói sẵn có của Oraclia.
 */
const MESSAGES = { 'vi-VN': viVN }
const OVERRIDES = {
  'vi-VN': {
    '@astryx.chatLayoutScrollButton.scrollToBottom': 'Xuống cuối',
    '@astryx.chat.composer.placeholder': 'Hỏi một điều…',
    '@astryx.alertDialog.cancel': 'Huỷ',
  },
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Chế độ riêng tư chặn localStorage: vẫn chạy, chỉ không nhớ.
  }
}

function storedScheme(): ColorScheme {
  const value = read(COLOR_SCHEME_KEY)
  return value === 'light' || value === 'dark' ? value : 'auto'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Khoá cũ từ bản Material 3: giữ lựa chọn của người đã chọn trước đây.
  const [paletteId, setPaletteId] = useState(
    () => findPalette(read(PALETTE_KEY) ?? read('md3.palette')).id,
  )
  const [colorScheme, setScheme] = useState<ColorScheme>(storedScheme)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const resolvedScheme = colorScheme === 'auto' ? (systemDark ? 'dark' : 'light') : colorScheme
  const palette = findPalette(paletteId)

  useEffect(() => {
    write(PALETTE_KEY, palette.id)
    // oraclia.css đổi token màu nhấn theo thuộc tính này; script trước khi vẽ
    // (index.html) cũng đặt nó, nên lần vẽ đầu đã đúng màu.
    document.documentElement.dataset.palette = palette.id
  }, [palette])

  // Thanh địa chỉ trên mobile đổi màu theo nền, không đứng mãi một màu.
  useEffect(() => {
    const color = resolvedScheme === 'dark' ? '#141218' : '#fdfbfe'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
    document.documentElement.style.background = color
  }, [resolvedScheme])

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    write(COLOR_SCHEME_KEY, scheme)
    setScheme(scheme)
  }, [])

  const value = useMemo<ThemeValue>(
    () => ({ palette, setPaletteId, palettes, colorScheme, resolvedScheme, setColorScheme }),
    [palette, colorScheme, resolvedScheme, setColorScheme],
  )

  return (
    <ThemeContext.Provider value={value}>
      <InternationalizationProvider locale="vi-VN" messages={MESSAGES} overrides={OVERRIDES}>
        {/* Luôn truyền chế độ đã giải (không dùng 'system'): Astryx bỏ data-theme
            khỏi <html> ở 'system', còn script trước khi vẽ thì đặt nó — hai bên
            phải nói cùng một điều để lần vẽ đầu không nháy. */}
        <Theme theme={neutralTheme} mode={resolvedScheme}>
          {children}
        </Theme>
      </InternationalizationProvider>
    </ThemeContext.Provider>
  )
}

export function useAppTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useAppTheme must be used inside a <ThemeProvider>')
  return value
}
