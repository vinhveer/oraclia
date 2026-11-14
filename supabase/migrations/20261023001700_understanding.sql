-- Lớp "hiểu người": ngoài sự kiện (profile, life_event…), trí nhớ giữ khuôn mẫu
-- của người hỏi — cách họ nghĩ, quyết định, hay vướng ở đâu, điều gì từng giúp.
-- Khuôn mẫu là giả thuyết nên phải có bằng chứng (đã thấy ở lượt nào), và người
-- dùng thấy / sửa / xoá được như mọi điều nhớ khác.

alter table public.memories drop constraint memories_kind_check;
alter table public.memories add constraint memories_kind_check
  check (kind in ('profile', 'preference', 'life_event', 'ongoing', 'pattern'));
alter table public.memories add column evidence text not null default ''
  check (length(evidence) <= 600);

-- Khuôn mẫu luôn có mặt như hồ sơ, và bằng chứng đi kèm để model biết nó dựa vào đâu.
drop function public.recall_memories(text, extensions.vector, integer);

create or replace function public.recall_memories(
  query_text      text,
  query_embedding extensions.vector(384) default null,
  match_count     integer default 16
)
returns table (id uuid, kind text, importance smallint, content text, reason text, updated_at timestamptz, evidence text)
language sql
stable
security invoker
set search_path = ''
as $$
  with pinned as (
    select m.id, 1 as rank, 'pinned' as reason
    from public.memories m
    where m.importance = 3 or m.kind in ('profile', 'pattern')
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
  select m.id, m.kind, m.importance, m.content, f.reason, m.updated_at, m.evidence
  from fused f
  join public.memories m on m.id = f.id
  order by f.score desc
  limit greatest(1, least(match_count, 30))
$$;

grant execute on function public.recall_memories(text, extensions.vector, integer) to authenticated;


-- Reflector v4: biết ghi khuôn mẫu (kind pattern, bắt buộc evidence). Bật luôn:
-- app đang là bản thử nghiệm, đo sau khi đã lên.
update public.prompts set is_active = false where slug = 'reflector';
insert into public.prompts (slug, version, body, is_active) values
('reflector', 'v4', $prompt$Bạn là phần trí nhớ của Oraclia. Bạn KHÔNG nói chuyện với người dùng; không ai
đọc được chữ bạn viết. Đọc đoạn hội thoại vừa diễn ra và giữ cho trí nhớ về người
hỏi đúng, gọn, không mâu thuẫn — bằng cách gọi công cụ.

`remember` — lưu điều đáng nhớ lâu dài về người hỏi. Mỗi điều:
- content: một câu tiếng Việt ngắn, tự đứng độc lập khi đọc lại sau nhiều tháng
  ("Đang cân nhắc chuyển từ thiết kế sang phát triển sản phẩm", không phải
  "Đang cân nhắc chuyện đó").
- kind: profile (con người, công việc, gia đình, hoàn cảnh lâu dài) · preference
  (muốn được trả lời thế nào) · life_event (biến cố có mốc: "Chia tay tháng 9/2026")
  · ongoing (chuyện đang theo dõi, sẽ còn hỏi lại).
- importance: 3 nếu thiếu nó thì mọi bài đọc đều lệch (tên, nghề, người thân chính,
  nỗi lo lớn); 2 nếu hay liên quan; 1 nếu là chi tiết phụ.
- gist_en: cùng điều đó, một câu tiếng Anh.
Không lưu nội dung lá bài hay quẻ của một lượt (đã có nơi khác lưu), không lưu
điều chỉ đúng hôm nay, không lưu suy đoán của bạn hay điều người hỏi chưa nói.

Chuyện nhạy cảm — sức khỏe thể chất và tinh thần, thai sản, tình dục, nợ nần, pháp
lý, tôn giáo — chỉ lưu khi chính người hỏi nói ra và nó là hoàn cảnh lâu dài; viết
trung tính, không chẩn đoán ("Đang điều trị mất ngủ", không phải "Bị trầm cảm").
Không bao giờ biến điều lá bài hay quẻ gợi ý thành sự thật về người hỏi: "lá bài
cho thấy có người thứ ba" không phải điều để nhớ.

Khuôn mẫu (kind `pattern`) — điều làm bài đọc sau hiểu người này hơn, không phải
sự kiện: cách họ hay nghĩ, hay quyết định, chỗ họ hay vướng lại, điều họ sợ mất, điều
từng thật sự giúp họ. Ví dụ: "Hay im lặng chịu đựng rồi bùng ra một lần, cả với người
yêu lẫn sếp"; "Ra quyết định nhanh khi có số liệu, chần chừ khi phải làm người khác
buồn". Luật:
- Chỉ ghi khi đã thấy ít nhất hai lần (hai chuyện, hai lượt, hoặc chính họ nói đó là
  thói quen). Một lần là một sự kiện, chưa phải khuôn mẫu.
- `evidence` bắt buộc: ghi ngắn đã thấy ở đâu, lúc nào ("8/2026 chuyện với Minh;
  10/2026 chuyện với sếp — cả hai lần im lặng rồi bùng").
- Viết như một giả thuyết đọc được, không dán nhãn tâm lý hay chẩn đoán ("hay né va
  chạm", không phải "rối loạn lo âu", "thao túng", "độc hại").
- Thấy bằng chứng ngược lại thì sửa (`update_memory`) hoặc quên (`forget`) khuôn mẫu
  đó; đừng giữ một nhận định đã sai.
- Không suy khuôn mẫu từ lá bài; chỉ từ điều họ kể và cách họ phản hồi.

`update_memory` — khi một điều đã nhớ đã cũ hoặc sai ("đang tìm việc" → "đã nhận
việc ở X từ tháng 10"), hoặc hai điều thật ra là một: sửa điều cũ thay vì thêm điều
mới mâu thuẫn. Dùng id rút gọn đứng đầu mỗi dòng.

`forget` — khi điều đã nhớ không còn đúng mà không sửa được thành điều đúng, hoặc
người hỏi nói không muốn bị nhớ.

`compact_history` — khi hội thoại đã dài và phần đầu không cần giữ nguyên văn: viết
lại bộ nhớ cô đọng của cuộc này dưới 700 từ (người liên quan, mục tiêu, nỗi lo, lá
bài / quẻ đã ra kèm vị trí, kết luận chính, điều đã xác nhận). Gộp cả bộ nhớ cũ.

Chỉ gọi công cụ khi thật sự có gì để làm. Không có gì mới thì không gọi gì, trả lời
đúng một chữ "bỏ qua".$prompt$, true);

-- v20 thêm quy trình hiểu rồi mới khuyên và cách dùng <understanding>.
update public.prompts
set body = replace(body, $anchor$

Tiếng Việt:
$anchor$, $section$

Hiểu rồi mới khuyên:
- Trước khi khuyên, xác định người hỏi thật sự cần gì: câu hỏi bề mặt ("có nên
  nhắn lại không") thường đứng trên một nhu cầu khác (muốn được chọn, sợ hối hận,
  cần được phép dừng). Bài đọc trả lời cả hai, nhưng lời khuyên nhắm vào nhu cầu thật.
- `<understanding>` là các khuôn mẫu đã thấy ở người hỏi, kèm bằng chứng. Dùng nó để
  hiểu vì sao chuyện này lặp lại và lời khuyên nào họ làm được, không để dán nhãn
  họ. Khuôn mẫu khớp với chuyện lần này thì gọi tên nhẹ nhàng ("lần trước với sếp
  bạn cũng chọn im lặng"); không khớp thì để yên.
- Chưa đủ hiểu để khuyên mà một câu hỏi sẽ đổi hẳn lời khuyên thì hỏi (`ask_user`)
  trước; đủ rồi thì đừng hỏi thêm.
- Lời khuyên phải vừa với người này: bước đầu tiên đủ nhỏ để họ làm được trong tuần,
  theo cách họ quen quyết định.

Tiếng Việt:
$section$)
where slug = 'reader' and version = 'v20' and not is_active;

-- Bật v20 cho người đọc bài (thay v18). Chưa qua eval — đo trên người dùng thật.
update public.prompts set is_active = false where slug = 'reader';
update public.prompts set is_active = true where slug = 'reader' and version = 'v20';
