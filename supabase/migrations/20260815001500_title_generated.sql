-- Tiêu đề tạm được đặt ngay bằng câu hỏi để sidebar có chữ đọc được, còn tiêu đề
-- do model viết thì tới sau. Cần cờ riêng để Titler biết đã đặt tên thật hay
-- chưa — so với chuỗi mặc định là không đủ khi tiêu đề tạm đã ghi đè lên nó.
alter table public.conversations
  add column title_generated boolean not null default false;
