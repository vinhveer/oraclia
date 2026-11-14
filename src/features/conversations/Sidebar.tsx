import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { NavIcon } from '@astryxdesign/core/NavIcon'
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import {
  IconAdjustmentsHorizontal,
  IconBookmark,
  IconMoonStars,
  IconPalette,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUser,
} from '@tabler/icons-react'
import { deleteConversation, type Conversation } from '@db'
import { notify } from '@/app/notify'
import { useDebouncedValue } from '@/lib/hooks'
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

/**
 * Danh sách cuộc trò chuyện, dựng bằng SideNav của Astryx (template "Side Nav").
 * Dùng chung cho cột trái trên màn hình rộng và Drawer trên điện thoại.
 *
 * Không có đổi tên: bảng conversations chỉ cấp quyền select/delete cho người
 * dùng (xem migration security_hardening), tiêu đề do Oraclia tự đặt.
 */
export function Sidebar({
  activeId,
  onNavigate,
}: {
  activeId: string | null
  /** Gọi sau mỗi lần chọn, để drawer trên mobile tự đóng. */
  onNavigate?: () => void
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [term, setTerm] = useState('')
  const debounced = useDebouncedValue(term, 220)
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
    const dismiss = notify({
      message: `Đã xoá “${item.title}”`,
      autoClose: UNDO_MS,
      action: (
        <Button
          label="Hoàn tác"
          variant="ghost"
          size="sm"
          onClick={() => {
            restore()
            dismiss()
          }}
        />
      ),
    })
    timers.current.set(
      item.id,
      setTimeout(() => {
        timers.current.delete(item.id)
        deleteConversation(item.id)
          .then(() => removeFromCache(item.id))
          .catch((error: Error) => {
            restore()
            notify({ color: 'red', message: error.message || 'Không xoá được.' })
          })
          .finally(() => refreshConversations())
      }, UNDO_MS),
    )
  }

  const items = data.filter((item) => !hidden.has(item.id))

  return (
    <SideNav
      aria-label="Cuộc trò chuyện"
      className={classes.sidebar}
      header={
        <SideNavHeading
          heading="Oraclia"
          icon={<NavIcon icon={<Icon icon={IconMoonStars} size="sm" />} />}
        />
      }
      topContent={
        <div className={classes.top}>
          <Button
            label="Cuộc trò chuyện mới"
            variant="secondary"
            width="100%"
            icon={<Icon icon={IconPlus} />}
            onClick={() => go('/chat')}
          />
          <TextInput
            label="Tìm cuộc trò chuyện"
            isLabelHidden
            type="search"
            placeholder="Tìm cuộc trò chuyện"
            startIcon={IconSearch}
            value={term}
            onChange={setTerm}
            hasClear
            isLoading={isFetching && !!term}
          />
        </div>
      }
      footer={
        <SideNavSection title="Cài đặt" isHeaderHidden>
          {settingsLinks.map((link) => (
            <SideNavItem
              key={link.to}
              label={link.label}
              icon={link.icon}
              href={link.to}
              isSelected={pathname === link.to}
              onClick={onNavigate}
            />
          ))}
        </SideNavSection>
      }
    >
      <SideNavSection title="Cuộc trò chuyện" isHeaderHidden>
        {isPending &&
          Array.from({ length: 6 }, (_, index) => (
            <div key={index} className={classes.placeholder}>
              <Skeleton height={32} radius={2} index={index} />
            </div>
          ))}
        {!isPending && !items.length && (
          <div className={classes.empty}>
            <Text type="supporting">
              {term ? 'Không tìm thấy cuộc nào khớp.' : 'Chưa có cuộc trò chuyện nào.'}
            </Text>
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className={classes.item}>
            <SideNavItem
              label={item.title}
              href={`/chat/${item.id}`}
              isSelected={item.id === activeId}
              onClick={onNavigate}
              actions={
                <Button
                  className={classes.itemDelete}
                  label={`Xoá ${item.title}`}
                  variant="ghost"
                  size="sm"
                  isIconOnly
                  icon={<Icon icon={IconTrash} />}
                  onClick={() => remove(item)}
                />
              }
            />
          </div>
        ))}
      </SideNavSection>
    </SideNav>
  )
}
