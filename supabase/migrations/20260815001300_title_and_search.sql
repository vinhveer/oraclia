-- Tiêu đề giờ do runtime sinh bằng model (xem runtime/titler.ts), nên trigger chỉ
-- còn lo mốc thời gian. Nếu để nguyên, trigger sẽ đặt tên bằng 80 ký tự đầu của
-- câu hỏi ngay khi tin nhắn được lưu, và Titler thấy tiêu đề "đã có" rồi bỏ qua.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

-- Tìm kiếm theo nội dung tin nhắn: ilike trên cột text cần trigram mới không
-- phải quét cả bảng.
create extension if not exists pg_trgm;

create index messages_content_search_idx
  on public.messages using gin (content gin_trgm_ops);

create index conversations_title_search_idx
  on public.conversations using gin (title gin_trgm_ops);
