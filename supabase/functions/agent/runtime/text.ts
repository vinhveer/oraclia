/**
 * Cắt chữ về tối đa `max` ký tự mà không đứt giữa từ hay giữa câu: dừng ở cuối câu
 * gần nhất nếu nó không quá xa, không thì ở khoảng trắng và thêm "…". Chữ bị cắt
 * cụt lọt vào trí nhớ hay bản tóm tắt thành một ý dở dang mà model đọc lại mãi.
 *
 * Chuẩn hoá NFC trước: model đôi khi trả tiếng Việt dạng dấu rời (NFD), cắt ở đó có
 * thể tách chữ khỏi dấu của nó.
 */
export function clip(value: string, max: number): string {
  const text = value.normalize('NFC')
  if (text.length <= max) return text
  const head = text.slice(0, max)
  const sentenceEnd = Math.max(
    ...['. ', '.\n', '! ', '!\n', '? ', '?\n', '\n\n'].map((mark) => head.lastIndexOf(mark)),
  )
  if (sentenceEnd >= max * 0.6) return head.slice(0, sentenceEnd + 1).trimEnd()
  // Chữ ngay sau chỗ cắt là khoảng trắng thì từ cuối đã trọn, giữ lại.
  const space = /\s/.test(text[max]) ? max : head.lastIndexOf(' ')
  return `${(space > max * 0.6 ? head.slice(0, space) : head).trimEnd()}…`
}
