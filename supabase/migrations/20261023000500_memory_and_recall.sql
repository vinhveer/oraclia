-- Trí nhớ có cấu trúc và nhớ lại các lượt xem cũ.
--
-- Trước đây: 40 điều nhớ mới nhất đổ hết vào mọi lượt, không xếp theo liên quan,
-- điều mâu thuẫn chồng lên nhau, điều thứ 41 lặng lẽ biến mất; và agent không
-- có cách nào biết tháng trước người này đã rút gì cho cùng chuyện.

-- ---------------------------------------------------------------------------
-- Hư từ tiếng Việt (đã bỏ dấu). Config 'simple' không lọc stopword, nên khi OR
-- các từ của một câu hỏi tự nhiên, "toi", "co", "khong"… khớp với mọi thứ và
-- làm nhiễu xếp hạng.
-- ---------------------------------------------------------------------------
create table public.text_stopwords (word text primary key);

-- Cố ý KHÔNG có: lam/viec (làm việc), moi (mời/mới), ba (Ba Kiếm, bà), hai,
-- tu/sau (hào tư, hào sáu) — bỏ dấu rồi chúng trùng với từ mang nghĩa.
insert into public.text_stopwords (word)
select unnest(string_to_array(
  'toi tui minh ban anh chi em ong co cau ho nguoi ta chung chang nay kia do day ' ||
  'la thi ma va voi cua cho de nhung cac mot nhieu it rat qua duoc bi da dang ' ||
  'se van con cung chi khi neu vi nen tai ra vao len xuong tren duoi trong ngoai ' ||
  'gi nao sao the nhu bao gio dau khong chua roi a oi nhe nha ha hay hoac ' ||
  'thoi ay vay nua lai den nhat hon cai chiec su ve theo truoc ' ||
  'phai can muon biet xem hoi giup',
  ' '))
on conflict do nothing;

grant select on public.text_stopwords to authenticated, service_role;

/** Các từ có nghĩa của một câu hỏi tự nhiên: bỏ dấu, bỏ hư từ, bỏ từ một ký tự. */
create or replace function public.loose_terms(value text)
returns text[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(word), '{}')
  from unnest(tsvector_to_array(to_tsvector('simple'::regconfig, public.f_unaccent(coalesce(value, ''))))) word
  where length(word) > 1
    and word not in (select s.word from public.text_stopwords s)
$$;

/** OR các từ có nghĩa thành tsquery; không còn từ nào thì null. */
create or replace function public.loose_tsquery(value text)
returns tsquery
language sql
stable
set search_path = ''
as $$
  select case when cardinality(terms) = 0 then null
              else to_tsquery('simple'::regconfig, array_to_string(
                array(select quote_literal(term) from unnest(terms) term), ' | ')) end
  from (select public.loose_terms(value) as terms) t
$$;

/**
 * Số từ khác nhau của truy vấn có mặt trong văn bản. Xếp theo đây trước, tần
 * suất sau: ts_rank_cd đơn thuần để một mục nhắc "việc" mười lần thắng mục khớp
 * đủ "tái cơ cấu", "mất việc", "đột ngột", "công ty".
 */
create or replace function public.term_coverage(document tsvector, terms text[])
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select count(*)::integer from unnest(tsvector_to_array(document)) word where word = any (terms)
$$;

