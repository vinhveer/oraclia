import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@astryxdesign/core/Button'
import { Divider } from '@astryxdesign/core/Divider'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { IconFingerprint, IconLogout, IconTrash } from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useConfirm } from '@/app/confirm'
import { notify } from '@/app/notify'
import { RowsSkeleton } from '@/app/Skeletons'
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
import { SettingsLayout, SettingsSection } from './SettingsLayout'

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
      notify({ message: 'Đã đổi mật khẩu.' })
      setPassword('')
      setConfirm('')
    } catch (exception) {
      notify({
        color: 'red',
        message: exception instanceof Error ? exception.message : 'Không đổi được mật khẩu.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsLayout title="Tài khoản">
      <div className={classes.sectionHeader}>
        <Text type="supporting">Đang đăng nhập</Text>
        <Text>{user?.email}</Text>
      </div>

      <form onSubmit={changePassword}>
        <SettingsSection title="Đổi mật khẩu">
          <TextInput
            label="Mật khẩu mới"
            type="password"
            autoComplete="new-password"
            width="100%"
            value={password}
            onChange={setPassword}
            description={tooShort ? undefined : 'Ít nhất 6 ký tự.'}
            status={tooShort ? { type: 'error', message: 'Mật khẩu cần ít nhất 6 ký tự.' } : undefined}
            statusVariant="detached"
          />
          <TextInput
            label="Nhập lại mật khẩu mới"
            type="password"
            autoComplete="new-password"
            width="100%"
            value={confirm}
            onChange={setConfirm}
            status={mismatch ? { type: 'error', message: 'Hai lần nhập chưa khớp.' } : undefined}
            statusVariant="detached"
          />
          <div>
            <Button type="submit" label="Đổi mật khẩu" isLoading={busy} isDisabled={!ready} />
          </div>
        </SettingsSection>
      </form>

      <Divider />

      <Passkeys />

      <Divider />

      <div>
        <Button
          label="Đăng xuất"
          icon={<Icon icon={IconLogout} />}
          isLoading={leaving}
          onClick={async () => {
            setLeaving(true)
            await logout()
            navigate('/login')
          }}
        />
      </div>
    </SettingsLayout>
  )
}

const passkeyKey = ['passkeys'] as const
const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' })

/** Passkey: đăng nhập bằng vân tay / Face ID thay cho mật khẩu. */
function Passkeys() {
  const [confirmDialog, confirm] = useConfirm()
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
      notify({ message: 'Đã tạo passkey. Lần sau có thể đăng nhập không cần mật khẩu.' })
    },
    onError: (error: Error) => notify({ color: 'red', message: error.message }),
  })
  const remove = useMutation({
    mutationFn: deletePasskey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: passkeyKey }),
    onError: (error: Error) => notify({ color: 'red', message: error.message }),
  })

  return (
    <SettingsSection
      title="Passkey"
      description="Đăng nhập bằng vân tay, Face ID hoặc khoá màn hình của thiết bị, không cần nhớ mật khẩu."
    >
      {checking ? (
        <div className={classes.list}>
          <RowsSkeleton rows={1} height={52} />
        </div>
      ) : !supported ? (
        <Text>Passkey chưa dùng được: trình duyệt không hỗ trợ, hoặc Oraclia chưa bật tính năng này.</Text>
      ) : list.isError ? (
        <Text>{list.error.message}</Text>
      ) : (
        <div className={classes.list}>
          {list.isPending && <RowsSkeleton rows={1} height={52} />}
          {list.data?.map((item) => (
            <PasskeyRow
              key={item.id}
              passkey={item}
              onDelete={() =>
                confirm({
                  title: 'Xoá passkey này?',
                  description: `${item.name} sẽ không đăng nhập được nữa. Mật khẩu vẫn dùng bình thường.`,
                  confirmLabel: 'Xoá',
                  onConfirm: () => remove.mutate(item.id),
                })
              }
            />
          ))}
          <div>
            <Button
              label="Thêm passkey cho thiết bị này"
              icon={<Icon icon={IconFingerprint} />}
              isLoading={add.isPending}
              onClick={() => add.mutate()}
            />
          </div>
        </div>
      )}
      {confirmDialog}
    </SettingsSection>
  )
}

function PasskeyRow({ passkey, onDelete }: { passkey: Passkey; onDelete: () => void }) {
  return (
    <div className={classes.memory}>
      <div className={classes.memoryBody}>
        <Text>{passkey.name}</Text>
        <Text type="supporting">
          Tạo {dateFormat.format(new Date(passkey.createdAt))}
          {passkey.lastUsedAt && ` · Dùng lần cuối ${dateFormat.format(new Date(passkey.lastUsedAt))}`}
        </Text>
      </div>
      <Button
        label={`Xoá ${passkey.name}`}
        variant="ghost"
        size="sm"
        isIconOnly
        icon={<Icon icon={IconTrash} />}
        onClick={onDelete}
      />
    </div>
  )
}
