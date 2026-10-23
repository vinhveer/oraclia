import { ModelAdapter, type ModelProfile } from './adapter.ts'
import { DemoAdapter } from './demo.ts'
import { FallbackAdapter } from './fallback.ts'
import { OpenAICompatibleAdapter } from './openai.ts'

/**
 * `main` đọc bài; `fast` làm việc nền — đặt tiêu đề, phản tư, cô đọng — nơi một
 * model reasoning đắt chỉ làm chậm và tốn. Không đặt `LLM_MODEL_FAST` thì dùng
 * chung model chính.
 */
export type ModelRole = 'main' | 'fast'

export function createModelAdapter(role: ModelRole = 'main'): ModelAdapter {
  const apiKey = Deno.env.get('LLM_API_KEY') ?? ''
  if (!apiKey) return new DemoAdapter()
  const main = Deno.env.get('LLM_MODEL') ?? 'gpt-4.1-mini'
  const model = role === 'fast' ? Deno.env.get('LLM_MODEL_FAST') || main : main
  const primary = new OpenAICompatibleAdapter(
    Deno.env.get('LLM_BASE_URL') ?? 'https://api.openai.com/v1',
    apiKey,
    model,
    role === 'fast' && model !== main ? {} : profileFromEnv(),
  )
  const backup = createBackup(role)
  return backup ? new FallbackAdapter(primary, backup) : primary
}

/**
 * Provider thứ hai cho lúc provider chính hỏng — tốt nhất là khác hẳn đường đi
 * (không cùng router), vì router chết thì mọi model sau nó chết theo.
 */
function createBackup(role: ModelRole): ModelAdapter | null {
  const apiKey = Deno.env.get('LLM_FALLBACK_API_KEY') ?? ''
  const main = Deno.env.get('LLM_FALLBACK_MODEL') ?? ''
  if (!apiKey || !main) return null
  const model = role === 'fast' ? Deno.env.get('LLM_FALLBACK_MODEL_FAST') || main : main
  // reasoning_effort chỉnh cho model chính; model dự phòng có thể không nhận.
  const profile = role === 'fast' && model !== main ? {} : { ...profileFromEnv(), reasoningEffort: undefined }
  return new OpenAICompatibleAdapter(
    Deno.env.get('LLM_FALLBACK_BASE_URL') ?? 'https://api.openai.com/v1',
    apiKey,
    model,
    profile,
  )
}

function profileFromEnv(): ModelProfile {
  const number = (key: string) => {
    const raw = Deno.env.get(key)?.trim()
    if (!raw || raw === 'none') return undefined
    const value = Number(raw)
    return Number.isFinite(value) ? value : undefined
  }
  // Mặc định giữ 0.75 như trước; đặt LLM_TEMPERATURE=none cho model reasoning
  // chỉ nhận giá trị mặc định của nó.
  const temperature = Deno.env.get('LLM_TEMPERATURE') === undefined ? 0.75 : number('LLM_TEMPERATURE')
  return {
    temperature,
    maxTokens: number('LLM_MAX_TOKENS'),
    reasoningEffort: Deno.env.get('LLM_REASONING_EFFORT')?.trim() || undefined,
  }
}

export { ModelAdapter }
export type { ModelStep, StepHandlers } from './adapter.ts'
