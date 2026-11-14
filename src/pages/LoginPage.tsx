import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { Divider } from '@astryxdesign/core/Divider'
import { Heading } from '@astryxdesign/core/Heading'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useQuery } from '@tanstack/react-query'
import { IconFingerprint, IconMail, IconMoonStars } from '@tabler/icons-react'
import { notify } from '@/app/notify'
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

/** Dựng theo template "Login Card" của Astryx: dấu hiệu, thẻ ở giữa, một cột. */
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
    if (busy || !email || password.length < 6) return
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
        notify({ message: 'Tài khoản đã được tạo. Bạn có thể bắt đầu hỏi.' })
      }
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể đăng nhập.')
    } finally {
      if (!keepBusy) setBusy(false)
    }
  }

  const brand = (
    <div className={classes.brand}>
      <Icon icon={IconMoonStars} size="lg" color="accent" />
      <Text type="large" weight="bold">
        Oraclia
      </Text>
    </div>
  )

  if (sentTo) {
    return (
      <main className={classes.page}>
        <div className={classes.column}>
          {brand}
          <Card padding={6} width="100%">
            <div className={classes.stack}>
              <Icon icon={IconMail} size="lg" color="accent" />
              <Heading level={1}>Xác thực email của bạn</Heading>
              <Text color="secondary" display="block">
                Oraclia vừa gửi một liên kết xác thực tới <strong>{sentTo}</strong>. Hãy mở thư, bấm vào
                liên kết đó rồi quay lại đăng nhập. Không thấy thư thì xem mục spam hoặc quảng cáo.
              </Text>
              <Button
                label="Quay lại đăng nhập"
                width="100%"
                onClick={() => {
                  setSentTo('')
                  setMode('signin')
                  setPassword('')
                  setBusy(false)
                }}
              />
            </div>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className={classes.page}>
      <div className={classes.column}>
        {brand}
        <Card padding={6} width="100%">
          <div className={classes.stack}>
            <div className={classes.heading}>
              <Heading level={1}>{mode === 'signin' ? 'Chào mừng trở lại' : 'Tạo tài khoản'}</Heading>
              <Text color="secondary" display="block">
                {mode === 'signin' ? 'Đăng nhập để tiếp tục.' : 'Tạo tài khoản mới.'}
              </Text>
            </div>

            <form onSubmit={submit} className={classes.form}>
              {mode === 'signup' && (
                <TextInput
                  label="Tên hiển thị"
                  autoComplete="nickname"
                  value={displayName}
                  onChange={setDisplayName}
                  width="100%"
                />
              )}
              <TextInput
                label="Email"
                type="email"
                isRequired
                autoComplete="email"
                value={email}
                onChange={setEmail}
                width="100%"
              />
              <TextInput
                label="Mật khẩu"
                type="password"
                isRequired
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                description={mode === 'signup' ? 'Ít nhất 6 ký tự.' : undefined}
                value={password}
                onChange={setPassword}
                status={error ? { type: 'error', message: error } : undefined}
                statusVariant="detached"
                width="100%"
              />
              <CheckboxInput
                label="Ghi nhớ đăng nhập trên thiết bị này"
                value={remember}
                onChange={setRememberChoice}
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                width="100%"
                label={mode === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản'}
                isLoading={busy}
                isDisabled={!email || password.length < 6}
              />
            </form>

            {mode === 'signin' && canPasskey && (
              <>
                <Divider label="hoặc" />
                <Button
                  label="Đăng nhập bằng passkey"
                  size="lg"
                  width="100%"
                  icon={<Icon icon={IconFingerprint} />}
                  isLoading={passkeyBusy}
                  onClick={passkey}
                />
              </>
            )}

            <div className={classes.switch}>
              <Text type="supporting">{mode === 'signin' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}</Text>
              <Button
                label={mode === 'signin' ? 'Đăng ký' : 'Đăng nhập'}
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin')
                  setError('')
                }}
              />
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}
