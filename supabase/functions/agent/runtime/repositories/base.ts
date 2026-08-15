import type { Db } from '../../../_shared/db.ts'

/**
 * Mọi repository đều chạy bằng client mang JWT của người gọi, nên RLS là thứ
 * quyết định thấy được hàng nào — code ở đây không tự lọc theo user_id.
 */
export abstract class Repository {
  constructor(protected readonly db: Db) {}
}
