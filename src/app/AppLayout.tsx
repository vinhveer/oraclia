import { useEffect } from 'react'
import { Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { ActionIcon, AppShell, Burger, Group, Text } from '@mantine/core'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { IconPlus } from '@tabler/icons-react'
import { Sidebar } from '@/features/conversations/Sidebar'
import {
  refreshConversations,
  renameInCache,
  useConversations,
} from '@/features/conversations/queries'
import { NEW_THREAD, onAdopt, onTitle } from '@/features/chat/store'
import { rememberChatPath } from './lastChat'
import classes from './AppLayout.module.css'

/**
 * Khung chung cho chat và cài đặt. Cài đặt nằm trong cùng khung nên sang trang
 * cài đặt không còn dỡ màn hình chat — và nhờ store nằm ngoài React, một bài đọc
 * đang chảy vẫn chảy tiếp ở phía sau.
 */
export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure(false)
  const mobile = useMediaQuery('(max-width: 62em)', false)
  const chatMatch = useMatch('/chat/:id?')
  const activeId = chatMatch?.params.id ?? null
  const location = useLocation()
  const navigate = useNavigate()
  const { data: conversations } = useConversations('')

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

  return (
    <AppShell
      header={{ height: 52, collapsed: !mobile }}
      navbar={{ width: 272, breakpoint: 'md', collapsed: { mobile: !opened } }}
      padding={0}
      classNames={{ main: classes.main, navbar: classes.navbar, header: classes.header }}
    >
      <AppShell.Header>
        <Group h="100%" px="xs" gap="xs" wrap="nowrap">
          <Burger opened={opened} onClick={toggle} size="sm" aria-label="Mở danh sách" />
          <Text fw={600} truncate className={classes.title}>
            {title}
          </Text>
          <ActionIcon
            variant="subtle"
            color="gray"
            size={40}
            aria-label="Cuộc trò chuyện mới"
            onClick={() => {
              navigate('/chat')
              close()
            }}
          >
            <IconPlus size={20} />
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        <Sidebar activeId={activeId} onNavigate={close} />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
