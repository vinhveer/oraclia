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
