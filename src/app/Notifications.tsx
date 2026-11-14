import { useEffect } from 'react'
import { ToastViewport, useToast } from '@astryxdesign/core/Toast'
import { useMediaQuery } from '@/lib/hooks'
import { connectToasts } from './notify'

function Bridge() {
  const showToast = useToast()
  useEffect(() => connectToasts(showToast), [showToast])
  return null
}

/** Trên điện thoại thông báo nằm trên cùng, không che ô nhập và bàn phím. */
export function Notifications() {
  const mobile = useMediaQuery('(max-width: 48em)')
  return (
    <ToastViewport position={mobile ? 'topEnd' : 'bottomEnd'} maxVisible={3}>
      <Bridge />
    </ToastViewport>
  )
}
