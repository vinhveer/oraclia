import type { DrawnCard } from '../../../_shared/types.ts'

/**
 * Đọc cấu trúc của cả trải bài chứ không chỉ từng lá rời.
 *
 * Người đọc bài giỏi nhìn thấy những thứ mà việc giải lần lượt từng lá không bao
 * giờ chạm tới: bao nhiêu Ẩn Chính, chất nào áp đảo, có lá nào trùng số, có bao
 * nhiêu lá ngược, cung bậc đi lên hay đi xuống. Model tự nhìn ra được vài thứ
 * trong số đó, nhưng không đều tay — đếm ở đây thì lượt nào cũng có, và những
 * điều được nêu ra luôn đúng với bài thật.
 *
 * Chỉ nêu tín hiệu nào thật sự nổi lên. Liệt kê đủ mọi thống kê sẽ biến bài đọc
 * thành báo cáo, và làm loãng đúng cái đáng nói.
 */

const SUIT_THEMES: Record<string, string> = {
  wands: 'hành động, nhiệt hứng, việc đang làm',
  cups: 'tình cảm, quan hệ, điều trong lòng',
  swords: 'suy nghĩ, lời nói, sự thật phải đối diện',
  pentacles: 'tiền bạc, công việc, chuyện thực tế',
  cơ: 'tình cảm, chuyện nhà',
  rô: 'tiền bạc, tin tức, chuyện vật chất',
  chuồn: 'công việc, nỗ lực, bạn bè',
  bích: 'trở ngại, lo lắng, chuyện phải đối mặt',
}

/** Tên chất viết bằng tiếng Việt như trên lá; bài tây vốn đã là tiếng Việt. */
const SUIT_VI: Record<string, string> = {
  wands: 'Gậy',
  cups: 'Cốc',
  swords: 'Kiếm',
  pentacles: 'Tiền',
}

const suitName = (suit: string): string => SUIT_VI[suit] ?? suit

const RANK_THEMES: Record<number, string> = {
  1: 'khởi đầu, hạt mầm mới',
  2: 'cân nhắc giữa hai bên, quan hệ đôi',
  3: 'thành hình, có người thứ ba hoặc nhóm',
  4: 'ổn định, giữ chặt, chững lại',
  5: 'va chạm, mất mát, xáo trộn',
  6: 'hồi phục, cho nhận, chuyển tiếp',
  7: 'đánh giá lại, kiên nhẫn, tự vấn',
  8: 'chuyển động nhanh, kỹ năng, dứt khoát',
  9: 'gần đích nhưng còn nặng lòng',
  10: 'chốt lại một chu kỳ, gánh trọn hệ quả',
}

/** Tarot: Tiểu Đồng, Hiệp Sĩ, Nữ Hoàng, Vua. */
const TAROT_COURT: Record<number, string> = {
  11: 'tin mới, người trẻ, giai đoạn học việc',
  12: 'người chủ động lao tới, đà nhanh mà thiếu bền',
  13: 'người chăm sóc, cách xử lý bằng cảm nhận',
  14: 'người cầm quyền quyết định, cách xử lý bằng lý trí',
}

/** Bài tây chỉ có ba lá hình, và chúng không trùng thứ tự với tarot. */
const PLAYING_COURT: Record<number, string> = {
  11: 'người trẻ hoặc tin tức đang tới',
  12: 'người phụ nữ hoặc người đang chăm lo chuyện này',
  13: 'người có tiếng nói quyết định',
}

interface Reading {
  rank: number | null
  suit: string
  major: boolean
  court: boolean
  reversed: boolean
}

