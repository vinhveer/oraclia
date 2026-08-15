import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, TextField, useSnackbar } from '@/components'
import { useSession } from '@/features/auth/SessionProvider'
import { supabase } from '@db'
import { SettingsLayout } from './SettingsLayout'

export default function AccountPage() {
  const snackbar = useSnackbar()
  const navigate = useNavigate()
  const { user, logout } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function changeEmail() {
    const next = email.trim()
    if (!next || next === user?.email) return
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: next })
      if (error) throw new Error(error.message)
      // Supabase gửi thư xác nhận trước khi địa chỉ mới có hiệu lực.
      snackbar({ message: 'Kiểm tra hộp thư để xác nhận địa chỉ mới.', duration: 6000 })
      setEmail('')
    } catch (exception) {
      snackbar({ message: exception instanceof Error ? exception.message : 'Không đổi được email.' })
    } finally {
      setBusy(false)
    }
  }

  async function changePassword() {
    if (password.length < 6) return
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(error.message)
      snackbar({ message: 'Đã đổi mật khẩu.' })
      setPassword('')
    } catch (exception) {
      snackbar({
        message: exception instanceof Error ? exception.message : 'Không đổi được mật khẩu.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsLayout title="Tài khoản của bạn">
      <section>
        <p className="md-label-md text-on-surface-variant">Đang đăng nhập</p>
        <p className="md-body-lg text-on-surface">{user?.email}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="md-title-sm text-on-surface">Đổi email</h2>
        <TextField
          label="Email mới"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          supportingText="Cần xác nhận qua thư trước khi có hiệu lực."
        />
        <Button
          variant="tonal"
          onClick={changeEmail}
          disabled={busy || !email.trim() || email.trim() === user?.email}
        >
          Đổi email
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="md-title-sm text-on-surface">Đổi mật khẩu</h2>
        <TextField
          label="Mật khẩu mới"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          supportingText="Ít nhất 6 ký tự."
        />
        <Button variant="tonal" onClick={changePassword} disabled={busy || password.length < 6}>
          Đổi mật khẩu
        </Button>
      </section>

      <section className="border-t border-outline-variant pt-6">
        <Button
          variant="outlined"
          icon="logout"
          fullWidth
          onClick={async () => {
            await logout()
            navigate('/login')
          }}
        >
          Đăng xuất
        </Button>
      </section>
    </SettingsLayout>
  )
}
