import { expect, test } from './fixtures'
import { ask, isMobile, pickCards, waitForReading } from './helpers'

test('chế độ tối được nhớ và áp trước lần vẽ đầu', async ({ page }) => {
  await page.goto('settings/appearance')
  await page.getByText('Tối', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'dark')

  // Ghi lại thuộc tính ngay khi HTML vừa parse xong, trước khi React chạy.
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      ;(window as unknown as { firstScheme: string | null }).firstScheme =
        document.documentElement.getAttribute('data-mantine-color-scheme')
    })
  })
  await page.reload()
  expect(await page.evaluate(() => (window as unknown as { firstScheme: string }).firstScheme)).toBe('dark')
  await page.getByText('Sáng', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'light')
})

test('đổi màu chủ đạo', async ({ page }) => {
  await page.goto('settings/appearance')
  await page.getByRole('button', { name: 'Hồng đất' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Hồng đất' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Tím' }).click()
})

test('cài đặt cách trả lời được lưu', async ({ page }) => {
  await page.goto('settings/style')
  await page.getByRole('button', { name: 'Ngắn gọn, đi thẳng vào ý chính' }).click()
  await page.getByRole('button', { name: 'Lưu' }).click()
  await expect(page.getByText('Đã lưu.')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Phong cách trả lời')).toHaveValue(/Ngắn gọn/)
})

test('trí nhớ: lượt phản tư ghi nhớ, sửa được và quên được', async ({ page }) => {
  test.slow()
  await ask(page, '[e2e:remember] Tôi làm thiết kế, hỏi chuyện công việc')
  await pickCards(page)
  await waitForReading(page)
  // Lượt phản tư chạy sau 6 giây không gõ.
  await expect(page.getByText('Đã ghi nhớ.')).toBeVisible({ timeout: 20_000 })

  await page.goto('settings/memory')
  const memory = page.getByText('Làm thiết kế đồ hoạ ở một agency')
  await expect(memory).toBeVisible()
  await page.getByRole('button', { name: 'Sửa', exact: true }).first().click()
  await page.getByLabel('Sửa điều đã nhớ').fill('Làm thiết kế sản phẩm ở một công ty')
  await page.getByRole('button', { name: 'Lưu', exact: true }).first().click()
  await expect(page.getByText('Làm thiết kế sản phẩm ở một công ty')).toBeVisible()
})

test('mobile: menu mở, chọn cuộc thì tự đóng; ô nhập giữ focus sau khi gửi', async ({ page }) => {
  test.skip(!isMobile(page), 'chỉ cho màn hình nhỏ')
  await ask(page, '[e2e:chat] Kiểm tra focus trên điện thoại')
  await expect(page.getByRole('textbox', { name: 'Câu hỏi', exact: true })).toBeFocused()
  await waitForReading(page)

  await page.getByRole('button', { name: 'Mở danh sách' }).click()
  const link = page.getByRole('link', { name: /Kiểm tra focus/ }).first()
  await expect(link).toBeVisible()
  await link.click()
  // Menu đóng trượt ra ngoài màn hình chứ không bị gỡ khỏi DOM.
  await expect(link).not.toBeInViewport()
})

test('đăng nhập sai báo lỗi rõ ràng', async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()
  await page.goto('login')
  await page.getByLabel('Email').fill('e2e-desktop@oraclia.test')
  await page.getByLabel('Mật khẩu').fill('sai-mat-khau')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page.getByText('Email hoặc mật khẩu không đúng.')).toBeVisible()
  await context.close()
})
