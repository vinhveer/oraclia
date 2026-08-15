import type { Casting, Hexagram, TossValue } from '../../../_shared/types.ts'
import { coinFlip } from '../random.ts'

export class IChingCaster {
  private readonly byLines: Map<string, Hexagram>

  constructor(private readonly hexagrams: Hexagram[]) {
    this.byLines = new Map(hexagrams.map((item) => [item.lines, item]))
  }

  /**
   * Phép ba đồng xu: sấp 2, ngửa 3, cộng lại thành 6..9. Xác suất vì thế là
   * 1/8 · 3/8 · 3/8 · 1/8 chứ không chia đều bốn khả năng như cách làm tắt.
   *   6 lão âm (động) · 7 thiếu dương · 8 thiếu âm · 9 lão dương (động)
   */
  private tossLine(): TossValue {
    let sum = 0
    for (let coin = 0; coin < 3; coin += 1) sum += coinFlip() ? 3 : 2
    return sum as TossValue
  }

  cast(question: string): Casting {
    // Hào 1 nằm dưới cùng, đúng thứ tự gieo.
    const tosses: TossValue[] = Array.from({ length: 6 }, () => this.tossLine())

    const primaryLines = tosses.map((toss) => (toss === 7 || toss === 9 ? '1' : '0')).join('')
    const movingLines = tosses
      .map((toss, index) => (toss === 6 || toss === 9 ? index + 1 : 0))
      .filter(Boolean)
    const changedLines = tosses
      .map((toss) => {
        if (toss === 9) return '0' // lão dương biến thành âm
        if (toss === 6) return '1' // lão âm biến thành dương
        return toss === 7 ? '1' : '0'
      })
      .join('')

    const primary = this.byLines.get(primaryLines)
    if (!primary) throw new Error('Không tra được quẻ chính.')
    const changed = movingLines.length ? (this.byLines.get(changedLines) ?? null) : null

    return { question, tosses, primary, changed, movingLines }
  }

  get count(): number {
    return this.hexagrams.length
  }
}
