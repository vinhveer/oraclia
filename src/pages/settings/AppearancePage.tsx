import { ColorSwatch, Group, SegmentedControl, Text, Title, UnstyledButton } from '@mantine/core'
import { useMantineColorScheme, type MantineColorScheme } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'
import { usePalette } from '@/theme/ThemeProvider'
import { SettingsLayout } from './SettingsLayout'
import classes from './Settings.module.css'

export default function AppearancePage() {
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const { palette, setPaletteId, palettes } = usePalette()

  return (
    <SettingsLayout title="Giao diện" description="Áp dụng ngay và nhớ cho lần sau.">
      <section>
        <Title order={2} mb="sm">
          Nền
        </Title>
        <SegmentedControl
          fullWidth
          value={colorScheme}
          onChange={(value) => setColorScheme(value as MantineColorScheme)}
          data={[
            { value: 'light', label: 'Sáng' },
            { value: 'dark', label: 'Tối' },
            { value: 'auto', label: 'Theo hệ thống' },
          ]}
        />
      </section>

      <section>
        <Title order={2} mb="sm">
          Màu chủ đạo
        </Title>
        <Group gap="xs">
          {palettes.map((entry) => {
            const active = entry.id === palette.id
            return (
              <UnstyledButton
                key={entry.id}
                className={classes.option}
                data-active={active || undefined}
                onClick={() => setPaletteId(entry.id)}
                aria-pressed={active}
              >
                <ColorSwatch color={entry.seed} size={24} radius="sm">
                  {active && <IconCheck size={14} color="white" />}
                </ColorSwatch>
                <Text size="sm">{entry.name}</Text>
              </UnstyledButton>
            )
          })}
        </Group>
      </section>
    </SettingsLayout>
  )
}
