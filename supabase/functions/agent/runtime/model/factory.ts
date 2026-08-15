import { ModelAdapter } from './adapter.ts'
import { DemoAdapter } from './demo.ts'
import { OpenAICompatibleAdapter } from './openai.ts'

export function createModelAdapter(): ModelAdapter {
  const apiKey = Deno.env.get('LLM_API_KEY') ?? ''
  if (!apiKey) return new DemoAdapter()
  return new OpenAICompatibleAdapter(
    Deno.env.get('LLM_BASE_URL') ?? 'https://api.openai.com/v1',
    apiKey,
    Deno.env.get('LLM_MODEL') ?? 'gpt-4.1-mini',
  )
}

export { ModelAdapter }
export type { ModelStep, StepHandlers } from './adapter.ts'
