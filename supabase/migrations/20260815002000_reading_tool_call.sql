-- Lượt rút bài được nối lại bằng chính id của tool call đã mở nó, thay vì dò
-- theo tên công cụ. Dò theo tên nghĩa là mỗi công cụ ngắt mới lại phải nhớ sửa
-- chỗ nối — và bói bài tây đã vấp đúng chỗ đó.
alter table public.readings add column tool_call_id text;

-- Cột mới thì quyền phải cấp lại; hàm này suy quyền từ danh sách cột.
select public.sync_reading_grants();
