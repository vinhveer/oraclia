import { useEffect, useRef, useState } from 'react'
import { NavLink as RouterLink, useNavigate } from 'react-router-dom'
import {
  ActionIcon,
  Button,
  CloseButton,
  Loader,
  NavLink,
  ScrollArea,
  Skeleton,
  Text,
  TextInput,
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconBookmark,
  IconPalette,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUser,
  IconAdjustmentsHorizontal,
} from '@tabler/icons-react'
import { deleteConversation, type Conversation } from '@db'
import { refreshConversations, removeFromCache, useConversations } from './queries'
import classes from './Sidebar.module.css'

const settingsLinks = [
  { to: '/settings/memory', label: 'Những gì Oraclia biết về bạn', icon: IconBookmark },
  { to: '/settings/style', label: 'Cách trả lời', icon: IconAdjustmentsHorizontal },
  { to: '/settings/account', label: 'Tài khoản', icon: IconUser },
  { to: '/settings/appearance', label: 'Giao diện', icon: IconPalette },
]

/** Xoá chờ chừng này trước khi thật sự gọi server, để kịp bấm Hoàn tác. */
const UNDO_MS = 5000

export function Sidebar({
  activeId,
  onNavigate,
}: {
  activeId: string | null
  /** Gọi sau mỗi lần chọn, để drawer trên mobile tự đóng. */
  onNavigate?: () => void
}) {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [debounced] = useDebouncedValue(term, 220)
  const { data = [], isPending, isFetching } = useConversations(debounced)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  // Rời trang khi còn lượt xoá đang chờ thì xoá luôn, đừng để nó lơ lửng.
  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const [id, timer] of pending) {
        clearTimeout(timer)
        deleteConversation(id).catch(() => undefined)
      }
    }
  }, [])

  function go(to: string) {
    navigate(to)
    onNavigate?.()
  }

  function remove(item: Conversation) {
    setHidden((current) => new Set(current).add(item.id))
    if (item.id === activeId) go('/chat')
    const restore = () => {
      clearTimeout(timers.current.get(item.id))
      timers.current.delete(item.id)
      setHidden((current) => {
        const next = new Set(current)
        next.delete(item.id)
        return next
      })
    }
    const notificationId = notifications.show({
      message: (
        <div className={classes.undo}>
          <Text size="sm" truncate>
            Đã xoá “{item.title}”
          </Text>
          <Button
            variant="subtle"
            size="compact-sm"
            onClick={() => {
              restore()
              notifications.hide(notificationId)
            }}
          >
            Hoàn tác
          </Button>
        </div>
      ),
      autoClose: UNDO_MS,
      withCloseButton: false,
    })
    timers.current.set(
      item.id,
      setTimeout(() => {
        timers.current.delete(item.id)
        deleteConversation(item.id)
          .then(() => removeFromCache(item.id))
          .catch((error: Error) => {
            restore()
            notifications.show({ color: 'red', message: error.message || 'Không xoá được.' })
          })
          .finally(() => refreshConversations())
      }, UNDO_MS),
    )
  }

  const items = data.filter((item) => !hidden.has(item.id))

  return (
    <nav className={classes.sidebar} aria-label="Cuộc trò chuyện">
      <div className={classes.top}>
        <Button
          fullWidth
          variant="light"
          justify="flex-start"
          leftSection={<IconPlus size={18} />}
          onClick={() => go('/chat')}
        >
          Cuộc trò chuyện mới
        </Button>
        <TextInput
          mt="sm"
          value={term}
          onChange={(event) => setTerm(event.currentTarget.value)}
          placeholder="Tìm cuộc trò chuyện"
          aria-label="Tìm cuộc trò chuyện"
          leftSection={<IconSearch size={16} />}
          rightSection={
            isFetching && term ? (
              <Loader size={14} />
            ) : term ? (
              <CloseButton size="sm" aria-label="Xoá tìm kiếm" onClick={() => setTerm('')} />
            ) : null
          }
        />
      </div>

      <ScrollArea className={classes.list} type="hover" scrollbarSize={6}>
        {isPending &&
          Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} height={36} radius="md" mb={6} />
          ))}
        {!isPending && !items.length && (
          <Text size="sm" c="dimmed" px="sm" py="md">
            {term ? 'Không tìm thấy cuộc nào khớp.' : 'Chưa có cuộc trò chuyện nào.'}
          </Text>
        )}
        {items.map((item) => (
          <div key={item.id} className={classes.item}>
            <NavLink
              component={RouterLink}
              to={`/chat/${item.id}`}
              onClick={onNavigate}
              active={item.id === activeId}
              label={item.title}
              classNames={{ root: classes.itemLink, label: classes.itemLabel }}
            />
            <ActionIcon
              className={classes.itemDelete}
              variant="subtle"
              color="gray"
              size={30}
              aria-label={`Xoá ${item.title}`}
              onClick={() => remove(item)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </div>
        ))}
      </ScrollArea>

      <div className={classes.bottom}>
        {settingsLinks.map((link) => (
          <NavLink
            key={link.to}
            component={RouterLink}
            to={link.to}
            onClick={onNavigate}
            label={link.label}
            leftSection={<link.icon size={18} stroke={1.75} />}
            classNames={{ root: classes.settingsLink }}
          />
        ))}
      </div>
    </nav>
  )
}
