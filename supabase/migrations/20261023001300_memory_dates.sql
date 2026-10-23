-- Trả thêm updated_at để context ghi được mốc thời gian của từng điều nhớ. Thiếu
-- mốc, hai điều mâu thuẫn ("đang thất nghiệp" / "đã nhận việc mới") đứng cạnh
-- nhau mà model không biết điều nào mới hơn. Đổi kiểu trả về nên phải drop rồi tạo.
drop function public.recall_memories(text, extensions.vector, integer);

create or replace function public.recall_memories(
  query_text      text,
  query_embedding extensions.vector(384) default null,
  match_count     integer default 16
)
returns table (id uuid, kind text, importance smallint, content text, reason text, updated_at timestamptz)
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
  select m.id, m.kind, m.importance, m.content, f.reason, m.updated_at
  from fused f
  join public.memories m on m.id = f.id
  order by f.score desc
  limit greatest(1, least(match_count, 30))
$$;

grant execute on function public.recall_memories(text, extensions.vector, integer) to authenticated;
