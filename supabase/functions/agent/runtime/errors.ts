/** Lỗi có mã HTTP để lớp routing trả về thẳng, không phải đoán. */
export class AgentError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'AgentError'
  }
}

/**
 * Câu được phép hiện cho người dùng. Chỉ AgentError mang lời đã soạn sẵn; mọi lỗi
 * khác (DB, mạng, bug) có thể chứa tên bảng, cột, chi tiết hạ tầng — ghi log ở
 * server, còn người dùng chỉ nhận một câu chung.
 */
export function publicMessage(exception: unknown, fallback = 'Không thể đọc bài lúc này. Thử lại sau.'): string {
  if (exception instanceof AgentError) return exception.message
  console.error('[agent]', exception)
  return fallback
}
