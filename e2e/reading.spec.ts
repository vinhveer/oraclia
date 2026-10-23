import { expect, test } from './fixtures'
import { ask, pickCards, waitForReading } from './helpers'

test('hỏi, rút bài, đọc — và bài đọc còn nguyên sau khi tải lại', async ({ page }) => {
  // 7-14 từ: demo trải ba lá.
  await ask(page, 'Công việc của tôi tháng tới sẽ ra sao')
  await pickCards(page)
  // Câu hỏi đầu ở /chat nhận id thật mà không mất bản nháp đang chảy.
  await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}$/)
  await waitForReading(page)

  const figures = page.locator('figure')
  await expect(figures).toHaveCount(3)
  await expect(page.getByRole('heading', { name: 'Tóm lại' })).toBeVisible()
  // Mọi mã [[card:N]] đã được thay bằng thẻ lá.
  await expect(page.getByText(/\[\[card:/)).toHaveCount(0)

  await page.reload()
  await expect(page.locator('figure')).toHaveCount(3)
  await expect(page.getByRole('heading', { name: 'Tóm lại' })).toBeVisible()
})

test('Kinh Dịch: gieo quẻ và vẽ quẻ', async ({ page }) => {
  await ask(page, '[e2e:iching] Có nên mở rộng cửa hàng lúc này')
  await waitForReading(page)
  await expect(page.getByText('Quẻ chính')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Thế quẻ' })).toBeVisible()
})

test('bài tây: rút từ bộ 52 lá', async ({ page }) => {
  await ask(page, '[e2e:playing] Tuần này tôi có tin vui không')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('bộ bài tây')
  await pickCards(page)
  await waitForReading(page)
  await expect(page.locator('figure')).toHaveCount(2)
})

test('câu hỏi làm rõ: chọn một đáp án rồi đọc tiếp', async ({ page }) => {
  await ask(page, '[e2e:clarify] Chuyện tình cảm của tôi dạo này')
  await pickCards(page)
  const prompt = page.getByRole('button', { name: 'Đúng vậy' })
  await expect(prompt).toBeVisible()
  await prompt.click()
  await waitForReading(page)
  await expect(page.getByText('Bỏ qua, cứ bói luôn')).toHaveCount(0)
})

test('câu hỏi làm rõ: bỏ qua thì vẫn đọc', async ({ page }) => {
  await ask(page, '[e2e:clarify] Chuyện gia đình của tôi')
  await pickCards(page)
  await page.getByRole('button', { name: 'Bỏ qua, cứ bói luôn' }).click()
  await waitForReading(page)
})

test('đóng bộ bài rồi mở lại từ lời nhắc', async ({ page }) => {
  await ask(page, 'Tôi có nên chuyển nhà trong năm nay không')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Đóng' }).click()
  await expect(dialog).toBeHidden()
  await page.getByText(/Chọn \d lá để tiếp tục/).click()
  await pickCards(page)
  await waitForReading(page)
})

test('lỗi từ provider hiện thông báo và không treo', async ({ page }) => {
  await ask(page, '[e2e:error] Câu hỏi gây lỗi')
  await expect(page.getByRole('alert').filter({ hasText: 'Demo: lỗi giả lập từ provider.' })).toBeVisible()
  // Không còn chỉ báo nào quay mãi; có chỗ hỏi lại ngay trong tin.
  await expect(page.getByText('Lượt đọc này bị gián đoạn.')).toBeVisible()
  await expect(page.locator('[data-status="running"]')).toHaveCount(0)
  await expect(page.getByTestId('thread-viewport').getByRole('button', { name: 'Hỏi lại' })).toBeEnabled()
  // Ô nhập dùng lại được ngay.
  await expect(page.getByRole('button', { name: 'Gửi', exact: true })).toBeVisible()
})

test('câu hỏi quá ngắn được báo, không gửi đi', async ({ page }) => {
  await page.goto('chat')
  await page.getByRole('textbox', { name: 'Câu hỏi', exact: true }).fill('hi')
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Câu hỏi ngắn quá' })).toBeVisible()
})
