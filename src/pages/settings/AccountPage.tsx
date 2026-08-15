import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, CircularProgress, TextField, useSnackbar } from '@/components'
import { useSession } from '@/features/auth/SessionProvider'
import { supabase } from '@db'
import { SettingsLayout } from './SettingsLayout'

export default function AccountPage() {
  const snackbar = useSnackbar()
  const navigate = useNavigate()
  const { user, logout } = useSession()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const tooShort = password.length > 0 && password.length < 6
  const mismatch = confirm.length > 0 && confirm !== password
  const ready = password.length >= 6 && confirm === password

  async function changePassword() {
    if (!ready || busy) return
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(error.message)
      snackbar({ message: 'Đã đổi mật khẩu.' })
      setPassword('')
      setConfirm('')
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
        <h2 className="md-title-sm text-on-surface">Đổi mật khẩu</h2>
        <TextField
          label="Mật khẩu mới"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          leadingIcon="lock"
          autoComplete="new-password"
          errorText={tooShort ? 'Mật khẩu cần ít nhất 6 ký tự.' : undefined}
          supportingText={tooShort ? undefined : 'Ít nhất 6 ký tự.'}
        />
        <TextField
          label="Nhập lại mật khẩu mới"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          leadingIcon="lock"
          autoComplete="new-password"
          errorText={mismatch ? 'Hai lần nhập chưa khớp.' : undefined}
        />
        <Button variant="tonal" onClick={changePassword} disabled={busy || !ready}>
          {busy ? (
            <span className="flex items-center gap-2">
              <CircularProgress size={18} strokeWidth={3} />
              Đang đổi...
            </span>
          ) : (
            'Đổi mật khẩu'
          )}
        </Button>
      </section>

      <section className="border-t border-outline-variant pt-6">
        <Button
          variant="outlined"
          icon={leaving ? undefined : 'logout'}
          fullWidth
          disabled={leaving}
          onClick={async () => {
            setLeaving(true)
            await logout()
            navigate('/login')
          }}
        >
          {leaving ? (
            <span className="flex items-center gap-2">
              <CircularProgress size={18} strokeWidth={3} />
              Đang đăng xuất...
            </span>
          ) : (
            'Đăng xuất'
          )}
        </Button>
      </section>
    </SettingsLayout>
  )
}
