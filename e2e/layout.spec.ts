import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { ask, checkLayout, pickCards, waitForReading } from './helpers'

/**
 * Bất biến bố cục trên từng trang, ở cả sáng và tối, trên mọi thiết bị trong
 * playwright.config. Đây là lưới bắt lỗi giao diện: tràn ngang, nút bé, ô nhập
 * khuất dưới đáy, tương phản kém.
 */
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`bố cục (${scheme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('oraclia.color-scheme', value), scheme)
    })

    test('chat trống', async ({ page }) => {
      await page.goto('chat')
      await expect(page.getByRole('heading', { name: 'Bạn đang nghĩ gì?' })).toBeVisible()
      await composerInView(page)
      await checkLayout(page, 'chat trống')
    })

    test('bộ bài đang mở', async ({ page }) => {
      await ask(page, 'Một câu hỏi vừa đủ dài để rút ba lá bài')
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.waitForTimeout(400)
      await checkLayout(page, 'chọn bài')
    })

    test('bài đọc hoàn tất', async ({ page }) => {
      await ask(page, 'Một câu hỏi vừa đủ dài để rút ba lá bài')
      await pickCards(page)
      await waitForReading(page)
      await composerInView(page)
      await checkLayout(page, 'bài đọc')
    })

    for (const path of ['settings/memory', 'settings/style', 'settings/account', 'settings/appearance']) {
      test(path, async ({ page }) => {
        await page.goto(path)
        await expect(page.getByRole('button', { name: 'Quay lại' })).toBeVisible()
        await page.waitForTimeout(300)
        await checkLayout(page, path)
      })
    }
  })
}

test('trang đăng nhập', async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()
  await page.goto('login')
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible()
  await checkLayout(page, 'đăng nhập')
  await context.close()
})

async function composerInView(page: Page) {
  const box = await page.getByRole('textbox', { name: 'Câu hỏi', exact: true }).boundingBox()
  const height = page.viewportSize()!.height
  expect(box, 'ô nhập').not.toBeNull()
  expect(box!.y + box!.height, 'ô nhập nằm trong màn hình').toBeLessThanOrEqual(height)
}
