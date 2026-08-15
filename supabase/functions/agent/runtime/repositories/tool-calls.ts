import { Repository } from './base.ts'

export class ToolCallRepository extends Repository {
  async start(input: {
    runId: string
    userId: string
    callId: string
    name: string
    args: Record<string, unknown>
  }): Promise<string | null> {
    const { data } = await this.db
      .from('tool_calls')
      .insert({
        run_id: input.runId,
        user_id: input.userId,
        call_id: input.callId,
        name: input.name,
        arguments: input.args,
        status: 'running',
      })
      .select('id')
      .single()
    return data?.id ?? null
  }

  async finish(id: string | null, status: string, result: unknown, durationMs: number) {
    if (!id) return
    await this.db
      .from('tool_calls')
      .update({ status, result, duration_ms: durationMs })
      .eq('id', id)
  }
}
