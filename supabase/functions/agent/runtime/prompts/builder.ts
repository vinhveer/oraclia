import type { ChatTurn, DrawnCard, ModelMessage } from '../../../_shared/types.ts'
import type { KnowledgeEntry } from '../repositories/knowledge.ts'
import type { UserSettings } from '../repositories/prompts.ts'
import { spreadSignals } from '../tarot/spread.ts'

export class PromptBuilder {
  constructor(
    private readonly system: string,
    private readonly settings: UserSettings,
    /** Những điều agent đã tự ghi nhớ về người hỏi qua các cuộc trước. */
    private readonly memories: string[] = [],
    /** Các câu làm rõ đã hỏi gần đây, để không hỏi lại theo cùng một khuôn. */
    private readonly askedBefore: string[] = [],
    /** Vài lượt đọc gần nhất ở các cuộc khác, mỗi lượt một dòng. */
    private readonly pastReadings: string[] = [],
  ) {}

  /**
   * Mở đầu một run: prompt tĩnh đứng một mình ở đầu để provider cache được, rồi
   * một khối <context> gom mọi thứ thay đổi theo người và theo cuộc, rồi lịch sử
   * dưới dạng lượt chat thật, cuối cùng là câu hỏi.
   */
  runMessages(summary: string, history: ModelMessage[], question: string): ModelMessage[] {
    const sections = [
      this.settings.aboutYou && `<about_user>\n${this.settings.aboutYou}\n</about_user>`,
      this.memories.length &&
        `<memories>\nNhững điều bạn đã ghi nhớ về người hỏi từ trước:\n${this.memories
          .map((fact) => `- ${fact}`)
          .join('\n')}\n</memories>`,
      this.settings.responseStyle &&
        `<response_style>\n${this.settings.responseStyle}\n</response_style>`,
      this.askedBefore.length &&
        `<asked_before>\nCâu làm rõ đã hỏi trong cuộc này — lần này mở đầu khác và chọt vào góc khác:\n${this.askedBefore
          .map((item) => `- ${item}`)
          .join('\n')}\n</asked_before>`,
      this.pastReadings.length &&
        `<past_readings>\nVài lượt đọc gần đây ở các cuộc trò chuyện khác (gọi recall_readings để tìm sâu hơn khi câu hỏi nối tiếp chuyện cũ):\n${this.pastReadings
          .map((item) => `- ${item}`)
          .join('\n')}\n</past_readings>`,
      summary && `<conversation_summary>\n${summary}\n</conversation_summary>`,
    ].filter(Boolean)

    const messages: ModelMessage[] = [{ role: 'system', content: this.system }]
    if (sections.length) {
      messages.push({
        role: 'system',
        content:
          `<context>\n${sections.join('\n\n')}\n</context>\n\n` +
          'Tôn trọng hồ sơ và cách trả lời người hỏi muốn, trừ khi trái nguyên tắc an toàn. ' +
          'Dùng bối cảnh cũ khi nó thật sự giúp trả lời câu hỏi mới; không nhắc rằng bạn đang ' +
          'đọc bản tóm tắt hay bộ nhớ.',
      })
    }
    messages.push(...history, { role: 'user', content: question })
    return messages
  }

  /** Những gì model thấy sau khi người hỏi đã tự tay chọn bài. */
  static drawResult(
    question: string,
    cards: DrawnCard[],
    knowledge: Map<string, KnowledgeEntry> = new Map(),
  ): string {
    const playing = cards.every((card) => card.deck === 'playing')
    const lines = cards
      .map((card, index) => {
        const entry = knowledge.get(
          card.deck === 'playing' ? `playing:${card.id}` : `card:${card.id}:${card.orientation}`,
        )
        return (
          `- ${card.position}: ${card.name_vi} (${card.name})` +
          `${playing ? '' : `, ${card.orientation}`}\n` +
          `  Từ khóa: ${card.keywords.join(', ')}\n  Nghĩa tham khảo: ${card.meaning}\n` +
          `  Chèn bằng: [[card:${index + 1}]]` +
          (entry ? `\n  Tri thức về lá này:\n${indent(entry.body_vi, 4)}` : '')
        )
      })
      .join('\n')
    const suits = [...knowledge.values()].filter((entry) => entry.kind === 'suit')
    const suitBlock = suits.length
      ? `\nHồ sơ chất xuất hiện nhiều trong trải bài:\n${suits
          .map((entry) => `- ${entry.title}:\n${indent(entry.body_vi, 4)}`)
          .join('\n')}\n`
      : ''
    const knowledgeNote = knowledge.size
      ? `\nPhần "Tri thức" là nền để hiểu lá cho sâu, không phải văn để chép. Chọn đúng ý hợp với
vị trí và câu hỏi, bỏ phần không liên quan, viết lại bằng lời của mình.
`
      : ''
    const range = PromptBuilder.readingLength(cards.length, playing)
    const kind = playing ? 'bài tây' : 'tarot'
    const cardDetail = playing
      ? 'Mỗi lá chỉ cần 2-3 câu và không nhắc chiều xuôi/ngược.'
      : 'Mỗi lá cần 3-5 câu; chỉ nói chiều xuôi/ngược khi nó thật sự làm đổi trọng tâm.'

    const signals = spreadSignals(cards)
    // Đếm sẵn ở đây thì lượt nào cũng có và luôn khớp bài thật; để model tự nhìn
    // ra cấu trúc thì lúc thấy lúc không.
    const structure = signals.length
      ? `\nTín hiệu cấu trúc của cả trải bài (đã tính từ chính các lá trên):
${signals.map((item) => `- ${item}`).join('\n')}

Dệt những tín hiệu này vào phần Bức tranh chung và phần chốt, bằng lời của mình.
Không liệt kê lại chúng như thống kê, không nói "trải bài có bao nhiêu phần trăm".
Tín hiệu nào không giúp trả lời câu hỏi thì bỏ qua, đừng cố nhét cho đủ.
`
      : ''

    return `Người hỏi đã tự chọn ${cards.length} lá ${kind} cho câu hỏi: ${question}

${lines}
${suitBlock}${knowledgeNote}${structure}
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
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return text
    .split('\n')
    .map((line) => (line ? pad + line : line))
    .join('\n')
}
