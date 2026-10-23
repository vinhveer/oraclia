-- Phản hồi của người đọc trên từng câu trả lời, nối được về run và phiên bản
-- prompt — để biết v19 có thật sự tốt hơn v18 trên người thật chứ không chỉ trên eval.

alter table public.messages
  add column run_id uuid references public.agent_runs (id) on delete set null;

create table public.message_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  rating     smallint not null check (rating in (-1, 1)),
  note       text not null default '' check (length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, message_id)
);

create index message_feedback_created_idx on public.message_feedback (created_at desc);

alter table public.message_feedback enable row level security;

create policy "own feedback" on public.message_feedback
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.message_feedback to authenticated, service_role;

-- Tổng hợp theo phiên bản prompt; security_invoker nên mỗi người chỉ thấy phần
-- của mình, service role (dashboard, script) thấy toàn bộ.
create view public.feedback_by_prompt with (security_invoker = true) as
select
  r.prompt_version,
  r.model,
  count(*) as ratings,
  count(*) filter (where f.rating = 1) as thumbs_up,
  count(*) filter (where f.rating = -1) as thumbs_down,
  round(avg(f.rating)::numeric, 3) as score
from public.message_feedback f
join public.messages m on m.id = f.message_id
join public.agent_runs r on r.id = m.run_id
group by r.prompt_version, r.model;
