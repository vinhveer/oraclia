-- Bộ nhớ dài hạn cấp tài khoản, dùng cho hai mục trong sidebar:
--   about_you      -> "Những gì tôi biết được về bạn"
--   response_style -> "Bạn muốn tôi trả lời như thế nào?"
-- Prompt builder nạp cả hai vào system prompt của mọi run, nên nó áp cho toàn
-- bộ cuộc trò chuyện chứ không riêng cuộc nào.
create table public.user_settings (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  about_you      text not null default '',
  response_style text not null default '',
  updated_at     timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "own settings" on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Quẻ Kinh Dịch của lượt gieo, để lịch sử vẽ lại được mà không cần join.
alter table public.messages add column hexagram jsonb;

-- Một lượt gieo quẻ: `tosses` là kết quả 6 lần tung ba đồng xu (6..9).
create table public.castings (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  run_id          uuid references public.agent_runs (id) on delete set null,
  user_id         uuid not null references auth.users (id) on delete cascade,
  question        text not null default '',
  tosses          jsonb not null default '[]'::jsonb,
  primary_number  integer not null,
  changed_number  integer,
  moving_lines    jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

create index castings_conversation_idx on public.castings (conversation_id, created_at desc);

alter table public.castings enable row level security;

create policy "own castings" on public.castings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
