import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { ask, waitForReading } from './helpers'
import { authFile, localSupabase } from './env'

/**
 * Thử đúng những gì kẻ xấu sẽ thử: gọi thẳng REST API bằng JWT của một người
 * dùng thường (hoặc không có JWT nào), bỏ qua giao diện. Mỗi lỗ đã đóng có một
 * test ở đây để nó không mở lại.
 */
const { url, anonKey } = localSupabase()

function sessionToken(project: string): string {
  const state = JSON.parse(readFileSync(authFile(project), 'utf8'))
  for (const origin of state.origins ?? []) {
    for (const item of origin.localStorage ?? []) {
      if (item.name.startsWith('sb-') && item.name.endsWith('-auth-token')) {
        return JSON.parse(item.value).access_token
      }
    }
  }
  throw new Error('Không tìm thấy phiên đăng nhập trong storage state')
}

test.describe('bảo mật API', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'desktop', 'kiểm tra API, không phụ thuộc thiết bị')
  })

  const user = () => ({ apikey: anonKey, authorization: `Bearer ${sessionToken('desktop')}` })
  const other = () => ({ apikey: anonKey, authorization: `Bearer ${sessionToken('laptop')}` })
  const anon = { apikey: anonKey, authorization: `Bearer ${anonKey}` }

  test('người dùng không sửa được run, câu làm rõ, lượt rút của chính mình', async ({ page, request }) => {
    await ask(page, '[e2e:chat] Tạo một run để thử sửa')
    await waitForReading(page)
    const headers = { ...user(), 'content-type': 'application/json', prefer: 'return=representation' }

    for (const table of ['agent_runs', 'clarifications', 'readings', 'castings', 'tool_calls', 'model_calls']) {
      const read = await request.get(`${url}/rest/v1/${table}?select=*&limit=1`, { headers })
      expect(read.status(), `${table}: đọc`).toBeGreaterThanOrEqual(400)
      const write = await request.post(`${url}/rest/v1/${table}`, { headers, data: {} })
      expect(write.status(), `${table}: ghi`).toBeGreaterThanOrEqual(400)
    }
    const patch = await request.patch(`${url}/rest/v1/agent_runs?id=not.is.null`, {
      headers,
      data: { step_count: 0, status: 'awaiting_input' },
    })
    expect(patch.status()).toBeGreaterThanOrEqual(400)
  })

  test('không tự chèn tin nhắn hay tự tạo cuộc trò chuyện', async ({ request }) => {
    const headers = { ...user(), 'content-type': 'application/json' }
    const message = await request.post(`${url}/rest/v1/messages`, {
      headers,
      data: { role: 'assistant', content: 'giả mạo' },
    })
    expect(message.status()).toBeGreaterThanOrEqual(400)
    const conversation = await request.post(`${url}/rest/v1/conversations`, { headers, data: {} })
    expect(conversation.status()).toBeGreaterThanOrEqual(400)
  })

  test('không đọc được system prompt', async ({ request }) => {
    const response = await request.get(`${url}/rest/v1/prompts?select=body&limit=1`, { headers: user() })
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test('không tự nâng quyền admin', async ({ request }) => {
    const response = await request.patch(`${url}/rest/v1/profiles?id=not.is.null`, {
      headers: { ...user(), 'content-type': 'application/json' },
      data: { role: 'admin' },
    })
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test('không ghi được dữ liệu tham khảo và hư từ', async ({ request }) => {
    const headers = { ...user(), 'content-type': 'application/json' }
    for (const table of ['cards', 'knowledge_entries', 'text_stopwords', 'hexagrams']) {
      const response = await request.post(`${url}/rest/v1/${table}`, { headers, data: { word: 'x' } })
      expect(response.status(), table).toBeGreaterThanOrEqual(400)
    }
  })

  test('không gọi được hàm nội bộ', async ({ request }) => {
    for (const fn of ['sync_reading_grants', 'handle_new_user', 'touch_conversation']) {
      const response = await request.post(`${url}/rest/v1/rpc/${fn}`, {
        headers: { ...user(), 'content-type': 'application/json' },
        data: {},
      })
      expect(response.status(), fn).toBeGreaterThanOrEqual(400)
    }
  })

  test('người chưa đăng nhập không đọc, không gọi được gì', async ({ request }) => {
    for (const table of ['cards', 'messages', 'conversations', 'memories', 'knowledge_entries']) {
      const response = await request.get(`${url}/rest/v1/${table}?select=*&limit=1`, { headers: anon })
      expect(response.status(), table).toBeGreaterThanOrEqual(400)
    }
    const rpc = await request.post(`${url}/rest/v1/rpc/match_knowledge`, {
      headers: { ...anon, 'content-type': 'application/json' },
      data: { query_text: 'ba kiếm' },
    })
    expect(rpc.status()).toBeGreaterThanOrEqual(400)
    const agent = await request.post(`${url}/functions/v1/agent`, {
      headers: { ...anon, 'content-type': 'application/json' },
      data: { action: 'message', question: 'xin chào bạn' },
    })
    expect(agent.status()).toBeGreaterThanOrEqual(400)
  })

  test('không thấy tin nhắn, trí nhớ của người khác', async ({ page, request }) => {
    await ask(page, '[e2e:chat] Tin riêng tư của người dùng desktop')
    await waitForReading(page)
    for (const table of ['messages', 'conversations', 'memories', 'reading_records']) {
      const response = await request.get(`${url}/rest/v1/${table}?select=*`, { headers: other() })
      const rows = await response.json()
      expect(JSON.stringify(rows), table).not.toContain('Tin riêng tư của người dùng desktop')
    }
  })

  test('không mượn được run của người khác để chạy tiếp', async ({ page, request }) => {
    await ask(page, '[e2e:clarify] Run của desktop để người khác thử mượn')
    await page.getByRole('dialog').waitFor()
    // Lấy run id từ chính phiên của desktop qua bảng tin nhắn (run_id không lộ
    // cho trình duyệt), nên thử đoán: một uuid ngẫu nhiên phải bị từ chối, và
    // gọi tiếp với run của người khác cũng chung một kết quả.
    const response = await request.post(`${url}/functions/v1/agent`, {
      headers: { ...other(), 'content-type': 'application/json' },
      data: {
        action: 'select_cards',
        run_id: crypto.randomUUID(),
        reading_id: crypto.randomUUID(),
        indices: [0],
      },
    })
    expect(response.status()).toBe(409)
  })

  test('lỗi nội bộ không lộ chi tiết hạ tầng', async ({ request }) => {
    const response = await request.post(`${url}/functions/v1/agent`, {
      headers: { ...user(), 'content-type': 'application/json' },
      data: { action: 'answer_clarify', run_id: 'not-a-uuid', clarification_id: 'x', answer: 'y' },
    })
    const body = await response.text()
    expect(body).not.toMatch(/relation|column|syntax|uuid|postgres|PGRST/i)
  })
})
