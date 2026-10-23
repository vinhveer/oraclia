import type { Db } from '../../../_shared/db.ts'

/**
 * Repository chạy bằng client mang JWT của người gọi, nên RLS là thứ quyết định
 * thấy được hàng nào — code ở đây không tự lọc theo user_id. Dùng cho dữ liệu
 * mà trình duyệt cũng được phép ghi (trí nhớ, cài đặt).
 */
export abstract class Repository {
  constructor(protected readonly db: Db) {}
}

/**
 * Repository cho các bảng chỉ edge function được ghi: run, lượt rút, câu làm rõ,
 * tin nhắn… Trình duyệt bị thu hồi quyền ghi các bảng này, vì nếu ghi được thì
 * người dùng tự sửa transcript, đặt lại bộ đếm bước, dựng câu làm rõ giả — và
 * cho agent chạy vô hạn bằng tiền key LLM.
 *
 * Client ở đây là service role (bỏ qua RLS), nên quyền sở hữu được ép tại một
 * chỗ: mọi insert tự gắn `user_id`, mọi select / update / delete tự lọc theo nó.
 * Đừng gọi `this.service` trực tiếp.
 */
export abstract class OwnedRepository {
  constructor(
    private readonly service: Db,
    protected readonly userId: string,
  ) {}

  // Generic theo chuỗi cột để supabase-js vẫn suy ra được kiểu của hàng trả về.
  protected select<Columns extends string>(
    table: string,
    columns: Columns,
    options?: { count?: 'exact'; head?: boolean },
  ) {
    return this.service.from(table).select(columns, options).eq('user_id', this.userId)
  }

  protected insert<T extends Record<string, unknown>>(table: string, row: T) {
    return this.service.from(table).insert({ ...row, user_id: this.userId })
  }

  protected update(table: string, values: Record<string, unknown>) {
    return this.service.from(table).update(values).eq('user_id', this.userId)
  }

  protected remove(table: string) {
    return this.service.from(table).delete().eq('user_id', this.userId)
  }
}
