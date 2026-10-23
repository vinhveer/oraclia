import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 992

/** Trên màn hình nhỏ danh sách nằm trong menu; mở nó trước khi bấm link. */
export async function openNav(page: Page) {
  if (isMobile(page)) await page.getByRole('button', { name: 'Mở danh sách' }).click()
}

/** Mở cuộc trò chuyện mới và gửi một câu hỏi. */
export async function ask(page: Page, question: string) {
  await page.goto('chat')
  await send(page, question)
}

export async function send(page: Page, question: string) {
  const input = page.getByRole('textbox', { name: 'Câu hỏi', exact: true })
  await input.fill(question)
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
}

/** Chờ bộ bài úp hiện ra, để máy chọn giúp, rồi lật. */
export async function pickCards(page: Page) {
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Chọn giúp tôi' }).click()
  await dialog.getByRole('button', { name: 'Lật bài' }).click()
  await expect(dialog).toBeHidden()
}

/** Bài đọc xong khi các nút đánh giá hiện ra (chỉ có khi tin đã lưu ở server). */
export async function waitForReading(page: Page) {
  await expect(page.getByRole('button', { name: 'Bài đọc hay' }).last()).toBeVisible({ timeout: 45_000 })
}

/** Vùng cuộn của cuộc trò chuyện. */
export const viewport = (page: Page) => page.locator('[data-testid="thread-viewport"]')

export async function distanceFromBottom(page: Page) {
  return viewport(page).evaluate((node) => node.scrollHeight - node.scrollTop - node.clientHeight)
}

/**
 * Các bất biến bố cục, kiểm ở mọi trang × mọi thiết bị:
 * - không cuộn ngang;
 * - mọi nút / link nhìn thấy được đủ lớn để chạm (WCAG 2.5.8: 24px);
 * - không phần tử tương tác nào tràn ra ngoài màn hình;
 * - axe không có lỗi serious / critical.
 */
export async function checkLayout(page: Page, label: string) {
  const report = await page.evaluate(() => {
    const doc = document.documentElement
    const width = window.innerWidth
    const problems: string[] = []
    if (doc.scrollWidth > doc.clientWidth + 1) problems.push(`cuộn ngang: ${doc.scrollWidth} > ${doc.clientWidth}`)
    const interactive = document.querySelectorAll<HTMLElement>(
      'button, a[href], input, textarea, select, [role="button"]',
    )
    for (const node of interactive) {
      const box = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      if (!box.width || !box.height || style.visibility === 'hidden' || style.opacity === '0') continue
      if (node.closest('[aria-hidden="true"], [inert]')) continue
      // Link nằm trong câu chữ được WCAG 2.5.8 miễn: kích thước do dòng chữ quyết định.
      if (style.display === 'inline' && node.parentElement?.closest('p')) continue
      const name = (node.getAttribute('aria-label') || node.textContent || node.tagName).trim().slice(0, 40)
      if (box.width < 24 || box.height < 24) problems.push(`quá nhỏ (${Math.round(box.width)}×${Math.round(box.height)}): ${name}`)
      if (box.right > width + 1 || box.left < -1) problems.push(`tràn ngang: ${name}`)
    }
    return problems
  })
  expect(report, `${label}: bố cục`).toEqual([])

  const axe = await new AxeBuilder({ page }).disableRules(['region']).analyze()
  const serious = axe.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).slice(0, 3).join(' | ')}`)
  expect(serious, `${label}: accessibility`).toEqual([])
}
