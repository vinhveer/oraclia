import { useEffect, useState } from 'react'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { TextArea } from '@astryxdesign/core/TextArea'
import { IconPencil, IconTrash, IconTrashX } from '@tabler/icons-react'
import type { Memory } from '@db'
import { useConfirm } from '@/app/confirm'
import { RowsSkeleton } from '@/app/Skeletons'
import { SettingsLayout, SettingsSection } from './SettingsLayout'
import {
  useDeleteMemory,
  useForgetEverything,
  useMemories,
  useSaveSettings,
  useSummaries,
  useUpdateMemory,
  useUserSettings,
} from './queries'
import classes from './Settings.module.css'

/**
 * Nhãn theo loại trí nhớ. Khoá là chuỗi chứ không phải MemoryKind: server có
 * thể có loại mới trước khi kiểu ở client kịp cập nhật (như `pattern`), và loại
 * lạ thì hiện nguyên tên thay vì vỡ trang.
 */
const KIND_LABEL: Record<string, string> = {
  profile: 'Về bạn',
  preference: 'Cách trả lời',
  life_event: 'Sự kiện',
  ongoing: 'Đang theo dõi',
  pattern: 'Khuôn mẫu',
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
          label="Lưu"
          variant="primary"
          onClick={() => save.mutate({ about_you: about.trim() })}
          isLoading={save.isPending}
          isDisabled={settings.isPending || about.trim() === (settings.data?.about_you ?? '').trim()}
        />
      }
    >
      {settings.isPending ? (
        <Skeleton height={150} radius={3} />
      ) : (
        <TextArea
          label="Về bạn"
          description="Tuổi, công việc, hoàn cảnh — những gì bạn muốn Oraclia luôn nhớ."
          rows={5}
          width="100%"
          value={about}
          onChange={setAbout}
          placeholder="Ví dụ: mình 28 tuổi, làm thiết kế, đang cân nhắc chuyển nghề…"
        />
      )}
      <Memories />
      <Summaries />
      <ForgetEverything />
    </SettingsLayout>
  )
}

function Memories() {
  const { data = [], isPending } = useMemories()
  return (
    <SettingsSection
      title="Oraclia tự ghi nhớ"
      description="Oraclia tự lưu những điều này khi bạn ngừng trò chuyện một lúc. Sửa cho đúng, hoặc xoá để quên hẳn."
    >
      <div className={classes.list}>
        {isPending && <RowsSkeleton rows={3} />}
        {!isPending && !data.length && (
          <Text type="supporting">Chưa có gì. Cứ trò chuyện, Oraclia sẽ tự nhặt ra những điều đáng nhớ.</Text>
        )}
        {data.map((memory) => (
          <MemoryItem key={memory.id} memory={memory} />
        ))}
      </div>
    </SettingsSection>
  )
}

function MemoryItem({ memory }: { memory: Memory }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(memory.content)
  const update = useUpdateMemory()
  const remove = useDeleteMemory()
  const [confirmDialog, confirm] = useConfirm()

  if (editing) {
    return (
      <div className={classes.memory}>
        <div className={classes.memoryBody}>
          <TextArea
            label="Sửa điều đã nhớ"
            isLabelHidden
            rows={2}
            width="100%"
            hasAutoFocus
            value={value}
            onChange={setValue}
          />
          <div className={classes.row} style={{ justifyContent: 'flex-end' }}>
            <Button
              label="Huỷ"
              variant="ghost"
              size="sm"
              onClick={() => {
                setValue(memory.content)
                setEditing(false)
              }}
            />
            <Button
              label="Lưu"
              variant="primary"
              size="sm"
              isLoading={update.isPending}
              isDisabled={!value.trim() || value.trim() === memory.content}
              onClick={() =>
                update.mutate({ id: memory.id, content: value.trim() }, { onSuccess: () => setEditing(false) })
              }
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={classes.memory}>
      <div className={classes.memoryBody}>
        <Text display="block">{memory.content}</Text>
        <div className={classes.tags}>
          <Badge label={KIND_LABEL[memory.kind] ?? memory.kind} />
          {memory.importance === 3 && <Badge label="Quan trọng" variant="purple" />}
        </div>
      </div>
      <Button
        label="Sửa"
        variant="ghost"
        size="sm"
        isIconOnly
        icon={<Icon icon={IconPencil} />}
        onClick={() => setEditing(true)}
      />
      <Button
        label="Quên điều này"
        variant="ghost"
        size="sm"
        isIconOnly
        isLoading={remove.isPending}
        icon={<Icon icon={IconTrash} />}
        onClick={() =>
          confirm({
            title: 'Quên điều này?',
            description: memory.content,
            confirmLabel: 'Quên',
            onConfirm: () => remove.mutate(memory.id),
          })
        }
      />
      {confirmDialog}
    </div>
  )
}

function Summaries() {
  const { data = [], isPending } = useSummaries()
  return (
    <SettingsSection title="Bộ nhớ của từng cuộc trò chuyện">
      <div className={classes.list}>
        {isPending && <RowsSkeleton rows={2} height={72} />}
        {!isPending && !data.length && (
          <Text type="supporting">
            Chưa có gì. Phần này xuất hiện khi một cuộc trò chuyện đủ dài để được cô đọng lại; xoá
            cuộc trò chuyện là xoá luôn phần nhớ của nó.
          </Text>
        )}
        {data.map((item) => (
          <div key={item.title + item.summary.slice(0, 24)} className={classes.summary}>
            <Text type="label" weight="medium">
              {item.title}
            </Text>
            <Text type="supporting">{item.summary}</Text>
          </div>
        ))}
      </div>
    </SettingsSection>
  )
}

/**
 * Nút xoá sạch đặt cuối trang, tách khỏi các nút xoá từng điều: việc này không
 * hoàn tác được nên phải xác nhận, và nói rõ cái gì mất, cái gì còn.
 */
function ForgetEverything() {
  const forget = useForgetEverything()
  const [confirmDialog, confirm] = useConfirm()
  return (
    <SettingsSection
      danger
      title="Xoá toàn bộ ký ức"
      description="Oraclia quên hết những gì đã tự ghi nhớ về bạn, cả các lượt xem cũ lẫn bộ nhớ của từng cuộc trò chuyện. Phần “Về bạn” và các cuộc trò chuyện vẫn giữ nguyên."
    >
      <Button
        label="Xoá toàn bộ ký ức"
        variant="destructive"
        icon={<Icon icon={IconTrashX} />}
        isLoading={forget.isPending}
        onClick={() =>
          confirm({
            title: 'Xoá toàn bộ ký ức?',
            description:
              'Oraclia sẽ quên mọi điều đã tự ghi nhớ, mọi lượt xem cũ dùng để nhắc lại, và bộ nhớ cô đọng của từng cuộc trò chuyện. Không hoàn tác được. Phần “Về bạn” và các cuộc trò chuyện vẫn còn.',
            confirmLabel: 'Xoá hết',
            onConfirm: () => forget.mutate(),
          })
        }
      />
      {confirmDialog}
    </SettingsSection>
  )
}
