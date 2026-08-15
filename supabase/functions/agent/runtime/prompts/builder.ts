import type { ChatTurn, DrawnCard, ModelMessage } from '../../../_shared/types.ts'
import type { UserSettings } from '../repositories/prompts.ts'

export class PromptBuilder {
  constructor(
    private readonly system: string,
    private readonly settings: UserSettings,
    /** Những điều agent đã tự ghi nhớ về người hỏi qua các cuộc trước. */
    private readonly memories: string[] = [],
  ) {}

  /**
   * Mở đầu một run: system prompt, hồ sơ người dùng, rồi bối cảnh cuộc trò
   * chuyện. Hồ sơ đứng riêng vì nó áp cho mọi cuộc, khác với summary vốn chỉ
   * thuộc về một cuộc.
   */
  runMessages(summary: string, recent: ChatTurn[], question: string): ModelMessage[] {
    const messages: ModelMessage[] = [{ role: 'system', content: this.system }]

    const profile = [
      this.settings.aboutYou && `Điều người hỏi muốn bạn biết về họ:\n${this.settings.aboutYou}`,
      this.memories.length &&
        `Những điều bạn đã ghi nhớ về họ từ trước:\n${this.memories
          .map((fact) => `- ${fact}`)
          .join('\n')}`,
      this.settings.responseStyle &&
        `Cách người hỏi muốn được trả lời:\n${this.settings.responseStyle}`,
    ]
      .filter(Boolean)
      .join('\n\n')

    if (profile) {
      messages.push({
        role: 'system',
        content: `${profile}\n\nTôn trọng những điều trên, trừ khi chúng mâu thuẫn với nguyên tắc an toàn.`,
      })
    }

    messages.push({
      role: 'system',
      content:
        `Bối cảnh cô đọng của cuộc trò chuyện:\n${summary || '(chưa có)'}\n\n` +
        `Các lượt gần nhất:\n${
          recent.map((turn) => `${turn.role}: ${turn.content}`).join('\n') || '(chưa có)'
        }\n\nGhi nhớ chi tiết quan trọng trong bối cảnh nhưng không nhắc rằng bạn đang dùng ` +
        `summary. Ưu tiên câu hỏi mới và chỉ liên hệ với chuyện cũ khi thật sự hữu ích.`,
    })

    messages.push({ role: 'user', content: question })
    return messages
  }

  /** Những gì model thấy sau khi người hỏi đã tự tay chọn bài. */
  static drawResult(question: string, cards: DrawnCard[]): string {
    const lines = cards
      .map(
        (card, index) =>
          `- ${card.position}: ${card.name_vi} (${card.name}), ${card.orientation}\n` +
          `  Từ khóa: ${card.keywords.join(', ')}\n  Nghĩa tham khảo: ${card.meaning}\n` +
          `  Chèn bằng: [[card:${index + 1}]]`,
      )
      .join('\n')
    const lower = 180 + 160 * cards.length

    return `Người hỏi đã tự chọn ${cards.length} lá cho câu hỏi: ${question}

${lines}

Hãy kể lần lượt từng lá theo đúng thứ tự trên, như đang lật bài cùng người hỏi:
mở đầu bằng một câu dẫn ngắn, rồi với mỗi lá viết một câu dẫn dắt ("Đầu tiên,
bạn rút được lá này", "Nhưng rồi bạn lại rút được lá này", ...), xuống dòng, đặt
đúng mã [[card:N]] của lá đó trên một dòng riêng, rồi diễn giải lá ấy trong
2-4 đoạn: nó nói gì ở vị trí này, chiều xuôi/ngược đổi nghĩa ra sao, và nó liên
hệ thế nào với câu hỏi cùng những lá trước đó.

Bắt buộc: mỗi mã [[card:N]] chỉ xuất hiện đúng một lần, nằm riêng một dòng,
không nằm trong ngoặc hay câu văn. Đừng dùng mã nào ngoài danh sách trên.

Sau khi đi hết các lá, khép lại bằng phần mối liên hệ chung, điều nên cân nhắc
và một câu kết chiêm nghiệm. Không lặp lại nguyên văn nghĩa tham khảo. Độ dài
khoảng ${lower}-${lower + 400} từ.`
  }

  /**
   * Lượt phản tư: model đọc lại hội thoại vừa rồi và tự quyết định ghi nhớ hay
   * cô đọng. Không có ai đọc chữ nó viết, chỉ tool call mới có tác dụng.
   */
  static reflectMessages(
    system: string,
    summary: string,
    memories: string[],
    turns: ChatTurn[],
    uncompacted: number,
  ): ModelMessage[] {
    return [
      { role: 'system', content: system },
      {
        role: 'system',
        content:
          `Bộ nhớ cô đọng hiện có của cuộc trò chuyện:\n${summary || '(chưa có)'}\n\n` +
          `Những điều đã nhớ về người hỏi:\n${
            memories.length ? memories.map((fact) => `- ${fact}`).join('\n') : '(chưa có)'
          }\n\n` +
          // Model không tự thấy được quy mô hội thoại, chỉ thấy đoạn được đưa
          // cho nó; con số này là căn cứ để nó quyết định có cô đọng hay không.
          `Cuộc trò chuyện này hiện có ${uncompacted} tin nhắn chưa nằm trong bộ nhớ cô đọng. ` +
          `Từ khoảng 12 tin trở lên mà bộ nhớ cô đọng còn trống hoặc đã cũ thì nên gọi ` +
          `compact_history.`,
      },
      {
        role: 'user',
        content:
          `Đoạn hội thoại vừa diễn ra:\n\n${turns
            .map((turn) => `${turn.role}: ${turn.content}`)
            .join('\n\n')}\n\nCó gì đáng nhớ hoặc cần cô đọng không?`,
      },
    ]
  }

  static compactionInput(current: string, turns: ChatTurn[]): string {
    const transcript = turns.map((turn) => `${turn.role}: ${turn.content}`).join('\n')
    return `Bộ nhớ cũ:\n${current || '(chưa có)'}\n\nLượt cần gộp:\n${transcript}`
  }
}
