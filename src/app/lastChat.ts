/** Trang chat gần nhất, để nút quay lại từ cài đặt về đúng cuộc đang đọc. */
let last = '/chat'

export function rememberChatPath(path: string) {
  last = path
}

export function lastChatPath(): string {
  return last
}
