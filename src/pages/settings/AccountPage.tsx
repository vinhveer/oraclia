import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionIcon, Button, Divider, Group, PasswordInput, Stack, Text, Title } from '@mantine/core'
import { RowsSkeleton } from '@/app/Skeletons'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconFingerprint, IconLogout, IconTrash } from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSession } from '@/features/auth/SessionProvider'
import { queryClient } from '@/features/conversations/queries'
import {
  deletePasskey,
  listPasskeys,
  passkeyEnabled,
  registerPasskey,
  supabase,
  type Passkey,
} from '@db'
import classes from './Settings.module.css'
import { SettingsLayout } from './SettingsLayout'

export default function AccountPage() {
  const navigate = useNavigate()
  const { user, logout } = useSession()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const tooShort = password.length > 0 && password.length < 6
  const mismatch = confirm.length > 0 && confirm !== password
  const ready = password.length >= 6 && confirm === password

  async function changePassword(event: React.FormEvent) {
    event.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(error.message)
      notifications.show({ message: 'Đã đổi mật khẩu.' })
      setPassword('')
      setConfirm('')
    } catch (exception) {
      notifications.show({
        color: 'red',
        message: exception instanceof Error ? exception.message : 'Không đổi được mật khẩu.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsLayout title="Tài khoản">
      <div>
        <Text size="sm" c="dimmed">
          Đang đăng nhập
        </Text>
        <Text>{user?.email}</Text>
      </div>

      <form onSubmit={changePassword}>
        <Stack gap="sm">
          <Title order={2}>Đổi mật khẩu</Title>
          <PasswordInput
            label="Mật khẩu mới"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            error={tooShort ? 'Mật khẩu cần ít nhất 6 ký tự.' : undefined}
            description={tooShort ? undefined : 'Ít nhất 6 ký tự.'}
          />
          <PasswordInput
            label="Nhập lại mật khẩu mới"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.currentTarget.value)}
            error={mismatch ? 'Hai lần nhập chưa khớp.' : undefined}
          />
          <Button type="submit" variant="light" loading={busy} disabled={!ready} w="fit-content">
            Đổi mật khẩu
          </Button>
        </Stack>
      </form>

      <Divider />

      <Passkeys />

      <Divider />

      <Button
        variant="default"
        leftSection={<IconLogout size={18} />}
        loading={leaving}
        w="fit-content"
        onClick={async () => {
          setLeaving(true)
          await logout()
          navigate('/login')
        }}
      >
        Đăng xuất
      </Button>
    </SettingsLayout>
  )
}

const passkeyKey = ['passkeys'] as const
const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' })

/** Passkey: đăng nhập bằng vân tay / Face ID thay cho mật khẩu. */
function Passkeys() {
  const { data: supported, isPending: checking } = useQuery({
    queryKey: ['passkey-enabled'],
    queryFn: passkeyEnabled,
    staleTime: Infinity,
    retry: false,
  })
  const list = useQuery({ queryKey: passkeyKey, queryFn: listPasskeys, enabled: !!supported, retry: false })
  const add = useMutation({
    mutationFn: registerPasskey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passkeyKey })
      notifications.show({ message: 'Đã tạo passkey. Lần sau có thể đăng nhập không cần mật khẩu.' })
    },
    onError: (error: Error) => notifications.show({ color: 'red', message: error.message }),
  })
  const remove = useMutation({
    mutationFn: deletePasskey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: passkeyKey }),
    onError: (error: Error) => notifications.show({ color: 'red', message: error.message }),
  })

  return (
    <section>
      <Title order={2}>Passkey</Title>
      <Text size="sm" c="dimmed" mt={4}>
        Đăng nhập bằng vân tay, Face ID hoặc khoá màn hình của thiết bị, không cần nhớ mật khẩu.
      </Text>

      {checking ? (
        <Stack gap="xs" mt="md">
          <RowsSkeleton rows={1} height={52} />
        </Stack>
      ) : !supported ? (
        <Text size="sm" mt="sm">
          Passkey chưa dùng được: trình duyệt không hỗ trợ, hoặc Oraclia chưa bật tính năng này.
        </Text>
      ) : list.isError ? (
        <Text size="sm" mt="sm">
          {list.error.message}
        </Text>
      ) : (
        <Stack gap="xs" mt="md">
          {list.isPending && <RowsSkeleton rows={1} height={52} />}
          {list.data?.map((item) => (
            <PasskeyRow
              key={item.id}
              passkey={item}
              onDelete={() =>
                modals.openConfirmModal({
                  title: 'Xoá passkey này?',
                  children: (
                    <Text size="sm">
                      {item.name} sẽ không đăng nhập được nữa. Mật khẩu vẫn dùng bình thường.
                    </Text>
                  ),
                  labels: { confirm: 'Xoá', cancel: 'Giữ lại' },
                  confirmProps: { color: 'red' },
                  onConfirm: () => remove.mutate(item.id),
                })
              }
            />
          ))}
          <Button
            variant="light"
            leftSection={<IconFingerprint size={18} />}
            loading={add.isPending}
            onClick={() => add.mutate()}
            w="fit-content"
          >
            Thêm passkey cho thiết bị này
          </Button>
        </Stack>
      )}
    </section>
  )
}

function PasskeyRow({ passkey, onDelete }: { passkey: Passkey; onDelete: () => void }) {
  return (
    <div className={classes.memory}>
      <div className={classes.memoryBody}>
        <Text>{passkey.name}</Text>
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            Tạo {dateFormat.format(new Date(passkey.createdAt))}
          </Text>
          {passkey.lastUsedAt && (
            <Text size="xs" c="dimmed">
              · Dùng lần cuối {dateFormat.format(new Date(passkey.lastUsedAt))}
            </Text>
          )}
        </Group>
      </div>
      <ActionIcon variant="subtle" color="gray" aria-label={`Xoá ${passkey.name}`} onClick={onDelete}>
        <IconTrash size={16} />
      </ActionIcon>
    </div>
  )
}
