// Agent runtime. Một endpoint, hai lối vào cùng một vòng lặp:
//
//   { action: 'message', conversation_id?, question }        -> mở một run mới
//   { action: 'select_cards', run_id, reading_id, indices }  -> nối tiếp run đang đỗ
//   { action: 'answer_clarify', run_id, clarification_id, answer } -> trả lời câu hỏi làm rõ
//   { action: 'reflect', conversation_id }                   -> lượt phản tư nền
//
// Cả hai đều trả về Server-Sent Events. File này chỉ lo HTTP; mọi thứ khác nằm
// trong runtime/.

import { jsonError, preflight } from '../_shared/cors.ts'
import { serviceClient, userClient } from '../_shared/db.ts'
import { AgentError } from './runtime/errors.ts'
import { AgentSession } from './runtime/session.ts'
import { StreamController } from './runtime/stream.ts'

Deno.serve(async (request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== 'POST') return jsonError(request, 405, 'Method not allowed')

  const authorization = request.headers.get('authorization') ?? ''
  if (!authorization) return jsonError(request, 401, 'Thiếu thông tin đăng nhập.')

  const db = userClient(authorization)

  try {
    const { data, error } = await db.auth.getUser()
    if (error || !data.user) throw new AgentError(401, 'Phiên đăng nhập đã hết hạn.')

    const payload = await request.json().catch(() => ({}))
    const stream = new StreamController()
    const session = new AgentSession(db, serviceClient(), data.user.id)

    if (payload.action === 'answer_clarify') {
      const resumed = await session.answerClarification(payload, stream)
      stream.emit({
        type: 'run.started',
        run_id: resumed.runId,
        conversation_id: resumed.conversationId,
      })
      detach(stream, () => resumed.agentRun.agent.run(resumed.agentRun.run, resumed.messages))
      return stream.response(request)
    }

    if (payload.action === 'reflect') {
      const reflection = await session.reflect(payload, stream)
      // Không có gì mới để nghĩ thì đóng luôn, client không cần biết thêm.
      if (!reflection) {
        stream.close()
        return stream.response(request)
      }
      detach(stream, () =>
        reflection.agentRun.agent.run(reflection.agentRun.run, reflection.messages),
      )
      return stream.response(request)
    }

    if (payload.action === 'select_cards') {
      const resumed = await session.resume(payload, stream)
      stream.emit({
        type: 'run.started',
        run_id: resumed.runId,
        conversation_id: resumed.conversationId,
      })
      stream.emit({ type: 'cards.revealed', cards: resumed.cards })
      detach(stream, () => resumed.agentRun.agent.run(resumed.agentRun.run, resumed.messages))
      return stream.response(request)
    }

    await session.enforceRateLimit()
    const started = await session.start(payload, stream)
    stream.emit({
      type: 'run.started',
      run_id: started.runId,
      conversation_id: started.conversationId,
    })
    detach(stream, () => started.agentRun.agent.run(started.agentRun.run, started.messages))
    return stream.response(request)
  } catch (exception) {
    if (exception instanceof AgentError) {
      return jsonError(request, exception.status, exception.message)
    }
    const message = exception instanceof Error ? exception.message : 'Không thể xử lý yêu cầu.'
    return jsonError(request, 400, message)
  }
})

/** Vòng lặp sống lâu hơn handler; stream mở là thứ giữ worker chạy tiếp. */
function detach(stream: StreamController, work: () => Promise<void>): void {
  work()
    .catch((exception) => {
      const message = exception instanceof Error ? exception.message : 'Không thể đọc bài lúc này.'
      stream.emit({ type: 'run.error', message })
    })
    .finally(() => stream.close())
}
