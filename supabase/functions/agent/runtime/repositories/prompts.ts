import type { Db } from '../../../_shared/db.ts'
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
  reflector: `Bạn là phần trí nhớ của Oraclia, không nói chuyện với người dùng. Đọc đoạn
hội thoại vừa diễn ra; gọi remember cho điều đáng nhớ lâu dài về người hỏi, gọi
compact_history khi hội thoại đã dài. Không có gì đáng lưu thì trả lời "bỏ qua".`,
}

export type PromptSlug = 'reader' | 'reflector'

export class PromptRepository extends Repository {
  /**
   * Prompt hệ thống không cho trình duyệt đọc (đó là phần "bí quyết" của sản
   * phẩm, kể cả các bản chưa bật); chỉ edge function đọc bằng service role.
   */
  constructor(
    db: Db,
    private readonly service: Db,
  ) {
    super(db)
  }

  /**
   * Prompt đang bật của slug. `version` ép một phiên bản cụ thể, kể cả chưa bật —
   * dùng để eval so phiên bản mới với bản đang chạy trước khi đổi.
   */
  async active(slug: PromptSlug, version?: string): Promise<LoadedPrompt> {
    let query = this.service.from('prompts').select('version, body').eq('slug', slug)
    query = version ? query.eq('version', version) : query.eq('is_active', true)
    const { data } = await query.maybeSingle()
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
