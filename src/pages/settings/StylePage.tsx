import { useEffect, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { TextArea } from '@astryxdesign/core/TextArea'
import { IconPlus } from '@tabler/icons-react'
import { SettingsLayout } from './SettingsLayout'
import { useSaveSettings, useUserSettings } from './queries'
import classes from './Settings.module.css'

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
          label="Lưu"
          variant="primary"
          onClick={() => save.mutate({ response_style: value.trim() })}
          isLoading={save.isPending}
          isDisabled={settings.isPending || value.trim() === (settings.data?.response_style ?? '').trim()}
        />
      }
    >
      {settings.isPending ? (
        <Skeleton height={180} radius={3} />
      ) : (
        <>
          <div className={classes.row}>
            {presets.map((preset) => (
              <Button
                key={preset}
                label={preset}
                size="sm"
                icon={<Icon icon={IconPlus} />}
                onClick={() => append(preset)}
                isDisabled={value.includes(preset)}
              />
            ))}
          </div>
          <TextArea
            label="Phong cách trả lời"
            rows={5}
            width="100%"
            value={value}
            onChange={setValue}
            placeholder="Ví dụ: viết ngắn, không hoa mỹ, kết thúc bằng một việc cụ thể nên làm."
          />
        </>
      )}
    </SettingsLayout>
  )
}
