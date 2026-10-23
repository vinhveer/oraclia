import { useAuiState } from '@assistant-ui/react'
import type { OracliaMeta } from './runtime'

const EMPTY: OracliaMeta = {
  cards: null,
  hexagram: null,
  activities: [],
  request: null,
  serverId: null,
}

/** Dữ liệu Oraclia của tin nhắn đang render (lá bài, quẻ, dòng hoạt động). */
export function useMessageMeta(): OracliaMeta {
  return useAuiState(
    (state) => (state.message.metadata.custom as unknown as OracliaMeta | undefined) ?? EMPTY,
  )
}
