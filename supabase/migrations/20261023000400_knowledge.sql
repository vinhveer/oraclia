-- Kho tri thức cho agent: nghĩa sâu của từng lá theo chiều, hồ sơ chất, quẻ, hào.
-- Trước đây model chỉ có một câu cho mỗi lá và nguyên văn Hán cổ cho mỗi hào,
-- rồi bị cấm bịa — tức là bắt nó đọc sâu bằng dữ liệu nông.
--
-- Nguồn gốc nằm trong repo (supabase/knowledge/*.json) để duyệt bằng diff;
-- scripts/kb/sync.mjs đẩy vào bảng này. Chỉ mục `approved` được dùng thật.
--
-- Tìm kiếm là hybrid: full-text bỏ dấu + trigram trên tiếng Việt, và vector
-- gte-small trên `gist_en` tiếng Anh. Đo thực tế gte-small không phân biệt được
-- nghĩa câu tiếng Việt (mọi cặp ~0.85-0.91 cosine) nhưng dùng được với tiếng Anh,
-- nên vector chỉ chạy qua "cầu" tiếng Anh: mục tri thức có gist_en, model viết
-- truy vấn tiếng Anh. Ba bảng xếp hạng gộp bằng Reciprocal Rank Fusion.

create extension if not exists vector with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent() là STABLE nên không dùng được trong cột sinh hay index; bọc lại
-- thành IMMUTABLE với từ điển cố định là cách chuẩn.
create or replace function public.f_unaccent(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value)
$$;

create or replace function public.kb_document(title text, keywords text[], body text)
returns tsvector
language sql
immutable
parallel safe
set search_path = ''
as $$
  select to_tsvector(
    'simple'::regconfig,
    public.f_unaccent(coalesce(title, '') || ' ' || coalesce(array_to_string(keywords, ' '), '') || ' ' || coalesce(body, ''))
  )
$$;

create table public.knowledge_entries (
  -- Khoá đọc được và ổn định: card:major-15:reversed, hexagram:16, line:16:3,
  -- suit:swords, playing:7C… để tra thẳng theo lá đã rút mà không cần tìm.
  id              text primary key,
  kind            text not null check (kind in (
                    'card', 'playing', 'suit', 'court', 'number',
                    'hexagram', 'hexagram_line', 'combo', 'concept')),
  ref             jsonb not null default '{}'::jsonb,
  title           text not null,
  body_vi         text not null,
  -- Tóm tắt tiếng Anh ~50 từ, chỉ để embed (xem ghi chú đầu file).
  gist_en         text not null default '',
  keywords        text[] not null default '{}',
  source          text not null default '',
  review_status   text not null default 'draft'
                    check (review_status in ('draft', 'approved', 'rejected')),
  content_hash    text not null default '',
  embedding       extensions.vector(384),
  embedding_model text,
  fts             tsvector generated always as (public.kb_document(title, keywords, body_vi)) stored,
  updated_at      timestamptz not null default now()
);

create index knowledge_entries_kind_idx on public.knowledge_entries (kind, review_status);
create index knowledge_entries_fts_idx on public.knowledge_entries using gin (fts);
create index knowledge_entries_title_trgm_idx
  on public.knowledge_entries using gin (public.f_unaccent(title) gin_trgm_ops);
create index knowledge_entries_embedding_idx
  on public.knowledge_entries using hnsw (embedding extensions.vector_cosine_ops);

alter table public.knowledge_entries enable row level security;

-- Tri thức tham khảo, không bí mật: ai đăng nhập cũng đọc được, kể cả bản nháp
-- (agent tự lọc `approved`; dev bật KB_INCLUDE_DRAFTS để thử bản nháp).
create policy "knowledge is readable" on public.knowledge_entries
  for select to authenticated using (review_status <> 'rejected');
create policy "admins curate knowledge" on public.knowledge_entries
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.knowledge_entries to authenticated;
grant select, insert, update, delete on public.knowledge_entries to service_role;

/**
 * Hybrid search. `query_text` tiếng Việt (có dấu hay không đều được) đi qua
 * full-text và trigram; `query_embedding` (từ truy vấn tiếng Anh) đi qua vector.
 * Thiếu vế nào thì vế đó đơn giản là không góp điểm.
 */
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
  -- Câu hỏi tự nhiên mà AND mọi từ thì gần như không khớp gì; OR các từ rồi để
  -- ts_rank_cd xếp mục khớp nhiều từ, gần nhau lên trước.
  terms as (
    select nullif(
      replace(plainto_tsquery('simple'::regconfig, public.f_unaccent(coalesce(query_text, '')))::text, '&', '|'),
      ''
    ) as q
  ),
  by_text as (
    select c.id, row_number() over (
      order by ts_rank_cd(c.fts, to_tsquery('simple'::regconfig, t.q)) desc
    ) as rank
    from candidates c, terms t
    where t.q is not null and c.fts @@ to_tsquery('simple'::regconfig, t.q)
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
  -- Tên lá gõ sai dấu, gõ thiếu ("ba kiem", "thap ngua") vẫn khớp nhờ trigram.
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

grant execute on function public.match_knowledge(text, extensions.vector, text[], boolean, integer)
  to authenticated, service_role;
