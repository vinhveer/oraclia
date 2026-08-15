-- Tarot — core schema.
-- Every table that holds user data is owned by auth.uid() and locked behind RLS,
-- so the agent runtime can use the anon key on behalf of the caller and still be
-- unable to read another person's readings.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: role lives outside auth.users so RLS policies can join against it
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- cards: the 78-card catalogue, read-only reference data
-- ---------------------------------------------------------------------------
create table public.cards (
  id        text primary key,
  name      text not null,
  name_vi   text not null,
  arcana    text not null,
  suit      text not null default 'major',
  image     text not null default '',
  keywords  jsonb not null default '[]'::jsonb,
  upright   text not null,
  reversed  text not null,
  sort_order integer not null default 0
);

create index cards_suit_idx on public.cards (suit);

-- ---------------------------------------------------------------------------
-- prompts: versioned system prompts, so tuning the reader never needs a deploy
-- ---------------------------------------------------------------------------
create table public.prompts (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null,
  version    text not null,
  body       text not null,
  is_active  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (slug, version)
);

create unique index prompts_active_slug_idx
  on public.prompts (slug) where is_active;

-- ---------------------------------------------------------------------------
-- conversations + messages
-- ---------------------------------------------------------------------------
create table public.conversations (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  title              text not null default 'Cuộc trò chuyện mới',
  -- Long-horizon memory: older turns are compacted here instead of being resent.
  context_summary    text not null default '',
  compacted_until    timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index conversations_user_idx on public.conversations (user_id, updated_at desc);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null default '',
  -- Cards revealed for this turn, denormalised so history renders without joins.
  cards           jsonb,
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- agent_runs: one row per agent invocation, survives the suspend/resume gap
-- while the user is picking cards
-- ---------------------------------------------------------------------------
create table public.agent_runs (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  status          text not null default 'running'
                    check (status in ('running', 'awaiting_input', 'completed', 'failed')),
  model           text not null default '',
  prompt_version  text not null default '',
  question        text not null default '',
  -- Model-facing transcript for this run, replayed verbatim when resuming.
  state           jsonb not null default '[]'::jsonb,
  step_count      integer not null default 0,
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index agent_runs_conversation_idx on public.agent_runs (conversation_id, created_at desc);
create index agent_runs_rate_idx on public.agent_runs (user_id, created_at desc);

create table public.tool_calls (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.agent_runs (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  call_id     text not null,
  name        text not null,
  arguments   jsonb not null default '{}'::jsonb,
  result      jsonb,
  status      text not null default 'running'
                check (status in ('running', 'awaiting_input', 'completed', 'failed')),
  duration_ms integer,
  created_at  timestamptz not null default now()
);

create index tool_calls_run_idx on public.tool_calls (run_id, created_at);

-- ---------------------------------------------------------------------------
-- readings: one draw. Created face-down at plan time, revealed after the user
-- picks. `shuffled` never leaves the server until the corresponding index is
-- chosen, which is what keeps the pick honest.
-- ---------------------------------------------------------------------------
create table public.readings (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  run_id          uuid references public.agent_runs (id) on delete set null,
  user_id         uuid not null references auth.users (id) on delete cascade,
  question        text not null,
  positions       jsonb not null default '[]'::jsonb,
  reason          text not null default '',
  shuffled        jsonb not null default '[]'::jsonb,
  revealed        jsonb,
  status          text not null default 'pending'
                    check (status in ('pending', 'revealed', 'expired')),
  created_at      timestamptz not null default now()
);

create index readings_conversation_idx on public.readings (conversation_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.cards         enable row level security;
alter table public.prompts       enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.agent_runs    enable row level security;
alter table public.tool_calls    enable row level security;
alter table public.readings      enable row level security;

create policy "profiles are self-readable" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles are self-writable" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and role = 'user');

create policy "cards are public reference data" on public.cards
  for select to authenticated using (true);
create policy "admins curate cards" on public.cards
  for all using (public.is_admin()) with check (public.is_admin());

create policy "active prompts are readable" on public.prompts
  for select to authenticated using (true);
create policy "admins curate prompts" on public.prompts
  for all using (public.is_admin()) with check (public.is_admin());

create policy "own conversations" on public.conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own messages" on public.messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own runs" on public.agent_runs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own tool calls" on public.tool_calls
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own readings" on public.readings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The whole point of picking face-down cards is that nobody can see the order,
-- so `readings.shuffled` is withheld with column privileges rather than RLS.
-- See 20260815000400_lock_deck.sql: a column revoke alone is not enough, the
-- table-wide grant has to come off first.

-- ---------------------------------------------------------------------------
-- Realtime: the chat UI subscribes to its own conversation
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.agent_runs;
alter publication supabase_realtime add table public.tool_calls;

-- ---------------------------------------------------------------------------
-- Housekeeping
-- ---------------------------------------------------------------------------
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set updated_at = now(),
         title = case
           when title = 'Cuộc trò chuyện mới' and new.role = 'user'
             then left(new.content, 80)
           else title
         end
   where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();
