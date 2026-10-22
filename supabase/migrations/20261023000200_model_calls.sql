-- Mỗi lượt gọi model một hàng: token, độ trễ, lý do dừng. Một run có nhiều lượt
-- và trải qua nhiều request (lật bài, trả lời làm rõ), nên ghi theo lượt thay vì
-- cộng dồn lên agent_runs — cộng dồn qua nhiều worker là chỗ dễ sai nhất.

create table public.model_calls (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null references public.agent_runs (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  step             integer not null,
  model            text not null default '',
  input_tokens     integer not null default 0,
  output_tokens    integer not null default 0,
  cached_tokens    integer not null default 0,
  reasoning_tokens integer not null default 0,
  ttft_ms          integer,
  latency_ms       integer not null,
  finish_reason    text,
  tool_names       text[] not null default '{}',
  created_at       timestamptz not null default now()
);

create index model_calls_run_idx on public.model_calls (run_id, step);
create index model_calls_created_idx on public.model_calls (created_at desc);

alter table public.model_calls enable row level security;

create policy "own model calls" on public.model_calls
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tổng hợp theo run để xem nhanh chi phí và độ trễ mà không phải tự cộng.
create view public.run_usage with (security_invoker = true) as
select
  r.id as run_id,
  r.prompt_version,
  r.status,
  r.created_at,
  count(c.id) as model_calls,
  coalesce(sum(c.input_tokens), 0) as input_tokens,
  coalesce(sum(c.output_tokens), 0) as output_tokens,
  coalesce(sum(c.cached_tokens), 0) as cached_tokens,
  coalesce(sum(c.reasoning_tokens), 0) as reasoning_tokens,
  coalesce(sum(c.latency_ms), 0) as latency_ms,
  min(c.ttft_ms) filter (where c.step = 1) as first_ttft_ms,
  bool_or(c.finish_reason = 'length') as truncated
from public.agent_runs r
left join public.model_calls c on c.run_id = r.id
group by r.id;
