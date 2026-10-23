import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  localStorageColorSchemeManager,
  MantineProvider,
  useComputedColorScheme,
} from '@mantine/core'
import { findPalette, palettes, type Palette } from './palettes'
import { buildTheme, cssVariablesResolver } from './theme'

const COLOR_SCHEME_KEY = 'oraclia.color-scheme'
const PALETTE_KEY = 'oraclia.palette'

interface PaletteValue {
  palette: Palette
  setPaletteId: (id: string) => void
  palettes: Palette[]
}

const PaletteContext = createContext<PaletteValue | null>(null)

const colorSchemeManager = localStorageColorSchemeManager({ key: COLOR_SCHEME_KEY })

function storedPalette(): string | null {
  try {
    // Khoá cũ từ bản Material 3: giữ lựa chọn của người đã chọn trước đây.
    return localStorage.getItem(PALETTE_KEY) ?? localStorage.getItem('md3.palette')
  } catch {
    return null
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [paletteId, setPaletteId] = useState(() => findPalette(storedPalette()).id)
  const palette = findPalette(paletteId)
  const theme = useMemo(() => buildTheme(palette), [palette])

  useEffect(() => {
    try {
      localStorage.setItem(PALETTE_KEY, palette.id)
    } catch {
      // Chế độ riêng tư chặn localStorage: vẫn chạy, chỉ không nhớ.
    }
    // Script trước khi vẽ (index.html) đọc thuộc tính này để tô thanh trình duyệt.
    document.documentElement.dataset.palette = palette.id
  }, [palette])

  const value = useMemo(() => ({ palette, setPaletteId, palettes }), [palette])

  return (
    <PaletteContext.Provider value={value}>
      <MantineProvider
        theme={theme}
        colorSchemeManager={colorSchemeManager}
        defaultColorScheme="auto"
        cssVariablesResolver={cssVariablesResolver}
      >
        <ThemeColorMeta />
        {children}
      </MantineProvider>
    </PaletteContext.Provider>
  )
}

/** Thanh địa chỉ trên mobile đổi màu theo nền, không đứng mãi một màu tím. */
function ThemeColorMeta() {
  const scheme = useComputedColorScheme('light')
  useEffect(() => {
    const color = scheme === 'dark' ? '#141218' : '#fdfbfe'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
  }, [scheme])
  return null
}

export function usePalette() {
  const value = useContext(PaletteContext)
  if (!value) throw new Error('usePalette must be used inside a <ThemeProvider>')
  return value
}
