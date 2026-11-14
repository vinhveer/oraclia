import { useEffect, useState } from 'react'
import { Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { AppShell } from '@astryxdesign/core/AppShell'
import { Button } from '@astryxdesign/core/Button'
import { Drawer } from '@astryxdesign/core/Drawer'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { IconMenu2, IconPlus } from '@tabler/icons-react'
import { Sidebar } from '@/features/conversations/Sidebar'
import {
  refreshConversations,
  renameInCache,
  useConversations,
} from '@/features/conversations/queries'
import { NEW_THREAD, onAdopt, onTitle } from '@/features/chat/store'
import { MOBILE_QUERY, useMediaQuery } from '@/lib/hooks'
import { rememberChatPath } from './lastChat'
import classes from './AppLayout.module.css'

/**
 * Khung chung cho chat và cài đặt, dựng theo template "Side Nav" của Astryx
 * (AppShell + SideNav). Cài đặt nằm trong cùng khung nên sang trang cài đặt
 * không dỡ màn hình chat — và nhờ store nằm ngoài React, một bài đọc đang chảy
 * vẫn chảy tiếp ở phía sau.
 *
 * Trên màn hình nhỏ, danh sách nằm trong một Drawer mở từ nút menu ở thanh
 * trên cùng (không dùng drawer tự sinh của AppShell: thanh trên cần cả tiêu đề
 * cuộc đang mở lẫn nút tạo cuộc mới, và nhãn nút phải là tiếng Việt).
 */
export function AppLayout() {
  const [opened, setOpened] = useState(false)
  const mobile = useMediaQuery(MOBILE_QUERY)
  const chatMatch = useMatch('/chat/:id?')
  const activeId = chatMatch?.params.id ?? null
  const location = useLocation()
  const navigate = useNavigate()
  const { data: conversations } = useConversations('')
  const close = () => setOpened(false)

  useEffect(() => {
    if (chatMatch) rememberChatPath(location.pathname)
  }, [chatMatch, location.pathname])

  // Đặt ở khung chứ không ở trang chat: câu trả lời có thể về khi người dùng
  // đang ở trang cài đặt, mà tiêu đề và id mới vẫn phải được nhận.
  useEffect(() => {
    const offAdopt = onAdopt((from, to) => {
      refreshConversations()
      if (from === NEW_THREAD && window.location.pathname.replace(/\/$/, '').endsWith('/chat')) {
        navigate(`/chat/${to}`, { replace: true })
      }
    })
    const offTitle = onTitle((id, title) => renameInCache(id, title))
    return () => {
      offAdopt()
      offTitle()
    }
  }, [navigate])

  const title = conversations?.find((item) => item.id === activeId)?.title || 'Oraclia'

  // Chỉ render khi cần: thanh trên ẩn mà vẫn nằm trong DOM thì bàn phím lẫn
  // trình đọc màn hình gặp những nút vô hình trùng tên với sidebar.
  const header = mobile ? (
    <div className={classes.header}>
      <Button
        label="Mở danh sách"
        variant="ghost"
        isIconOnly
        icon={<Icon icon={IconMenu2} />}
        aria-expanded={opened}
        onClick={() => setOpened(true)}
      />
      <Text weight="semibold" maxLines={1} className={classes.title}>
        {title}
      </Text>
      <Button
        label="Cuộc trò chuyện mới"
        variant="ghost"
        isIconOnly
        icon={<Icon icon={IconPlus} />}
        onClick={() => {
          navigate('/chat')
          close()
        }}
      />
    </div>
  ) : undefined

  return (
    <AppShell
      height="fill"
      contentPadding={0}
      variant={mobile ? 'surface' : 'elevated'}
      mobileNav={false}
      topNav={header}
      sideNav={mobile ? undefined : <Sidebar activeId={activeId} />}
    >
      {mobile && (
        <Drawer isOpen={opened} onOpenChange={setOpened} label="Danh sách trò chuyện" side="start" width={320} padding={0}>
          <Sidebar activeId={activeId} onNavigate={close} />
        </Drawer>
      )}
      <div className={classes.main}>
        <Outlet />
      </div>
    </AppShell>
  )
}
