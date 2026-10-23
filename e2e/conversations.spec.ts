import { expect, test } from './fixtures'
import { ask, isMobile, pickCards, send, waitForReading } from './helpers'

test('sửa câu hỏi: cắt câu trả lời cũ và hỏi lại', async ({ page }) => {
  await ask(page, '[e2e:chat] Câu hỏi ban đầu cần sửa')
  await waitForReading(page)
  const thread = page.getByTestId('thread-viewport')
  await thread.getByText('Câu hỏi ban đầu cần sửa').hover()
  await page.getByRole('button', { name: 'Sửa câu hỏi' }).click()
  const editor = page.getByRole('textbox', { name: 'Sửa câu hỏi' })
  await editor.fill('[e2e:chat] Câu hỏi đã được sửa lại')
  await page.getByRole('button', { name: 'Gửi lại' }).click()
  // Câu trả lời cũ biến mất ngay, rồi mới tới câu trả lời mới.
  await expect(thread.getByText('Câu hỏi ban đầu cần sửa')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Bài đọc hay' })).toHaveCount(0)
  await waitForReading(page)
  await page.reload()
  await expect(thread.getByText('Câu hỏi đã được sửa lại')).toBeVisible()
  await expect(thread.getByText('Câu hỏi ban đầu cần sửa')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Bài đọc hay' })).toHaveCount(1)
})

test('hỏi lại: thay câu trả lời, không nhân đôi câu hỏi', async ({ page }) => {
  await ask(page, '[e2e:chat] Câu hỏi để hỏi lại')
  await waitForReading(page)
  await page.getByRole('button', { name: 'Hỏi lại', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bài đọc hay' })).toHaveCount(0)
  await waitForReading(page)
  await page.reload()
  await expect(page.getByTestId('thread-viewport').getByText('Câu hỏi để hỏi lại')).toHaveCount(1)
})

test('đánh giá câu trả lời được nhớ sau khi tải lại', async ({ page }) => {
  await ask(page, '[e2e:chat] Câu hỏi để đánh giá')
  await waitForReading(page)
  const saved = page.waitForResponse((response) => response.url().includes('/message_feedback'))
  await page.getByRole('button', { name: 'Bài đọc hay' }).click()
  await expect(page.getByRole('button', { name: 'Bài đọc hay' })).toHaveAttribute('data-submitted', 'true')
  expect((await saved).status()).toBeLessThan(300)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Bài đọc hay' })).toHaveAttribute('data-submitted', 'true')
})

test('hỏi tiếp trong cùng cuộc', async ({ page }) => {
  await ask(page, '[e2e:chat] Câu đầu trong cuộc')
  await waitForReading(page)
  const url = page.url()
  await send(page, '[e2e:chat] Câu thứ hai trong cuộc')
  await expect(page.getByRole('button', { name: 'Bài đọc hay' })).toHaveCount(2, { timeout: 30_000 })
  await expect(page).toHaveURL(url)
})

test('tìm kiếm và xoá có hoàn tác', async ({ page }) => {
  const marker = `Tìm-${Date.now()}`
  await ask(page, `[e2e:chat] ${marker} câu hỏi để tìm`)
  await waitForReading(page)
  if (isMobile(page)) await page.getByRole('button', { name: 'Mở danh sách' }).click()

  const search = page.getByLabel('Tìm cuộc trò chuyện')
  await search.fill(marker)
  const item = page.getByRole('link', { name: new RegExp(marker) })
  await expect(item).toHaveCount(1)

  await item.hover()
  await page.getByRole('button', { name: new RegExp(`Xoá .*${marker}`) }).click()
  await expect(item).toHaveCount(0)
  await page.getByRole('button', { name: 'Hoàn tác' }).click()
  await expect(item).toHaveCount(1)
})

test('cuộc trò chuyện mới không tạo hàng rỗng', async ({ page }) => {
  await page.goto('chat')
  // Mobile: nút ở header; desktop: nút đầu sidebar.
  const scope = isMobile(page) ? page.getByRole('banner') : page.getByRole('navigation', { name: 'Cuộc trò chuyện' })
  await scope.getByRole('button', { name: 'Cuộc trò chuyện mới' }).click()
  await expect(page).toHaveURL(/\/chat$/)
  await expect(page.getByRole('heading', { name: 'Bạn đang nghĩ gì?' })).toBeVisible()
})

test('mở cuộc cũ hiện đúng lá đã rút', async ({ page }) => {
  // ≤ 6 từ: demo trải một lá.
  await ask(page, 'Hôm nay của tôi thế nào')
  await pickCards(page)
  await waitForReading(page)
  const url = page.url()
  await page.goto('chat')
  await page.goto(url)
  await expect(page.locator('figure')).toHaveCount(1)
})
