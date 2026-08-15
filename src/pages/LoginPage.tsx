import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, Checkbox, CircularProgress, Icon, TextField, useSnackbar } from '@/components'
import { useSession } from '@/features/auth/SessionProvider'
import { isRemembering, setRemember, signIn, signUp } from '@db'

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
  const [remember, setRememberChoice] = useState(isRemembering)

  if (ready && user) return <Navigate to="/chat" replace />

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
        snackbar({ message: 'Tài khoản đã được tạo. Bạn có thể bắt đầu hỏi.' })
      }
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể đăng nhập.')
    } finally {
      if (!keepBusy) setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface px-4 py-10">
        <section className="md-enter-scale w-full max-w-sm text-center">
          <span className="mx-auto mb-5 flex size-14 items-center justify-center bg-primary-container text-on-primary-container">
            <Icon name="mail" size={28} className="md-spin-in" />
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
              setBusy(false)
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
      <section className="md-slide-up w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center bg-primary text-on-primary">
            <Icon
              name="sparkle"
              size={26}
              className={busy ? 'md-bloom' : 'md-spin-in'}
            />
          </span>
          <div>
            <h1 className="md-headline-sm text-on-surface">Oraclia</h1>
            <p className="md-body-md text-on-surface-variant">
              {mode === 'signin' ? 'Đăng nhập để tiếp tục' : 'Tạo tài khoản mới'}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="md-stagger flex flex-col gap-4">
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

          <Checkbox
            label="Ghi nhớ đăng nhập trên thiết bị này"
            checked={remember}
            onChange={(event) => setRememberChoice(event.target.checked)}
          />

          <Button type="submit" fullWidth disabled={busy || !email || password.length < 6}>
            {busy ? (
              <span className="flex items-center gap-2">
                <CircularProgress size={18} strokeWidth={3} />
                {mode === 'signin' ? 'Đang mở...' : 'Đang tạo...'}
              </span>
            ) : mode === 'signin' ? (
              'Đăng nhập'
            ) : (
              'Tạo tài khoản'
            )}
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
