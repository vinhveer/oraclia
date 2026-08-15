import type { ModelMessage } from '../../../_shared/types.ts'
import { Repository } from './base.ts'

export type RunStatus = 'running' | 'awaiting_input' | 'completed' | 'failed'

export interface RunRow {
  id: string
  conversation_id: string
  question: string
  state: ModelMessage[]
  status: RunStatus
}

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
      .select('id, conversation_id, question, state, status')
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
    await this.db.from('agent_runs').update({ status }).eq('id', runId)
  }

  /** Đếm số run trong một giờ để chặn lạm dụng; RLS làm cho nó tự per-user. */
  async countSince(userId: string, since: string): Promise<number> {
    const { count, error } = await this.db
      .from('agent_runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since)
    if (error) return 0
    return count ?? 0
  }
}
