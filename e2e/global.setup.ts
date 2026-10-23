import { expect, test as setup } from '@playwright/test'
import { authFile, e2eUser, localSupabase, PROJECTS } from './env'

/**
 * Mỗi project một user E2E, tạo bằng admin API (local bật xác nhận email nên
 * không đăng ký qua giao diện được). Xoá sạch dữ liệu cũ để mỗi lần chạy bắt đầu
 * như nhau, rồi đăng nhập qua giao diện thật và lưu phiên cho các test sau.
 */
for (const project of PROJECTS) {
  setup(`đăng nhập user E2E (${project})`, async ({ page, request }) => {
    const { url, serviceKey } = localSupabase()
    const admin = { apikey: serviceKey, authorization: `Bearer ${serviceKey}` }
    const user = e2eUser(project)

    await request.post(`${url}/auth/v1/admin/users`, {
      headers: admin,
      data: { email: user.email, password: user.password, email_confirm: true },
    })
    const users = await (await request.get(`${url}/auth/v1/admin/users?per_page=500`, { headers: admin })).json()
    const row = users.users.find((item: { email: string }) => item.email === user.email)
    expect(row, 'user E2E').toBeTruthy()
    for (const table of ['conversations', 'memories', 'user_settings']) {
      await request.delete(`${url}/rest/v1/${table}?user_id=eq.${row.id}`, { headers: admin })
    }

    await page.goto('login')
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Mật khẩu').fill(user.password)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await page.waitForURL(/\/chat/)
    await page.context().storageState({ path: authFile(project) })
  })
}
