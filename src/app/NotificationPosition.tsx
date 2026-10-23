import { Notifications } from '@mantine/notifications'
import { useMediaQuery } from '@mantine/hooks'

/** Trên điện thoại thông báo nằm trên cùng, không che ô nhập và bàn phím. */
export function NotificationPosition() {
  const mobile = useMediaQuery('(max-width: 48em)', false)
  return <Notifications position={mobile ? 'top-center' : 'bottom-right'} limit={3} />
}
