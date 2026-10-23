import { expect, test } from './fixtures'
import { ask, distanceFromBottom, isMobile, openNav, pickCards, viewport, waitForReading } from './helpers'

const LONG = '[e2e:long] Chuyện tình cảm và công việc của tôi trong năm nay sẽ ra sao'

test('đang stream thì bám đáy; cuộn lên thì nhả, không bị kéo xuống', async ({ page }) => {
  await ask(page, LONG)
  await pickCards(page)
  // Đợi chữ chảy đủ dài để có chỗ mà cuộn.
  await expect
    .poll(() => viewport(page).evaluate((node) => node.scrollHeight - node.clientHeight), { timeout: 20_000 })
    .toBeGreaterThan(600)
  await expect.poll(() => distanceFromBottom(page)).toBeLessThan(80)

  // Người dùng cuộn lên đọc lại. WebKit mobile không có bánh xe chuột, nên cuộn
  // bằng script — với thư viện, đó cũng là một lần cuộn của người dùng.
  if (isMobile(page) || test.info().project.name === 'ipad') {
    await viewport(page).evaluate((node) => node.scrollBy(0, -500))
  } else {
    await viewport(page).hover()
    await page.mouse.wheel(0, -500)
  }
  await page.waitForTimeout(700)
  const away = await distanceFromBottom(page)
  expect(away).toBeGreaterThan(200)
  // Chữ vẫn chảy nhưng không kéo người đọc xuống.
  await page.waitForTimeout(1200)
  expect(await distanceFromBottom(page)).toBeGreaterThan(200)

  // Nút xuống cuối đưa về đáy và bám lại.
  await page.getByRole('button', { name: 'Xuống cuối' }).click()
  await expect.poll(() => distanceFromBottom(page)).toBeLessThan(80)
  await waitForReading(page)
  await expect.poll(() => distanceFromBottom(page)).toBeLessThan(80)
})

test('rời sang cài đặt giữa lúc stream: quay lại vẫn thấy bài đọc hoàn tất', async ({ page }) => {
  await ask(page, LONG)
  await pickCards(page)
  await expect(page.getByRole('button', { name: 'Dừng' })).toBeVisible()
  const url = page.url()

  // Điều hướng trong app, không goto: tải lại trang là tự tay giết stream.
  await openNav(page)
  await page.getByRole('link', { name: 'Giao diện' }).click()
  await expect(page.getByRole('heading', { name: 'Giao diện' })).toBeVisible()
  await page.getByRole('button', { name: 'Quay lại' }).click()
  await expect(page).toHaveURL(url)
  await waitForReading(page)
  await expect(page.getByRole('heading', { name: 'Tóm lại' })).toBeVisible()
})

test('đổi cuộc trò chuyện giữa lúc stream: tin không đổ sang cuộc khác', async ({ page }) => {
  const tag = `${Date.now()}`
  // Cuộc A có sẵn một bài đọc.
  await ask(page, `[e2e:chat] Cuộc A ${tag} chỉ để có chỗ chuyển sang`)
  await waitForReading(page)
  const first = page.url()

  // Cuộc B đang stream dài thì chuyển sang A.
  await ask(page, `[e2e:long] Cuộc B ${tag} về chuyện tình cảm và công việc trong năm nay`)
  await pickCards(page)
  await expect(page.getByRole('button', { name: 'Dừng' })).toBeVisible()
  const second = page.url()
  await openNav(page)
  await page.getByRole('link', { name: new RegExp(`Cuộc A ${tag}`) }).click()
  await expect(page).toHaveURL(first)
  await expect(page.getByTestId('thread-viewport').getByText(`Cuộc A ${tag}`)).toBeVisible()
  await page.waitForTimeout(2500)
  await expect(page.locator('figure')).toHaveCount(0)
  await expect(page.getByText(/Lá này còn gợi ý/)).toHaveCount(0)

  // Quay lại B: bài đọc vẫn tiếp tục và hoàn tất.
  await openNav(page)
  await page.getByRole('link', { name: new RegExp(`Cuộc B ${tag}`) }).click()
  await expect(page).toHaveURL(second)
  await waitForReading(page)
})

test('dừng giữa chừng: giữ phần đã viết, ô nhập dùng lại được', async ({ page }) => {
  await ask(page, LONG)
  await pickCards(page)
  const stop = page.getByRole('button', { name: 'Dừng' })
  await expect(page.locator('figure').first()).toBeVisible()
  await stop.click()
  await expect(stop).toBeHidden()
  await expect(page.getByRole('button', { name: 'Gửi', exact: true })).toBeVisible()
  await expect(page.locator('figure').first()).toBeVisible()
})
