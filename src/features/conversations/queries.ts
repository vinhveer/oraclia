import { keepPreviousData, QueryClient, useQuery } from '@tanstack/react-query'
import { listConversations, searchConversations, type Conversation } from '@db'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Danh sách đổi khi chính người dùng làm gì đó, và lúc đó ta tự cập nhật
      // cache; không cần tải lại mỗi lần đổi tab.
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export const conversationKeys = {
  all: ['conversations'] as const,
  search: (term: string) => ['conversations', 'search', term] as const,
}

export function useConversations(term: string) {
  const needle = term.trim()
  return useQuery({
    queryKey: needle ? conversationKeys.search(needle) : conversationKeys.all,
    // `signal` huỷ yêu cầu cũ khi gõ tiếp, nên kết quả về muộn không đè kết quả mới.
    queryFn: ({ signal }) => (needle ? searchConversations(needle, signal) : listConversations()),
    placeholderData: keepPreviousData,
  })
}

/** Đổi tiêu đề ngay trong mọi danh sách đang cache, không tải lại. */
export function renameInCache(id: string, title: string) {
  queryClient.setQueriesData<Conversation[]>({ queryKey: conversationKeys.all }, (list) =>
    list?.map((item) => (item.id === id ? { ...item, title } : item)),
  )
}

export function removeFromCache(id: string) {
  queryClient.setQueriesData<Conversation[]>({ queryKey: conversationKeys.all }, (list) =>
    list?.filter((item) => item.id !== id),
  )
}

export function refreshConversations() {
  return queryClient.invalidateQueries({ queryKey: conversationKeys.all })
}
