import { expect, test } from './fixtures'
import { e2eUser } from './env'
import { ask, openNav, waitForReading } from './helpers'

test('passkey: tạo, đăng xuất, đăng nhập lại không cần mật khẩu, rồi xoá', async ({ browser }) => {
  // Authenticator ảo chỉ có trên Chromium (CDP).
  test.skip(test.info().project.name !== 'desktop', 'cần authenticator ảo của Chromium')
  // Phiên đăng nhập riêng: test này đăng xuất, không được kéo phiên dùng chung của
  // các test khác theo.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()
  const user = e2eUser('desktop')
  await page.goto('login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Mật khẩu').fill(user.password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.waitForURL(/\/chat/)

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  })

  await page.goto('settings/account')
  // Xoá passkey sót lại từ lần chạy trước để bắt đầu sạch.
  for (const stale of await page.getByRole('button', { name: /^Xoá Máy|^Xoá Passkey|^Xoá Thiết bị/ }).all()) {
    await stale.click()
    await page.getByRole('button', { name: 'Xoá', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Thêm passkey cho thiết bị này' }).click()
  await expect(page.getByText('Đã tạo passkey.')).toBeVisible()
  const row = page.getByRole('button', { name: /^Xoá (Máy|Thiết bị|Passkey)/ })
  await expect(row).toHaveCount(1)

  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('button', { name: 'Đăng nhập bằng passkey' }).click()
  await expect(page).toHaveURL(/\/chat/)

  await page.goto('settings/account')
  await row.click()
  await page.getByRole('button', { name: 'Xoá', exact: true }).click()
  await expect(row).toHaveCount(0)
  await context.close()
})

test('mở cuộc cũ: thấy khung xương trước, rồi nội dung thay vào', async ({ page }) => {
  await ask(page, '[e2e:chat] Cuộc để thử khung xương')
  await waitForReading(page)
  const url = page.url()

  // Làm chậm truy vấn tin nhắn để thấy được trạng thái đang tải.
  await page.route('**/rest/v1/messages?**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    await route.continue()
  })
  await page.goto('chat')
  await openNav(page)
  await page.getByRole('link', { name: /Cuộc để thử khung xương/ }).first().click()
  await expect(page).toHaveURL(url)
  await expect(page.getByRole('status', { name: 'Đang tải cuộc trò chuyện' })).toBeVisible()
  await expect(page.getByTestId('thread-viewport').getByText('Cuộc để thử khung xương')).toBeVisible()
  await expect(page.getByRole('status', { name: 'Đang tải cuộc trò chuyện' })).toHaveCount(0)
  // Không lúc nào hiện màn chào của cuộc mới trong khi đang tải cuộc cũ.
  await expect(page.getByRole('heading', { name: 'Bạn đang nghĩ gì?' })).toHaveCount(0)
})
