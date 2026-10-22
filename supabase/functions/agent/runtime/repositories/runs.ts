import type { ModelMessage } from '../../../_shared/types.ts'
import { Repository } from './base.ts'

export type RunStatus = 'running' | 'awaiting_input' | 'completed' | 'failed'

export interface RunRow {
  id: string
  conversation_id: string
  question: string
  state: ModelMessage[]
  status: RunStatus
  step_count: number
}

/**
 * Run còn `running` mà lâu không được ghi là worker đã chết giữa chừng: mỗi bước
 * đều checkpoint, nên một run sống không bao giờ im lâu đến thế.
 */
const STALE_AFTER_MS = 5 * 60 * 1000

export class RunRepository extends Repository {
  async create(input: {
    conversationId: string
    userId: string
    model: string
    promptVersion: string
    question: string
    state: ModelMessage[]
  }): Promise<string> {
    const { data, error } = await this.db
      .from('agent_runs')
      .insert({
        conversation_id: input.conversationId,
        user_id: input.userId,
        model: input.model,
        prompt_version: input.promptVersion,
        question: input.question,
        state: input.state,
        status: 'running',
      })
      .select('id')
      .single()
    if (error) throw new Error(`Không khởi tạo được agent run: ${error.message}`)
    return data.id
  }

  async get(runId: string): Promise<RunRow | null> {
    const { data } = await this.db
      .from('agent_runs')
      .select('id, conversation_id, question, state, status, step_count')
      .eq('id', runId)
      .maybeSingle()
    return (data as RunRow) ?? null
  }

  async save(
    runId: string,
    state: ModelMessage[],
    stepCount: number,
    status: RunStatus,
    error: string | null,
  ): Promise<void> {
    await this.db
      .from('agent_runs')
      .update({ state, step_count: stepCount, status, error, updated_at: new Date().toISOString() })
      .eq('id', runId)
  }

  async setStatus(runId: string, status: RunStatus): Promise<void> {
    await this.db
      .from('agent_runs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', runId)
  }

  /** Đánh dấu hỏng những run mà worker đã chết giữa chừng, để chúng không treo mãi. */
  async sweepStale(): Promise<void> {
    await this.db
      .from('agent_runs')
      .update({ status: 'failed', error: 'Run bị gián đoạn.', updated_at: new Date().toISOString() })
      .eq('status', 'running')
      .lt('updated_at', new Date(Date.now() - STALE_AFTER_MS).toISOString())
  }

  /**
   * Đếm số câu hỏi trong một giờ để chặn lạm dụng; RLS làm cho nó tự per-user.
   * Lượt phản tư là việc của hệ thống, không tính vào hạn mức của người hỏi.
   * Không đếm được thì ném lỗi: trả 0 là mở toang giới hạn đúng lúc DB trục trặc.
   */
  async countSince(userId: string, since: string): Promise<number> {
    const { count, error } = await this.db
      .from('agent_runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since)
      .not('prompt_version', 'like', 'reflect:%')
    if (error) throw new Error(`Không kiểm tra được hạn mức: ${error.message}`)
    return count ?? 0
  }
}
