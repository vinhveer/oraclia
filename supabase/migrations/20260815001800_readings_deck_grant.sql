-- `readings` bị thu hồi quyền cấp bảng rồi cấp lại từng cột (xem 20260815000400)
-- để giấu cột `shuffled`. Hệ quả: mỗi cột thêm sau đó đều phải được cấp quyền
-- riêng, nếu không thì insert kèm cột mới bị từ chối — và lỗi chỉ lộ ra khi
-- chạy thật. Cột `deck` của migration trước rơi đúng vào cái bẫy đó.
grant select (deck), insert (deck) on public.readings to authenticated;
