import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, Icon, TextField, useSnackbar } from '@/components'
import { useSession } from '@/features/auth/SessionProvider'
import { signIn, signUp } from '@db'

export default function LoginPage() {
  const { user, ready } = useSession()
  const snackbar = useSnackbar()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [visible, setVisible] = useState(false)

  if (ready && user) return <Navigate to="/chat" replace />

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
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
        snackbar({ message: 'Tài khoản đã được tạo. Bạn có thể bắt đầu hỏi.' })
      }
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể đăng nhập.')
    } finally {
      setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface px-4 py-10">
        <section className="w-full max-w-sm text-center">
          <span className="mx-auto mb-5 flex size-14 items-center justify-center bg-primary-container text-on-primary-container">
            <Icon name="mail" size={28} />
          </span>
          <h1 className="md-headline-sm text-on-surface">Xác thực email của bạn</h1>
          <p className="mt-3 md-body-lg text-on-surface-variant">
            Oraclia vừa gửi một liên kết xác thực tới <strong>{sentTo}</strong>. Hãy mở thư và bấm
            vào liên kết đó, rồi quay lại đăng nhập.
          </p>
          <p className="mt-3 md-body-md text-on-surface-variant">
            Không thấy thư? Kiểm tra mục spam hoặc quảng cáo.
          </p>
          <Button
            variant="tonal"
            fullWidth
            className="mt-6"
            onClick={() => {
              setSentTo('')
              setMode('signin')
              setPassword('')
            }}
          >
            Quay lại đăng nhập
          </Button>
        </section>
      </div>
    )
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-surface px-4 py-10">
      <section className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center bg-primary text-on-primary">
            <Icon name="sparkle" size={26} />
          </span>
          <div>
            <h1 className="md-headline-sm text-on-surface">Oraclia</h1>
            <p className="md-body-md text-on-surface-variant">
              {mode === 'signin' ? 'Đăng nhập để tiếp tục' : 'Tạo tài khoản mới'}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <TextField
              label="Tên hiển thị"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="nickname"
              leadingIcon="person"
            />
          )}
          <TextField
            label="Email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            leadingIcon="mail"
          />
          <TextField
            label="Mật khẩu"
            type={visible ? 'text' : 'password'}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            leadingIcon="lock"
            trailingIcon={visible ? 'visibilityOff' : 'visibility'}
            onTrailingIconClick={() => setVisible((current) => !current)}
            supportingText={mode === 'signup' ? 'Ít nhất 6 ký tự.' : undefined}
            errorText={error || undefined}
          />

          <Button type="submit" fullWidth disabled={busy || !email || password.length < 6}>
            {busy ? 'Đang xử lý...' : mode === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </Button>
        </form>

        <Button
          variant="text"
          fullWidth
          className="mt-3"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError('')
          }}
        >
          {mode === 'signin' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
        </Button>
      </section>
    </div>
  )
}
