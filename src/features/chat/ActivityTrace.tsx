import { useState } from 'react'
import { Collapse, Loader, Text, UnstyledButton } from '@mantine/core'
import { IconAlertCircle, IconCheck, IconChevronDown } from '@tabler/icons-react'
import type { Activity } from './activity'
import classes from './Thread.module.css'

/**
 * Vẽ đúng dòng hoạt động mà reducer sinh ra — không suy đoán gì thêm. Việc đang
 * chạy luôn hiện; việc đã xong gom lại thành một dòng bấm mở, để bài đọc không
 * bị đẩy xuống bởi danh sách việc đã làm.
 */
export function ActivityTrace({ activities }: { activities: Activity[] }) {
  const [open, setOpen] = useState(false)
  const running = activities.filter((item) => item.status === 'running')
  // Chỉ báo chờ ("đang lắng nghe", "đang giải nghĩa") chỉ có nghĩa lúc đang chạy;
  // xong rồi mà còn giữ thì dòng "đã làm" toàn là việc chưa từng làm.
  const settled = activities.filter(
    (item) =>
      item.status !== 'running' &&
      item.kind !== 'listening' &&
      !(item.kind === 'thinking' && !item.detail && item.status === 'done'),
  )
  const failed = settled.some((item) => item.status === 'failed')
  if (!running.length && !settled.length) return null

  return (
    <div className={classes.trace}>
      {settled.length > 0 && (
        <>
          <UnstyledButton
            className={classes.traceToggle}
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
          >
            {failed ? <IconAlertCircle size={16} /> : <IconCheck size={16} />}
            <Text size="sm" span>
              {settled.length === 1 ? doneLabel(settled[0]) : `${settled.length} bước đã làm`}
            </Text>
            <IconChevronDown size={14} className={classes.traceChevron} data-open={open || undefined} />
          </UnstyledButton>
          <Collapse expanded={open}>
            <div className={classes.traceList}>
              {settled.map((activity) => (
                <Row key={activity.id} activity={activity} />
              ))}
            </div>
          </Collapse>
        </>
      )}
      {running.map((activity) => (
        <Row key={activity.id} activity={activity} />
      ))}
    </div>
  )
}

/** Nhãn của việc đã xong: "đang suy nghĩ" thành "Đã suy nghĩ". */
function doneLabel(activity: Activity): string {
  if (activity.status === 'running') return activity.label
  return activity.kind === 'thinking' ? 'Đã suy nghĩ' : activity.label
}

function Row({ activity }: { activity: Activity }) {
  const running = activity.status === 'running'
  // Dòng suy nghĩ đang chảy chỉ hiện đuôi; đọc đủ thì mở danh sách đã làm.
  const detail =
    activity.kind === 'thinking' && running && activity.detail.length > 160
      ? `…${activity.detail.slice(-160)}`
      : activity.detail
  return (
    <div className={classes.traceRow} data-status={activity.status}>
      <span className={classes.traceIcon}>
        {running ? (
          <Loader size={14} type="dots" />
        ) : activity.status === 'failed' ? (
          <IconAlertCircle size={16} />
        ) : (
          <IconCheck size={16} />
        )}
      </span>
      <div className={classes.traceBody}>
        <Text size="sm">{doneLabel(activity)}</Text>
        {detail && (
          <Text size="xs" c="dimmed" lineClamp={running ? 2 : 6} className={classes.traceDetail}>
            {detail}
          </Text>
        )}
      </div>
    </div>
  )
}
