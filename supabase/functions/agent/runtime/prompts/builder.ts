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
    const playing = cards.every((card) => card.deck === 'playing')
    const lines = cards
      .map(
        (card, index) =>
          `- ${card.position}: ${card.name_vi} (${card.name})` +
          `${playing ? '' : `, ${card.orientation}`}\n` +
          `  Từ khóa: ${card.keywords.join(', ')}\n  Nghĩa tham khảo: ${card.meaning}\n` +
          `  Chèn bằng: [[card:${index + 1}]]`,
      )
      .join('\n')
    const range = PromptBuilder.readingLength(cards.length, playing)
    const kind = playing ? 'bài tây' : 'tarot'
    const cardDetail = playing
      ? 'Mỗi lá chỉ cần 2-3 câu và không nhắc chiều xuôi/ngược.'
      : 'Mỗi lá cần 3-5 câu; chỉ nói chiều xuôi/ngược khi nó thật sự làm đổi trọng tâm.'

    return `Người hỏi đã tự chọn ${cards.length} lá ${kind} cho câu hỏi: ${question}

${lines}

Trình bày bằng đúng ba tiêu đề Markdown sau:

1. "### Bức tranh chung" — phần này TUYỆT ĐỐI không chứa mã [[card:N]] nào; mọi
mã đều nằm ở mục 2. Với nhiều lá, gom cả trải bài thành một diễn biến rõ từ đầu
đến cuối trong 2-4 câu; với một lá, nói thẳng kết luận nổi bật, không cố tạo
diễn biến.
2. "### Từng lá" — đi đúng thứ tự. Trước phần giải mỗi lá, đặt đúng mã [[card:N]]
trên một dòng riêng, rồi ghi **vị trí — tên lá** và viết một đoạn gọn về vai trò
của lá trong câu chuyện chung. ${cardDetail}
3. "### Tóm lại" — mở bằng một câu in đậm chốt câu trả lời, sau đó nêu 1-2 việc
người hỏi nên làm hoặc nên tránh. Không kết bằng một câu chiêm nghiệm mơ hồ.

Bắt buộc: mỗi mã [[card:N]] chỉ xuất hiện đúng một lần, nằm riêng một dòng,
không nằm trong ngoặc hay câu văn. Đừng dùng mã nào ngoài danh sách trên.

Không lặp lại nguyên văn nghĩa tham khảo, không mở từng lá bằng những câu máy
móc như "Đầu tiên, bạn rút được...". Độ dài toàn bài khoảng ${range} từ.`
  }

  private static readingLength(count: number, playing: boolean): string {
    if (playing) {
      if (count === 1) return '90-140'
      if (count <= 3) return '160-250'
      return '250-340'
    }
    if (count === 1) return '150-200'
    if (count <= 3) return '240-330'
    if (count <= 5) return '330-450'
    return '430-560'
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
