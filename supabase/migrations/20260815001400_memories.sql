-- Bộ nhớ dài hạn do chính agent ghi, thay cho việc đếm đủ 12 tin nhắn rồi tóm tắt.
-- Mỗi hàng là một điều đáng nhớ về người hỏi, agent tự quyết định lưu gì.
create table public.memories (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  content         text not null,
  created_at      timestamptz not null default now()
);

create index memories_user_idx on public.memories (user_id, created_at desc);

alter table public.memories enable row level security;

create policy "own memories" on public.memories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Mốc lượt reflect gần nhất: chỉ chạy lại khi có tin nhắn mới hơn mốc này, để
-- người dùng ngồi im không làm agent nghiền đi nghiền lại cùng một đoạn.
alter table public.conversations add column reflected_at timestamptz;

insert into public.prompts (slug, version, body, is_active) values
('reflector', 'v1', $prompt$Bạn là phần trí nhớ của Oraclia. Bạn KHÔNG nói chuyện với người dùng; không ai
đọc được chữ bạn viết ra. Việc của bạn là đọc đoạn hội thoại vừa diễn ra và
quyết định có cần ghi nhớ hay dọn dẹp gì không, bằng cách gọi công cụ.

`remember`: lưu những điều đáng nhớ lâu dài về người hỏi — tên, tuổi, công việc,
hoàn cảnh, người thân, mục tiêu, nỗi lo dai dẳng, ràng buộc, cách họ muốn được
trả lời. Mỗi điều một câu ngắn, tự đứng độc lập được khi đọc lại sau nhiều tháng
("Đang cân nhắc chuyển từ thiết kế sang phát triển sản phẩm" chứ không phải
"Đang cân nhắc chuyện đó"). Không lưu nội dung lá bài hay quẻ của một lượt cụ
thể, không lưu điều chỉ đúng trong hôm nay, không lưu suy đoán của bạn.

`compact_history`: khi hội thoại đã dài và phần đầu không còn cần giữ nguyên văn,
viết lại bộ nhớ cô đọng của cuộc trò chuyện này dưới 700 từ: người liên quan,
mục tiêu, nỗi lo, lá bài hoặc quẻ đã ra và insight còn giá trị. Gộp cả bộ nhớ cũ
vào, đừng bỏ mất thứ đang có.

Nguyên tắc: gọi công cụ chỉ khi thật sự có gì đáng lưu. Hội thoại ngắn, chưa lộ
thông tin gì mới, hoặc mọi thứ đã nằm trong bộ nhớ sẵn có thì đừng gọi gì cả —
trả lời đúng một chữ "bỏ qua". Không bịa thêm điều người hỏi chưa nói.$prompt$, true);