-- match_knowledge dùng cùng bộ lọc hư từ.
create or replace function public.match_knowledge(
  query_text      text,
  query_embedding extensions.vector(384) default null,
  kinds           text[] default null,
  include_drafts  boolean default false,
  match_count     integer default 6
)
returns table (id text, kind text, ref jsonb, title text, body_vi text, score double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  with candidates as (
    select e.*
    from public.knowledge_entries e
    where (kinds is null or e.kind = any (kinds))
      and (e.review_status = 'approved' or (include_drafts and e.review_status = 'draft'))
  ),
  terms as (select public.loose_tsquery(query_text) as q, public.loose_terms(query_text) as words),
  by_text as (
    select c.id, row_number() over (
      order by public.term_coverage(c.fts, t.words) desc, ts_rank_cd(c.fts, t.q, 1) desc
    ) as rank
    from candidates c, terms t
    where t.q is not null and c.fts @@ t.q
    order by rank
    limit 30
  ),
  by_vector as (
    select c.id, row_number() over (
      order by c.embedding operator(extensions.<=>) query_embedding
    ) as rank
    from candidates c
    where query_embedding is not null and c.embedding is not null
    order by rank
    limit 30
  ),
  by_name as (
    select c.id, row_number() over (
      order by public.word_similarity(public.f_unaccent(c.title), public.f_unaccent(query_text)) desc
    ) as rank
    from candidates c
    where coalesce(query_text, '') <> ''
      and public.word_similarity(public.f_unaccent(c.title), public.f_unaccent(query_text)) > 0.5
    order by rank
    limit 10
  ),
  fused as (
    select ranked.id, sum(1.0 / (60 + ranked.rank)) as score
    from (
      select * from by_text
      union all select * from by_vector
      union all select * from by_name
    ) ranked
    group by ranked.id
  )
  select e.id, e.kind, e.ref, e.title, e.body_vi, f.score
  from fused f
  join public.knowledge_entries e on e.id = f.id
  order by f.score desc
  limit greatest(1, least(match_count, 20))
$$;

-- ---------------------------------------------------------------------------
-- memories: loại, độ quan trọng, gist tiếng Anh + vector, lần dùng gần nhất.
-- ---------------------------------------------------------------------------
alter table public.memories
  add column kind text not null default 'profile'
    check (kind in ('profile', 'preference', 'life_event', 'ongoing')),
  add column importance smallint not null default 2 check (importance between 1 and 3),
  add column gist_en text not null default '',
  add column embedding extensions.vector(384),
  add column last_used_at timestamptz,
  add column updated_at timestamptz not null default now(),
  add column fts tsvector generated always as
    (to_tsvector('simple'::regconfig, public.f_unaccent(content))) stored;

create index memories_fts_idx on public.memories using gin (fts);
create index memories_embedding_idx on public.memories using hnsw (embedding extensions.vector_cosine_ops);

/**
 * Trí nhớ cho một câu hỏi: những điều luôn cần (hồ sơ, quan trọng nhất), cộng
 * những điều liên quan tới câu hỏi, cộng vài điều gần đây. RLS lọc theo người gọi.
 */
create or replace function public.recall_memories(
  query_text      text,
  query_embedding extensions.vector(384) default null,
  match_count     integer default 16
)
returns table (id uuid, kind text, importance smallint, content text, reason text)
language sql
stable
security invoker
set search_path = ''
as $$
  with pinned as (
    select m.id, 1 as rank, 'pinned' as reason
    from public.memories m
    where m.importance = 3 or m.kind = 'profile'
    order by m.importance desc, m.updated_at desc
    limit 10
  ),
  by_text as (
    select m.id, row_number() over (
      order by public.term_coverage(m.fts, t.words) desc, ts_rank_cd(m.fts, t.q, 1) desc
    ) as rank, 'text' as reason
    from public.memories m,
      (select public.loose_tsquery(query_text) as q, public.loose_terms(query_text) as words) t
    where t.q is not null and m.fts @@ t.q
    order by rank
    limit 6
  ),
  by_vector as (
    select m.id, row_number() over (order by m.embedding operator(extensions.<=>) query_embedding) as rank,
           'vector' as reason
    from public.memories m
    where query_embedding is not null and m.embedding is not null
    order by rank
    limit 6
  ),
  recent as (
    select m.id, row_number() over (order by m.updated_at desc) as rank, 'recent' as reason
    from public.memories m
    order by m.updated_at desc
    limit 4
  ),
  fused as (
    select picked.id, sum(1.0 / (60 + picked.rank)) as score, min(picked.reason) as reason
    from (
      select * from pinned union all select * from by_text
      union all select * from by_vector union all select * from recent
    ) picked
    group by picked.id
  )
  select m.id, m.kind, m.importance, m.content, f.reason
  from fused f
  join public.memories m on m.id = f.id
  order by f.score desc
  limit greatest(1, least(match_count, 30))
$$;

grant execute on function public.recall_memories(text, extensions.vector, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- reading_records: mỗi lượt đọc đã xong một hàng, để nhớ lại xuyên cuộc.
-- ---------------------------------------------------------------------------
create table public.reading_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  run_id          uuid references public.agent_runs (id) on delete set null,
  message_id      uuid references public.messages (id) on delete cascade,
  question        text not null,
  kind            text not null check (kind in ('tarot', 'playing', 'iching')),
  -- Dòng ghi lá / quẻ đã ra, cùng dạng với lịch sử (history.ts readingRecord).
  record          text not null,
  -- 2-3 câu chốt của bài đọc.
  synthesis       text not null default '',
  gist_en         text not null default '',
  embedding       extensions.vector(384),
  fts             tsvector generated always as
                    (to_tsvector('simple'::regconfig, public.f_unaccent(question || ' ' || record || ' ' || synthesis))) stored,
  created_at      timestamptz not null default now()
);

create index reading_records_user_idx on public.reading_records (user_id, created_at desc);
create index reading_records_fts_idx on public.reading_records using gin (fts);
create index reading_records_embedding_idx
  on public.reading_records using hnsw (embedding extensions.vector_cosine_ops);

alter table public.reading_records enable row level security;

create policy "own reading records" on public.reading_records
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.reading_records to authenticated, service_role;

create or replace function public.match_readings(
  query_text           text,
  query_embedding      extensions.vector(384) default null,
  exclude_conversation uuid default null,
  match_count          integer default 3
)
returns table (
  id uuid, conversation_id uuid, question text, kind text, record text, synthesis text,
  created_at timestamptz, score double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  with candidates as (
    select r.* from public.reading_records r
    where exclude_conversation is null or r.conversation_id <> exclude_conversation
  ),
  by_text as (
    select c.id, row_number() over (
      order by public.term_coverage(c.fts, t.words) desc, ts_rank_cd(c.fts, t.q, 1) desc
    ) as rank
    from candidates c,
      (select public.loose_tsquery(query_text) as q, public.loose_terms(query_text) as words) t
    where t.q is not null and c.fts @@ t.q
    order by rank
    limit 20
  ),
  by_vector as (
    select c.id, row_number() over (order by c.embedding operator(extensions.<=>) query_embedding) as rank
    from candidates c
    where query_embedding is not null and c.embedding is not null
    order by rank
    limit 20
  ),
  fused as (
    select ranked.id, sum(1.0 / (60 + ranked.rank)) as score
    from (select * from by_text union all select * from by_vector) ranked
    group by ranked.id
  )
  select c.id, c.conversation_id, c.question, c.kind, c.record, c.synthesis, c.created_at, f.score
  from fused f
  join candidates c on c.id = f.id
  order by f.score desc
  limit greatest(1, least(match_count, 10))
$$;

grant execute on function public.match_readings(text, extensions.vector, uuid, integer) to authenticated;

/** Điều nhớ gần nghĩa nhất với một vector, để không ghi trùng cùng một điều bằng lời khác. */
create or replace function public.similar_memory(query_embedding extensions.vector(384))
returns table (id uuid, content text, similarity double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  select m.id, m.content, 1 - (m.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.memories m
  where m.embedding is not null
  order by m.embedding operator(extensions.<=>) query_embedding
  limit 1
$$;

grant execute on function public.similar_memory(extensions.vector) to authenticated;
