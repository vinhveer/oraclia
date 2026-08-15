-- Quyền theo cột trên `readings` là thứ duy nhất giấu được `shuffled` khỏi trình
-- duyệt, nhưng nó biến mỗi lần thêm cột thành một cái bẫy: cột mới không có
-- quyền, insert hỏng, và lỗi chỉ lộ khi chạy thật.
--
-- Thay vì nhớ cấp tay từng lần, quyền được suy ra từ chính danh sách cột: mọi
-- cột trừ `shuffled`. Thêm cột xong chỉ cần gọi lại hàm này.
create or replace function public.sync_reading_grants()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  readable text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into readable
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'readings'
     and column_name <> 'shuffled';

  execute format(
    'grant select (%s), insert (%s) on public.readings to authenticated',
    readable, readable
  );
  -- Lật bài chỉ ghi hai cột này; phần còn lại là bất biến sau khi tạo.
  execute 'grant update (status, revealed) on public.readings to authenticated';
end;
$$;

select public.sync_reading_grants();
