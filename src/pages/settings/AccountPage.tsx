import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Divider, PasswordInput, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconLogout } from '@tabler/icons-react'
import { useSession } from '@/features/auth/SessionProvider'
import { supabase } from '@db'
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
