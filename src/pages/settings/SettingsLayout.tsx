import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { IconArrowLeft } from '@tabler/icons-react'
import { lastChatPath } from '@/app/lastChat'
import classes from './Settings.module.css'

/**
 * Khung chung cho các trang cài đặt, theo template "Settings Form" của Astryx:
 * tiêu đề, các mục xếp dọc, thanh lưu dính đáy. Nút quay lại về đúng cuộc trò
 * chuyện đang mở.
 */
export function SettingsLayout({
  title,
  description,
  children,
  actions,
}: {
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className={classes.scroll}>
      <div className={classes.page}>
        <header className={classes.header}>
          <div className={classes.back}>
            <Button
              label="Quay lại"
              variant="ghost"
              isIconOnly
              icon={<Icon icon={IconArrowLeft} />}
              onClick={() => navigate(lastChatPath())}
            />
          </div>
          <Heading level={1}>{title}</Heading>
          {description && (
            <Text color="secondary" display="block">
              {description}
            </Text>
          )}
        </header>
        <div className={classes.content}>{children}</div>
        {actions && <div className={classes.actions}>{actions}</div>}
      </div>
    </div>
  )
}

/** Một mục cài đặt: tiêu đề, mô tả ngắn, nội dung. */
export function SettingsSection({
  title,
  description,
  children,
  danger,
}: {
  title: string
  description?: ReactNode
  children?: ReactNode
  danger?: boolean
}) {
  return (
    <section className={danger ? classes.danger : classes.section}>
      <div className={classes.sectionHeader}>
        <Heading level={2}>{title}</Heading>
        {description && (
          <Text type="supporting" display="block">
            {description}
          </Text>
        )}
      </div>
      {children}
    </section>
  )
}
