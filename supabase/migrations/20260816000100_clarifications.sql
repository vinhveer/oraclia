-- Một lượt hỏi lại người dùng để làm rõ vấn đề trước khi bói. Cùng khuôn với
-- `readings`: agent tạo hàng ở trạng thái chờ, run đỗ lại, người dùng trả lời
-- rồi run chạy tiếp đúng mạch nghĩ đang dở.
create table public.clarifications (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  run_id          uuid references public.agent_runs (id) on delete set null,
  user_id         uuid not null references auth.users (id) on delete cascade,
  question        text not null,
  options         jsonb not null default '[]'::jsonb,
  allow_free_text boolean not null default true,
  answer          text,
  status          text not null default 'pending'
                    check (status in ('pending', 'answered', 'skipped')),
  created_at      timestamptz not null default now()
);

create index clarifications_run_idx on public.clarifications (run_id, created_at desc);

alter table public.clarifications enable row level security;

create policy "own clarifications" on public.clarifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
