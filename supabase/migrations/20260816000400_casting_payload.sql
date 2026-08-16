-- Khi có lượt hỏi làm rõ xen vào giữa lúc gieo quẻ và lúc luận, run được nối
-- lại bằng một request khác — lúc đó quẻ vừa gieo chỉ còn nằm rời rạc trong các
-- cột số. Lưu nguyên đối tượng để dựng lại được mà không phải tra ngược bảng quẻ.
alter table public.castings add column payload jsonb;