/** Trả về các dòng tín hiệu đã đủ mạnh để nói ra; rỗng nghĩa là bài phẳng. */
export function spreadSignals(cards: DrawnCard[]): string[] {
  if (cards.length < 2) return singleCardSignals(cards)
  const playing = cards.every((card) => card.deck === 'playing')
  const readings = cards.map(parse)
  const signals: string[] = []
  const total = readings.length

  const majors = readings.filter((item) => item.major).length
  if (majors && majors / total >= 0.5) {
    signals.push(
      `${majors}/${total} lá là Ẩn Chính — chuyện này lớn hơn một tình huống lẻ và phần lớn ` +
        `không nằm trong tay người hỏi xoay chuyển ngay.`,
    )
  } else if (!majors && total >= 3 && !playing) {
    signals.push(
      `Không có lá Ẩn Chính nào — đây là chuyện đời thường, xoay được bằng việc làm hằng ngày.`,
    )
  }

  const suits = tally(readings.filter((item) => !item.major).map((item) => item.suit))
  for (const [suit, count] of suits) {
    if (count >= 2 && count / total >= 0.5 && SUIT_THEMES[suit]) {
      signals.push(
        `${count}/${total} lá cùng chất ${suitName(suit)} — trọng tâm dồn vào ${SUIT_THEMES[suit]}.`,
      )
    }
  }
  const missing = playing
    ? []
    : ['wands', 'cups', 'swords', 'pentacles'].filter(
        (suit) => !suits.some(([name]) => name === suit),
      )
  if (total >= 4 && !playing && missing.length === 1) {
    signals.push(
      `Vắng hẳn chất ${suitName(missing[0])} (${SUIT_THEMES[missing[0]]}) — mặt đó đang bị bỏ trống ` +
        `trong cách người hỏi nhìn chuyện này.`,
    )
  }

  const ranks = tally(
    readings.filter((item) => item.rank !== null).map((item) => String(item.rank)),
  )
  for (const [rank, count] of ranks) {
    const value = Number(rank)
    const court = playing ? PLAYING_COURT : TAROT_COURT
    const theme = value <= 10 ? RANK_THEMES[value] : court[value]
    if (count >= 2 && theme) {
      signals.push(`${count} lá cùng bậc ${label(value, playing)} — nhấn vào ${theme}.`)
    }
  }

  const courts = readings.filter((item) => item.court).length
  if (courts >= 2) {
    signals.push(
      `${courts} lá hình người — chuyện này xoay quanh người khác nhiều hơn là quanh hoàn cảnh.`,
    )
  }

  const reversed = readings.filter((item) => item.reversed).length
  if (reversed && reversed / total >= 0.6) {
    signals.push(
      `${reversed}/${total} lá ngược — dòng chảy đang bị chặn hoặc quay vào bên trong, ` +
        `chưa phải lúc đẩy ra ngoài.`,
    )
  } else if (total >= 3 && !reversed && !playing) {
    signals.push(`Không lá nào ngược — mọi thứ đang chạy thẳng, không có gì bị kìm ngầm.`)
  }

  const arc = trend(readings)
  if (arc) signals.push(arc)

  return signals
}

function singleCardSignals(cards: DrawnCard[]): string[] {
  const card = cards[0]
  if (!card) return []
  const item = parse(card)
  if (item.major) {
    return ['Một lá Ẩn Chính đứng một mình — câu trả lời nằm ở tầng chủ đề lớn, không ở chi tiết.']
  }
  const theme = SUIT_THEMES[item.suit]
  return theme ? [`Lá đơn thuộc chất ${suitName(item.suit)} — câu trả lời nằm ở ${theme}.`] : []
}

/** Số của các lá số thường đi lên hay đi xuống theo thứ tự vị trí. */
function trend(readings: Reading[]): string | null {
  const numbered = readings.filter((item) => item.rank !== null && item.rank <= 10 && !item.major)
  if (numbered.length < 3) return null
  let up = 0
  let down = 0
  for (let index = 1; index < numbered.length; index += 1) {
    const delta = numbered[index].rank! - numbered[index - 1].rank!
    if (delta > 0) up += 1
    if (delta < 0) down += 1
  }
  if (up === numbered.length - 1) {
    return 'Số các lá tăng dần theo thứ tự vị trí — chuyện đang chín dần về phía kết.'
  }
  if (down === numbered.length - 1) {
    return 'Số các lá giảm dần theo thứ tự vị trí — chuyện đang lùi về lại điểm xuất phát.'
  }
  return null
}

function parse(card: DrawnCard): Reading {
  const major = card.arcana === 'major'
  const rank = major ? null : rankOf(card)
  return {
    rank,
    suit: card.suit,
    major,
    court: rank !== null && rank >= 11,
    reversed: card.orientation === 'reversed',
  }
}

/** Tarot mã theo `wands-11`, bài tây theo `JH`; cả hai đều rút ra số 1-14. */
function rankOf(card: DrawnCard): number | null {
  if (card.deck === 'playing') {
    const symbol = card.id.slice(0, -1)
    const map: Record<string, number> = { A: 1, '0': 10, J: 11, Q: 12, K: 13 }
    if (symbol in map) return map[symbol]
    const value = Number(symbol)
    return Number.isInteger(value) && value >= 2 && value <= 9 ? value : null
  }
  const value = Number(card.id.split('-')[1])
  return Number.isInteger(value) && value >= 1 && value <= 14 ? value : null
}

function label(rank: number, playing: boolean): string {
  if (rank === 1) return 'Át'
  if (rank <= 10) return String(rank)
  if (playing) return ['J', 'Q', 'K'][rank - 11] ?? String(rank)
  return ['Tiểu Đồng', 'Hiệp Sĩ', 'Nữ Hoàng', 'Vua'][rank - 11] ?? String(rank)
}

function tally(values: string[]): [string, number][] {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()].sort((left, right) => right[1] - left[1])
}
