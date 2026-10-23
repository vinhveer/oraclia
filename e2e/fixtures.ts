import { expect, test as base } from '@playwright/test'

/**
 * Mọi test tự fail nếu trang ném lỗi hoặc ghi console.error — kể cả khi các
 * assertion của test vẫn qua. Một vòng render vô hạn từng làm trắng cả app mà
 * chỉ lộ ra như "không tìm thấy nút".
 */
export const test = base.extend<{ consoleGuard: void }>({
  consoleGuard: [
    async ({ page }, use) => {
      const problems: string[] = []
      page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
      page.on('console', (message) => {
        if (message.type() !== 'error') return
        const text = message.text()
        // Lỗi mạng mà test cố tình gây ra (lỗi provider giả lập) không phải lỗi trang.
        if (/Failed to load resource|net::ERR_ABORTED/.test(text)) return
        // WebKit trên Linux báo mọi khoá viewport nó không biết bằng console.error;
        // `interactive-widget` là khoá có chủ đích (Chrome Android), Safari bỏ qua.
        if (/Viewport argument key "interactive-widget" not recognized/.test(text)) return
        problems.push(`console.error: ${text.slice(0, 300)}`)
      })
      await use()
      expect(problems, 'lỗi trên trang').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
