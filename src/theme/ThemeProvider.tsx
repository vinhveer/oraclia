import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { applyPalette, palettes, type Palette } from './palettes'

type Mode = 'light' | 'dark'

interface ThemeValue {
  mode: Mode
  toggleMode: () => void
  palette: Palette
  setPaletteId: (id: string) => void
  palettes: Palette[]
}

const ThemeContext = createContext<ThemeValue | null>(null)

const MODE_KEY = 'md3.mode'
const PALETTE_KEY = 'md3.palette'

function initialMode(): Mode {
  const stored = localStorage.getItem(MODE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [paletteId, setPaletteId] = useState(
    () => localStorage.getItem(PALETTE_KEY) ?? palettes[0].id,
  )

  const palette = useMemo(
    () => palettes.find((entry) => entry.id === paletteId) ?? palettes[0],
    [paletteId],
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
    localStorage.setItem(MODE_KEY, mode)
  }, [mode])

  useEffect(() => {
    applyPalette(palette, mode === 'dark')
    localStorage.setItem(PALETTE_KEY, palette.id)
  }, [palette, mode])

  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo<ThemeValue>(
    () => ({ mode, toggleMode, palette, setPaletteId, palettes }),
    [mode, toggleMode, palette],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside a <ThemeProvider>')
  return value
}
