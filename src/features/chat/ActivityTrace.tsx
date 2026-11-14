import { useState } from 'react'
import { Collapsible } from '@astryxdesign/core/Collapsible'
import { Icon } from '@astryxdesign/core/Icon'
import { Spinner } from '@astryxdesign/core/Spinner'
import { Text } from '@astryxdesign/core/Text'
import { IconAlertCircle, IconCheck } from '@tabler/icons-react'
import type { Activity } from './activity'
import classes from './Thread.module.css'

/**
 * Vẽ đúng dòng hoạt động mà reducer sinh ra — không suy đoán gì thêm. Việc đang
 * chạy luôn hiện; việc đã xong gom lại thành một dòng bấm mở (Collapsible), để
 * bài đọc không bị đẩy xuống bởi danh sách việc đã làm.
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
        <Collapsible
          isOpen={open}
          onOpenChange={setOpen}
          trigger={
            <span className={classes.traceToggle}>
              <Icon icon={failed ? IconAlertCircle : IconCheck} size="sm" />
              <Text type="label" color="secondary">
                {settled.length === 1 ? doneLabel(settled[0]) : `${settled.length} bước đã làm`}
              </Text>
            </span>
          }
        >
          <div className={classes.traceList}>
            {settled.map((activity) => (
              <Row key={activity.id} activity={activity} />
            ))}
          </div>
        </Collapsible>
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
          <Spinner size="sm" shade="subtle" aria-label={activity.label} />
        ) : (
          <Icon icon={activity.status === 'failed' ? IconAlertCircle : IconCheck} size="sm" />
        )}
      </span>
      <div className={classes.traceBody}>
        <Text type="label" color="inherit">
          {doneLabel(activity)}
        </Text>
        {detail && (
          <Text type="supporting" maxLines={running ? 2 : 6} hasTruncateTooltip={false} className={classes.traceDetail}>
            {detail}
          </Text>
        )}
      </div>
    </div>
  )
}
