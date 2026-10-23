import { expect, test } from './fixtures'
import { e2eUser, localSupabase } from './env'
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

test('xoá toàn bộ ký ức: mất điều đã nhớ và lượt xem cũ, giữ phần "Về bạn"', async ({ page, request }) => {
  test.skip(test.info().project.name !== 'desktop', 'một lần là đủ')
  const { url, serviceKey } = localSupabase()
  const admin = { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json' }
  const users = await (await request.get(`${url}/auth/v1/admin/users?per_page=500`, { headers: admin })).json()
  const userId = users.users.find((item: { email: string }) => item.email === e2eUser('desktop').email).id

  // Một cuộc có bản tóm tắt và một lượt xem cũ gắn với nó.
  await ask(page, '[e2e:chat] Cuộc để thử quên hết')
  await waitForReading(page)
  const conversationId = page.url().split('/chat/')[1]
  await request.patch(`${url}/rest/v1/conversations?id=eq.${conversationId}`, {
    headers: admin,
    data: { context_summary: 'Tóm tắt sẽ bị quên' },
  })
  await request.post(`${url}/rest/v1/memories`, {
    headers: admin,
    data: [
      { user_id: userId, content: 'Điều nhớ thứ nhất sẽ bị quên', kind: 'profile', importance: 2 },
      { user_id: userId, content: 'Điều nhớ thứ hai sẽ bị quên', kind: 'preference', importance: 1 },
    ],
  })
  await request.post(`${url}/rest/v1/reading_records`, {
    headers: admin,
    data: {
      user_id: userId,
      conversation_id: conversationId,
      question: 'Lượt xem cũ sẽ bị quên',
      kind: 'tarot',
      record: '[Trải bài đã rút: Hiện tại → Ba Kiếm (xuôi)]',
    },
  })
  await request.post(`${url}/rest/v1/user_settings`, {
    headers: { ...admin, prefer: 'resolution=merge-duplicates' },
    data: { user_id: userId, about_you: 'Phần về bạn phải còn' },
  })

  await page.goto('settings/memory')
  await expect(page.getByText('Điều nhớ thứ nhất sẽ bị quên')).toBeVisible()
  await page.getByRole('button', { name: 'Xoá toàn bộ ký ức' }).click()
  await page.getByRole('button', { name: 'Xoá hết' }).click()
  await expect(page.getByText('Oraclia đã quên hết')).toBeVisible()
  await expect(page.getByText('Điều nhớ thứ nhất sẽ bị quên')).toHaveCount(0)

  const count = async (table: string) =>
    (await (await request.get(`${url}/rest/v1/${table}?user_id=eq.${userId}&select=id`, { headers: admin })).json()).length
  expect(await count('memories')).toBe(0)
  expect(await count('reading_records')).toBe(0)
  const [conversation] = await (
    await request.get(`${url}/rest/v1/conversations?id=eq.${conversationId}&select=context_summary`, { headers: admin })
  ).json()
  expect(conversation.context_summary).toBe('')
  await expect(page.getByLabel('Về bạn')).toHaveValue('Phần về bạn phải còn')
})
