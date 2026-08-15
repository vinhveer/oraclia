import { Icon } from '@/components'
import { useTheme } from '@/theme/ThemeProvider'
import { cn } from '@/lib/cn'
import { SettingsLayout } from './SettingsLayout'

export default function AppearancePage() {
  const { mode, toggleMode, palette, setPaletteId, palettes } = useTheme()

  return (
    <SettingsLayout title="Chế độ" description="Áp dụng ngay và nhớ cho lần sau.">
      <section>
        <h2 className="mb-3 md-title-sm text-on-surface">Nền</h2>
        <div className="flex gap-2">
          {(['light', 'dark'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                if (mode !== value) toggleMode()
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-4 md-label-lg transition-colors',
                mode === value
                  ? 'border-primary bg-primary-container text-on-primary-container'
                  : 'border-outline-variant text-on-surface-variant hover:bg-surface-high',
              )}
            >
              <Icon name={value === 'dark' ? 'darkMode' : 'lightMode'} size={20} />
              {value === 'dark' ? 'Tối' : 'Sáng'}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 md-title-sm text-on-surface">Màu chủ đạo</h2>
        <div className="flex flex-wrap gap-3">
          {palettes.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setPaletteId(entry.id)}
              aria-pressed={entry.id === palette.id}
              className={cn(
                'flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 md-label-lg transition-colors',
                entry.id === palette.id
                  ? 'border-primary text-on-surface'
                  : 'border-outline-variant text-on-surface-variant hover:bg-surface-high',
              )}
            >
              <span
                className="size-7 rounded-full"
                style={{ backgroundColor: entry.seed }}
                aria-hidden
              />
              {entry.name}
            </button>
          ))}
        </div>
      </section>
    </SettingsLayout>
  )
}
