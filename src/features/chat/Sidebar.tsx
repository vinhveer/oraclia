import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon, IconButton, Ripple } from '@/components'
import { cn } from '@/lib/cn'
import type { IconName } from '@/components'
import type { Conversation } from '@db'

const links: { to: string; label: string; icon: IconName }[] = [
  { to: '/settings/memory', label: 'Những gì tôi biết được về bạn', icon: 'bookmark' },
  { to: '/settings/style', label: 'Bạn muốn tôi trả lời như thế nào?', icon: 'tune' },
  { to: '/settings/account', label: 'Tài khoản của bạn', icon: 'person' },
  { to: '/settings/appearance', label: 'Chế độ', icon: 'palette' },
]

export function Sidebar({
  items,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onSearch,
}: {
  items: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onSearch: (term: string) => void
}) {
  const [term, setTerm] = useState('')

  return (
    <nav className="flex h-full flex-col p-3">
      <button
        type="button"
        onClick={onCreate}
        className="relative mt-2 mb-3 flex h-14 shrink-0 items-center gap-3 overflow-hidden rounded-full bg-primary-container px-4 text-on-primary-container transition-shadow hover:shadow-e1"
      >
        <Ripple />
        <Icon name="add" size={22} className="relative z-10" />
        <span className="relative z-10 md-label-lg">Cuộc trò chuyện mới</span>
      </button>

      <div className="relative mb-2 shrink-0">
        <Icon
          name="search"
          size={18}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-on-surface-variant"
        />
        <input
          value={term}
          onChange={(event) => {
            setTerm(event.target.value)
            onSearch(event.target.value)
          }}
          placeholder="Tìm cuộc trò chuyện"
          aria-label="Tìm cuộc trò chuyện"
          className="h-10 w-full rounded-full bg-surface-high pr-9 pl-11 md-body-md text-on-surface outline-none placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary"
        />
        {term && (
          <button
            type="button"
            aria-label="Xóa tìm kiếm"
            onClick={() => {
              setTerm('')
              onSearch('')
            }}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-on-surface-variant hover:bg-on-surface/8"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.map((item) => {
          const active = item.id === activeId
          return (
            <div key={item.id} className="group relative">
              {/* Cả viên thuốc là vùng bấm, không riêng phần chữ. */}
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  'relative flex h-12 w-full items-center overflow-hidden rounded-full pr-12 pl-4 text-left transition-colors',
                  active
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-high hover:text-on-surface',
                )}
              >
                <Ripple />
                <span className="relative z-10 truncate md-label-lg">{item.title}</span>
              </button>
              {/* Trên cảm ứng không có hover, nên nút xóa hiện sẵn; từ lg mới ẩn đi. */}
              <span
                className={cn(
                  'absolute inset-y-0 right-1 flex items-center transition-opacity',
                  'lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100',
                )}
              >
                <IconButton
                  icon="delete"
                  label={`Xóa ${item.title}`}
                  size="sm"
                  onClick={() => onDelete(item.id)}
                />
              </span>
            </div>
          )
        })}
        {!items.length && (
          <p className="px-4 py-6 md-body-md text-on-surface-variant">
            {term ? 'Không tìm thấy cuộc nào khớp.' : 'Chưa có cuộc trò chuyện nào.'}
          </p>
        )}
      </div>

      <div className="mt-2 shrink-0 border-t border-outline-variant pt-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className="relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-full px-4 text-left text-on-surface-variant transition-colors hover:bg-surface-high hover:text-on-surface"
          >
            <Ripple />
            <Icon name={link.icon} size={20} className="relative z-10 shrink-0" />
            <span className="relative z-10 truncate md-label-lg">{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
