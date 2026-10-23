-- Lượt nào do model dự phòng trả lời, vì sao. Cột `model` ghi model thật sự trả
-- lời; lý do khác null nghĩa là provider chính đã hỏng ở lượt đó.
alter table public.model_calls add column fallback_reason text;
