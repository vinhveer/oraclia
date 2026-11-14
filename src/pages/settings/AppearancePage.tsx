import { Icon } from '@astryxdesign/core/Icon'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { IconCheck } from '@tabler/icons-react'
import { useAppTheme, type ColorScheme } from '@/theme/ThemeProvider'
import { SettingsLayout, SettingsSection } from './SettingsLayout'
import classes from './Settings.module.css'

export default function AppearancePage() {
  const { colorScheme, setColorScheme, palette, setPaletteId, palettes } = useAppTheme()

  return (
    <SettingsLayout title="Giao diện" description="Áp dụng ngay và nhớ cho lần sau.">
      <SettingsSection title="Nền">
        <SegmentedControl
          label="Nền"
          layout="fill"
          value={colorScheme}
          onChange={(value) => setColorScheme(value as ColorScheme)}
        >
          <SegmentedControlItem value="light" label="Sáng" />
          <SegmentedControlItem value="dark" label="Tối" />
          <SegmentedControlItem value="auto" label="Tự động" />
        </SegmentedControl>
      </SettingsSection>

      <SettingsSection title="Màu chủ đạo">
        <div className={classes.row}>
          {palettes.map((entry) => {
            const active = entry.id === palette.id
            return (
              <button
                type="button"
                key={entry.id}
                className={classes.option}
                onClick={() => setPaletteId(entry.id)}
                aria-pressed={active}
              >
                <span className={classes.swatch} style={{ background: entry.seed }} aria-hidden="true">
                  {active && <Icon icon={IconCheck} size="sm" />}
                </span>
                <Text type="label">{entry.name}</Text>
              </button>
            )
          })}
        </div>
      </SettingsSection>
    </SettingsLayout>
  )
}
