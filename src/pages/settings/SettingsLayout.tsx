import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionIcon, Group, Text, Title } from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { lastChatPath } from '@/app/lastChat'
import classes from './Settings.module.css'

/** Khung chung cho các trang cài đặt; quay lại đúng cuộc trò chuyện đang mở. */
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
        <header>
          <ActionIcon
            variant="subtle"
            color="gray"
            size={36}
            ml={-8}
            aria-label="Quay lại"
            onClick={() => navigate(lastChatPath())}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Title order={1} mt={4}>
            {title}
          </Title>
          {description && (
            <Text c="dimmed" mt={6}>
              {description}
            </Text>
          )}
        </header>
        <main className={classes.content}>{children}</main>
        {actions && (
          <Group justify="flex-end" gap="xs" className={classes.actions}>
            {actions}
          </Group>
        )}
      </div>
    </div>
  )
}
