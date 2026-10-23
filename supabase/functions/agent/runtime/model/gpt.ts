import type { ToolDefinition } from '../../../_shared/types.ts'

/**
 * Model suy luận của OpenAI (GPT-5.x, o1/o3/o4…): không nhận `temperature` khác
 * mặc định, đòi `max_completion_tokens` thay cho `max_tokens`, và có `reasoning`.
 * Tên qua router có thể kèm tiền tố, ví dụ `openai/gpt-5.4-mini`.
 */
export function isReasoningModel(name: string): boolean {
  const model = name.toLowerCase().split('/').pop() ?? ''
  return /^(gpt-5|o\d)(\b|[-.])/.test(model)
}

/** Model của OpenAI nói chung (để bật strict tool, prompt cache key…). */
export function isOpenAIModel(name: string, baseUrl: string): boolean {
  const model = name.toLowerCase()
  return /api\.openai\.com/.test(baseUrl) || /^(openai\/)?(gpt-|o\d)/.test(model)
}

type Schema = Record<string, unknown>

/**
 * Chuyển schema tool sang dạng strict của OpenAI: mọi thuộc tính đều phải có mặt,
 * không thuộc tính lạ. Trường vốn tuỳ chọn được phép `null` — code tool đã coi
 * null như vắng mặt (`?? ''`, `Array.isArray`, `!== false`).
 *
 * Strict mode bắt model sinh đúng schema thay vì "gần đúng"; với GPT đó là khác
 * biệt giữa tham số luôn parse được và thỉnh thoảng hỏng một lượt rút bài.
 */
export function strictTools(tools: ToolDefinition[]): ToolDefinition[] {
  return tools.map((tool) => ({
    ...tool,
    function: {
      ...tool.function,
      strict: true,
      parameters: strictObject(tool.function.parameters),
    },
  }))
}

function strictObject(schema: Schema): Schema {
  const properties = (schema.properties ?? {}) as Record<string, Schema>
  const required = new Set((schema.required as string[] | undefined) ?? [])
  const strictProperties: Record<string, Schema> = {}
  for (const [key, value] of Object.entries(properties)) {
    const converted = strictValue(value)
    strictProperties[key] = required.has(key) ? converted : nullable(converted)
  }
  return {
    ...schema,
    properties: strictProperties,
    required: Object.keys(properties),
    additionalProperties: false,
  }
}

function strictValue(schema: Schema): Schema {
  if (schema.type === 'object') return strictObject(schema)
  if (schema.type === 'array' && schema.items) {
    return { ...schema, items: strictValue(schema.items as Schema) }
  }
  return schema
}

function nullable(schema: Schema): Schema {
  const type = schema.type
  const next: Schema = { ...schema, type: Array.isArray(type) ? [...type, 'null'] : [type, 'null'] }
  if (Array.isArray(schema.enum)) next.enum = [...schema.enum, null]
  return next
}
