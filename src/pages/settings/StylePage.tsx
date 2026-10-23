import { useEffect, useState } from 'react'
import { Button, Group, Skeleton, Textarea } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { SettingsLayout } from './SettingsLayout'
import { useSaveSettings, useUserSettings } from './queries'

const presets = [
  'Ngắn gọn, đi thẳng vào ý chính',
  'Nói chuyện thân mật, xưng hô gần gũi',
  'Phân tích kỹ, nhiều tầng nghĩa',
  'Thực tế, ưu tiên hành động cụ thể',
  'Nhẹ nhàng, tránh nói nặng',
]

export default function StylePage() {
  const settings = useUserSettings()
  const save = useSaveSettings()
  const [value, setValue] = useState('')

  useEffect(() => {
    if (settings.data) setValue(settings.data.response_style)
  }, [settings.data])

  function append(preset: string) {
    setValue((current) => {
      if (current.includes(preset)) return current
      return current.trim() ? `${current.trim()}\n${preset}` : preset
    })
  }

  return (
    <SettingsLayout
      title="Cách trả lời"
      description="Cách viết, độ dài, giọng điệu. Riêng các nguyên tắc an toàn thì Oraclia vẫn giữ."
      actions={
        <Button
          onClick={() => save.mutate({ response_style: value.trim() })}
          loading={save.isPending}
          disabled={settings.isPending || value.trim() === (settings.data?.response_style ?? '').trim()}
        >
          Lưu
        </Button>
      }
    >
      {settings.isPending ? (
        <Skeleton height={180} />
      ) : (
        <>
          <Group gap="xs">
            {presets.map((preset) => (
              <Button
                key={preset}
                variant="default"
                size="sm"
                leftSection={<IconPlus size={14} />}
                onClick={() => append(preset)}
                disabled={value.includes(preset)}
              >
                {preset}
              </Button>
            ))}
          </Group>
          <Textarea
            label="Phong cách trả lời"
            autosize
            minRows={5}
            value={value}
            onChange={(event) => setValue(event.currentTarget.value)}
            placeholder="Ví dụ: viết ngắn, không hoa mỹ, kết thúc bằng một việc cụ thể nên làm."
          />
        </>
      )}
    </SettingsLayout>
  )
}
