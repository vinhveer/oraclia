-- The column-level revoke in the init migration was a no-op: Supabase grants
-- table-wide SELECT/INSERT/UPDATE to `authenticated`, and a table-level grant
-- always outranks a column-level revoke. So the face-down deck was readable by
-- any logged-in owner of the row — exactly what the pick must not allow.
--
-- The fix is to drop the table-wide grants and hand back every column except
-- `shuffled`, which then belongs to the service role alone.

revoke select, insert, update on public.readings from authenticated, anon;

grant select (
  id, conversation_id, run_id, user_id, question,
  positions, reason, revealed, status, created_at
) on public.readings to authenticated;

grant insert (
  id, conversation_id, run_id, user_id, question,
  positions, reason, status
) on public.readings to authenticated;

-- Revealing a draw only ever writes these two.
grant update (status, revealed) on public.readings to authenticated;
