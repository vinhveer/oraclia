import { assert, assertEquals } from 'jsr:@std/assert@1'
import { clip } from './text.ts'

Deno.test('chữ ngắn hơn trần thì giữ nguyên', () => {
  assertEquals(clip('Đang tìm việc mới.', 300), 'Đang tìm việc mới.')
})

Deno.test('cắt ở cuối câu gần nhất, không đứt giữa câu', () => {
  const text = 'Câu thứ nhất khá dài để vượt ngưỡng. Câu thứ hai bị cắt giữa chừng ở đây'
  assertEquals(clip(text, 50), 'Câu thứ nhất khá dài để vượt ngưỡng.')
})

Deno.test('không có cuối câu thì cắt ở khoảng trắng và đánh dấu …', () => {
  const result = clip('một hai ba bốn năm sáu bảy tám chín mười', 22)
  assertEquals(result, 'một hai ba bốn năm sáu…')
})

Deno.test('dấu rời (NFD) được ghép lại trước khi cắt, không tách chữ khỏi dấu', () => {
  const nfd = 'Thất nghiệp '.repeat(10).normalize('NFD')
  const result = clip(nfd, 40)
  assert(result === result.normalize('NFC'))
  assert(!/[̀-ͯ]/.test(result))
})
