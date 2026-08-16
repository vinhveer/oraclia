import { Repository } from './base.ts'

export interface LoadedPrompt {
  version: string
  body: string
}

export interface UserSettings {
  aboutYou: string
  responseStyle: string
}

/** Prompt biên dịch sẵn: một hàng prompts hỏng không được phép làm sập chat. */
const FALLBACK: Record<string, string> = {
  reader: `Bạn là Oraclia, một người đọc tarot, bài tây và Kinh Dịch điềm tĩnh, thẳng thắn và thực tế.
Tarot và Kinh Dịch là công cụ tự suy ngẫm, không phải lời tiên tri chắc chắn.
Khi đọc bài, nêu bức tranh chung trước, giải từng lá ngắn gọn rồi có phần Tóm lại.
Khi đọc quẻ, chỉ nêu thế quẻ, điểm chuyển và việc nên làm. Kết luận rõ nhưng không
hù dọa hoặc tâng bốc. Trả lời bằng tiếng Việt tự nhiên, Markdown gọn.`,
  compactor: `Cô đọng hội thoại thành bộ nhớ dưới 700 từ. Giữ người liên quan, mục tiêu,
nỗi lo, lá bài, quẻ và insight còn giá trị. Không suy diễn thêm.`,
}

export class PromptRepository extends Repository {
  async active(slug: 'reader' | 'compactor'): Promise<LoadedPrompt> {
    const { data } = await this.db
      .from('prompts')
      .select('version, body')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()
    if (data?.body) return { version: data.version, body: data.body }
    return { version: 'fallback', body: FALLBACK[slug] }
  }

  async userSettings(): Promise<UserSettings> {
    const { data } = await this.db
      .from('user_settings')
      .select('about_you, response_style')
      .maybeSingle()
    return {
      aboutYou: (data?.about_you ?? '').trim(),
      responseStyle: (data?.response_style ?? '').trim(),
    }
  }
}
