import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Anchor,
  Button,
  Checkbox,
  Divider,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery } from '@tanstack/react-query'
import { IconFingerprint, IconMail } from '@tabler/icons-react'
import { useSession } from '@/features/auth/SessionProvider'
import {
  isRemembering,
  passkeyEnabled,
  setRemember,
  signIn,
  signInWithPasskey,
  signUp,
} from '@db'
import classes from './LoginPage.module.css'

export default function LoginPage() {
  const { user, ready } = useSession()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [remember, setRememberChoice] = useState(isRemembering)
  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const { data: canPasskey = false } = useQuery({
    queryKey: ['passkey-enabled'],
    queryFn: passkeyEnabled,
    staleTime: Infinity,
    retry: false,
  })

  if (ready && user) return <Navigate to="/chat" replace />

  async function passkey() {
    if (passkeyBusy) return
    setPasskeyBusy(true)
    setError('')
    setRemember(remember)
    try {
      await signInWithPasskey()
      // Giữ trạng thái chờ tới khi phiên chuyển trang, như đăng nhập mật khẩu.
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không dùng được passkey.')
      setPasskeyBusy(false)
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    // Đăng nhập xong thì phiên còn cập nhật thêm một nhịp nữa mới chuyển trang;
    // tắt trạng thái chờ ngay lúc này sẽ làm nút nhấp nháy trước khi rời màn.
    let keepBusy = false
    // Phải đặt trước khi đăng nhập: nó quyết định token được cất ở đâu.
    setRemember(remember)
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
        keepBusy = true
      } else {
        const { needsConfirmation } = await signUp(
          email.trim(),
          password,
          displayName.trim() || email.split('@')[0],
        )
        if (needsConfirmation) {
          setSentTo(email.trim())
          return
        }
        keepBusy = true
        notifications.show({ message: 'Tài khoản đã được tạo. Bạn có thể bắt đầu hỏi.' })
      }
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể đăng nhập.')
    } finally {
      if (!keepBusy) setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <main className={classes.page}>
        <section className={classes.panel}>
          <IconMail size={28} className={classes.mark} />
          <Title order={1} mt="md">
            Xác thực email của bạn
          </Title>
          <Text c="dimmed" mt="sm">
            Oraclia vừa gửi một liên kết xác thực tới <strong>{sentTo}</strong>. Hãy mở thư, bấm vào
            liên kết đó rồi quay lại đăng nhập. Không thấy thư thì xem mục spam hoặc quảng cáo.
          </Text>
          <Button
            variant="light"
            fullWidth
            mt="lg"
            onClick={() => {
              setSentTo('')
              setMode('signin')
              setPassword('')
              setBusy(false)
            }}
          >
            Quay lại đăng nhập
          </Button>
        </section>
      </main>
    )
  }

  return (
    <main className={classes.page}>
      <section className={classes.panel}>
        <Title order={1}>Oraclia</Title>
        <Text c="dimmed" mt={4}>
          {mode === 'signin' ? 'Đăng nhập để tiếp tục.' : 'Tạo tài khoản mới.'}
        </Text>

        <form onSubmit={submit}>
          <Stack gap="sm" mt="lg">
            {mode === 'signup' && (
              <TextInput
                label="Tên hiển thị"
                autoComplete="nickname"
                value={displayName}
                onChange={(event) => setDisplayName(event.currentTarget.value)}
              />
            )}
            <TextInput
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
            <PasswordInput
              label="Mật khẩu"
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              description={mode === 'signup' ? 'Ít nhất 6 ký tự.' : undefined}
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              error={error || undefined}
            />
            <Checkbox
              label="Ghi nhớ đăng nhập trên thiết bị này"
              checked={remember}
              onChange={(event) => setRememberChoice(event.currentTarget.checked)}
            />
            <Button type="submit" fullWidth loading={busy} disabled={!email || password.length < 6}>
              {mode === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </Button>
          </Stack>
        </form>

        {mode === 'signin' && canPasskey && (
          <>
            <Divider label="hoặc" labelPosition="center" my="md" />
            <Button
              variant="default"
              fullWidth
              leftSection={<IconFingerprint size={18} />}
              loading={passkeyBusy}
              onClick={passkey}
            >
              Đăng nhập bằng passkey
            </Button>
          </>
        )}

        <Text size="sm" ta="center" mt="lg">
          {mode === 'signin' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <Anchor
            component="button"
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError('')
            }}
          >
            {mode === 'signin' ? 'Đăng ký' : 'Đăng nhập'}
          </Anchor>
        </Text>
      </section>
    </main>
  )
}
