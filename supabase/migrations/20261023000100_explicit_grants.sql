-- Các migration trước dựa vào việc Supabase tự cấp SELECT/INSERT/UPDATE/DELETE
-- trên mọi bảng public cho `authenticated` và `service_role`. Production được tạo
-- khi còn mặc định đó; stack local đời mới thì không, nên mọi truy vấn của agent
-- bị từ chối (permission denied) ở local và CI. Cấp tường minh ở đây để hai môi
-- trường giống nhau; với production đây là no-op. RLS vẫn quyết định thấy hàng nào.
--
-- `readings` bị bỏ qua có chủ đích: nó chỉ có quyền theo cột (xem lock_deck) để
-- `shuffled` không lọt ra trình duyệt. Cấp cả bảng ở đây là mở lại lỗ đó.

do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public' and tablename <> 'readings'
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end
$$;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Bảng tạo về sau cũng được cấp như vậy. Bảng nào cần khoá theo cột thì tự
-- revoke trong migration của nó, giống readings.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
