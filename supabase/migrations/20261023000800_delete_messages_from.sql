-- Hỏi lại / sửa câu hỏi cắt lịch sử từ một tin nhắn trở đi. Trước đây client so
-- `created_at` của chính nó với giờ server để lọc, nên lệch đồng hồ là cắt sai.
-- Ở đây chỉ so giờ server với giờ server, theo id tin nhắn. RLS vẫn áp: người
-- gọi chỉ xoá được tin của mình.
create or replace function public.delete_messages_from(message_id uuid)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with anchor as (
    select m.conversation_id, m.created_at from public.messages m where m.id = message_id
  ),
  removed as (
    delete from public.messages m
    using anchor a
    where m.conversation_id = a.conversation_id and m.created_at >= a.created_at
    returning 1
  )
  select count(*)::integer from removed
$$;

grant execute on function public.delete_messages_from(uuid) to authenticated;
