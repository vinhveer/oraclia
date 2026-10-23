-- Siết quyền theo nguyên tắc tối thiểu. Trước đây `authenticated` có toàn quyền
-- ghi mọi bảng (RLS chỉ giới hạn ở "hàng của mình"), nên người dùng tự sửa được
-- transcript, bộ đếm bước, câu làm rõ của run mình — đủ để cho agent chạy vô hạn
-- bằng key LLM, lách mọi hạn mức. Giờ các bảng điều khiển run chỉ edge function
-- (service role) được ghi; trình duyệt chỉ giữ đúng thứ giao diện cần.

-- ---------------------------------------------------------------------------
-- 0. Bỏ quyền mặc định rộng của migration explicit_grants: bảng tạo về sau
--    không tự có quyền gì, phải cấp tường minh từng bảng.
-- ---------------------------------------------------------------------------
alter default privileges in schema public
  revoke select, insert, update, delete on tables from authenticated, anon;
alter default privileges in schema public
  revoke usage, select on sequences from authenticated, anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- 1. Người chưa đăng nhập không cần chạm vào bảng nào: đăng nhập / đăng ký đi
--    qua Auth API, không qua bảng public.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- ---------------------------------------------------------------------------
-- 2. Đặt lại quyền của `authenticated` từ đầu, rồi cấp đúng từng thứ.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from authenticated;

-- Dữ liệu tham khảo: chỉ đọc (quản trị nội dung đi qua service role).
grant select on public.cards, public.playing_cards, public.hexagrams, public.hexagram_lines,
  public.knowledge_entries to authenticated;

-- Danh sách cuộc trò chuyện, tin nhắn: đọc và xoá (xoá tin qua RPC
-- delete_messages_from). Tạo và sửa do agent làm.
grant select, delete on public.conversations, public.messages to authenticated;

-- Thứ người dùng tự quản trong trang cài đặt.
grant select, insert, update, delete on public.memories, public.user_settings,
  public.message_feedback to authenticated;
grant select, update (display_name) on public.profiles to authenticated;
grant select on public.profiles to authenticated;

-- Lượt đọc cũ: agent tìm qua RPC chạy bằng quyền người gọi, nên cần đọc.
grant select on public.reading_records to authenticated;

-- Hư từ: RPC tìm kiếm đọc khi chạy bằng quyền người gọi.
alter table public.text_stopwords enable row level security;
create policy "stopwords are readable" on public.text_stopwords
  for select to authenticated using (true);
grant select on public.text_stopwords to authenticated;

-- Không cấp gì cho: agent_runs, model_calls, tool_calls, clarifications,
-- readings, castings, prompts, và hai view thống kê. Edge function ghi / đọc
-- các bảng này bằng service role, luôn lọc theo user_id.

-- service_role (edge function, script) giữ toàn quyền như cũ.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- 3. Hàm: mặc định Postgres cho PUBLIC gọi mọi hàm, kể cả người chưa đăng nhập.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
-- Hàm SECURITY DEFINER chỉ dùng nội bộ (trigger, bảo trì quyền) — không ai gọi
-- qua API được nữa. is_admin vẫn cho authenticated vì RLS policy gọi nó.
revoke execute on function public.sync_reading_grants() from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.touch_conversation() from authenticated;

-- ---------------------------------------------------------------------------
-- 4. delete_messages_from: thêm kiểm tra chủ sở hữu ngay trong hàm, phòng khi
--    RLS của bảng messages bị nới lỏng về sau.
-- ---------------------------------------------------------------------------
create or replace function public.delete_messages_from(message_id uuid)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with anchor as (
    select m.conversation_id, m.created_at
    from public.messages m
    where m.id = message_id and m.user_id = auth.uid()
  ),
  removed as (
    delete from public.messages m
    using anchor a
    where m.conversation_id = a.conversation_id
      and m.created_at >= a.created_at
      and m.user_id = auth.uid()
    returning 1
  )
  select count(*)::integer from removed
$$;
