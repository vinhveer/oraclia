-- "Xoá toàn bộ ký ức": quên mọi thứ Oraclia tự nhớ về một người, trong một lần.
--
-- Trình duyệt không có quyền ghi reading_records hay sửa bản tóm tắt của cuộc trò
-- chuyện (xem security_hardening), nên việc này đi qua một hàm SECURITY DEFINER
-- chỉ đụng tới hàng của chính người gọi (auth.uid()).
--
-- Xoá: điều Oraclia tự ghi nhớ, trí nhớ về các lượt xem cũ, bản tóm tắt của mọi
-- cuộc trò chuyện. Giữ: phần "Về bạn" người dùng tự viết, và các cuộc trò chuyện.
create or replace function public.forget_everything()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  memories integer;
  readings integer;
  summaries integer;
begin
  if me is null then
    raise exception 'Cần đăng nhập.' using errcode = '42501';
  end if;

  delete from public.memories where user_id = me;
  get diagnostics memories = row_count;

  delete from public.reading_records where user_id = me;
  get diagnostics readings = row_count;

  update public.conversations
     set context_summary = '', compacted_until = null, reflected_at = null
   where user_id = me
     and (context_summary <> '' or compacted_until is not null or reflected_at is not null);
  get diagnostics summaries = row_count;

  return jsonb_build_object('memories', memories, 'readings', readings, 'summaries', summaries);
end;
$$;

revoke execute on function public.forget_everything() from public, anon;
grant execute on function public.forget_everything() to authenticated;
