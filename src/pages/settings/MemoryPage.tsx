import { useEffect, useState } from 'react'
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Skeleton,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import type { Memory, MemoryKind } from '@db'
import { RowsSkeleton } from '@/app/Skeletons'
import { SettingsLayout } from './SettingsLayout'
import {
  useDeleteMemory,
  useMemories,
  useSaveSettings,
  useSummaries,
  useUpdateMemory,
  useUserSettings,
} from './queries'
import classes from './Settings.module.css'

const KIND_LABEL: Record<MemoryKind, string> = {
  profile: 'Về bạn',
  preference: 'Cách trả lời',
  life_event: 'Sự kiện',
  ongoing: 'Đang theo dõi',
}

/**
 * Ba nguồn trí nhớ nằm cạnh nhau: phần bạn tự khai (luôn đi kèm mọi câu hỏi),
 * phần Oraclia tự ghi nhớ (sửa hay xoá được), và bản cô đọng của từng cuộc.
 */
export default function MemoryPage() {
  const settings = useUserSettings()
  const save = useSaveSettings()
  const [about, setAbout] = useState('')

  useEffect(() => {
    if (settings.data) setAbout(settings.data.about_you)
  }, [settings.data])

  return (
    <SettingsLayout
      title="Những gì Oraclia biết về bạn"
      description="Những điều này đi kèm mọi cuộc trò chuyện, không riêng cuộc nào."
      actions={
        <Button
          onClick={() => save.mutate({ about_you: about.trim() })}
          loading={save.isPending}
          disabled={settings.isPending || about.trim() === (settings.data?.about_you ?? '').trim()}
        >
          Lưu
        </Button>
      }
    >
      {settings.isPending ? (
        <Skeleton height={150} />
      ) : (
        <Textarea
          label="Về bạn"
          description="Tuổi, công việc, hoàn cảnh — những gì bạn muốn Oraclia luôn nhớ."
          autosize
          minRows={5}
          value={about}
          onChange={(event) => setAbout(event.currentTarget.value)}
          placeholder="Ví dụ: mình 28 tuổi, làm thiết kế, đang cân nhắc chuyển nghề…"
        />
      )}
      <Memories />
      <Summaries />
    </SettingsLayout>
  )
}

function Memories() {
  const { data = [], isPending } = useMemories()
  return (
    <section>
      <Title order={2}>Oraclia tự ghi nhớ</Title>
      <Text size="sm" c="dimmed" mt={4}>
        Oraclia tự lưu những điều này khi bạn ngừng trò chuyện một lúc. Sửa cho đúng, hoặc xoá
        để quên hẳn.
      </Text>
      <Stack gap="xs" mt="md">
        {isPending && <RowsSkeleton rows={3} />}
        {!isPending && !data.length && (
          <Text size="sm" c="dimmed">
            Chưa có gì. Cứ trò chuyện, Oraclia sẽ tự nhặt ra những điều đáng nhớ.
          </Text>
        )}
        {data.map((memory) => (
          <MemoryItem key={memory.id} memory={memory} />
        ))}
      </Stack>
    </section>
  )
}

function MemoryItem({ memory }: { memory: Memory }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(memory.content)
  const update = useUpdateMemory()
  const remove = useDeleteMemory()

  if (editing) {
    return (
      <div className={classes.memory}>
        <div className={classes.memoryBody}>
          <Textarea
            autosize
            minRows={2}
            value={value}
            onChange={(event) => setValue(event.currentTarget.value)}
            aria-label="Sửa điều đã nhớ"
            autoFocus
          />
          <Group justify="flex-end" gap="xs" mt="xs">
            <Button
              variant="subtle"
              size="compact-md"
              onClick={() => {
                setValue(memory.content)
                setEditing(false)
              }}
            >
              Huỷ
            </Button>
            <Button
              size="compact-md"
              loading={update.isPending}
              disabled={!value.trim() || value.trim() === memory.content}
              onClick={() =>
                update.mutate(
                  { id: memory.id, content: value.trim() },
                  { onSuccess: () => setEditing(false) },
                )
              }
            >
              Lưu
            </Button>
          </Group>
        </div>
      </div>
    )
  }

  return (
    <div className={classes.memory}>
      <div className={classes.memoryBody}>
        <Text>{memory.content}</Text>
        <Group gap={6} mt={6}>
          <Badge variant="light" color="gray" radius="sm" tt="none" fw={500}>
            {KIND_LABEL[memory.kind] ?? memory.kind}
          </Badge>
          {memory.importance === 3 && (
            <Badge variant="light" radius="sm" tt="none" fw={500}>
              Quan trọng
            </Badge>
          )}
        </Group>
      </div>
      <ActionIcon variant="subtle" color="gray" aria-label="Sửa" onClick={() => setEditing(true)}>
        <IconPencil size={16} />
      </ActionIcon>
      <ActionIcon
        variant="subtle"
        color="gray"
        aria-label="Quên điều này"
        loading={remove.isPending}
        onClick={() =>
          modals.openConfirmModal({
            title: 'Quên điều này?',
            children: <Text size="sm">{memory.content}</Text>,
            labels: { confirm: 'Quên', cancel: 'Giữ lại' },
            confirmProps: { color: 'red' },
            onConfirm: () => remove.mutate(memory.id),
          })
        }
      >
        <IconTrash size={16} />
      </ActionIcon>
    </div>
  )
}

function Summaries() {
  const { data = [], isPending } = useSummaries()
  return (
    <section>
      <Title order={2}>Bộ nhớ của từng cuộc trò chuyện</Title>
      <Stack gap="xs" mt="md">
        {isPending && <RowsSkeleton rows={2} height={72} />}
        {!isPending && !data.length && (
          <Text size="sm" c="dimmed">
            Chưa có gì. Phần này xuất hiện khi một cuộc trò chuyện đủ dài để được cô đọng lại; xoá
            cuộc trò chuyện là xoá luôn phần nhớ của nó.
          </Text>
        )}
        {data.map((item) => (
          <div key={item.title + item.summary.slice(0, 24)} className={classes.summary}>
            <Text fw={500} size="sm">
              {item.title}
            </Text>
            <Text size="sm" c="dimmed" mt={4}>
              {item.summary}
            </Text>
          </div>
        ))}
      </Stack>
    </section>
  )
}
