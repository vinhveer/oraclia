# Oraclia

Oraclia đọc tarot và Kinh Dịch, chạy hoàn toàn trên Supabase. Frontend là React
+ Vite dựng trên bộ component Material Design 3 Expressive; toàn bộ logic agent
nằm trong một Edge Function; dữ liệu và quyền truy cập do Postgres + RLS quản lý.

Người dùng hỏi một câu. Agent tự chọn công cụ: trải bài tarot hay gieo quẻ Kinh
Dịch. Nếu là tarot, nó tự quyết định lượt này cần bao nhiêu lá và đặt tên từng vị
trí, rồi **dừng lại** chờ người hỏi tự chọn bài từ bộ 78 lá đã xáo úp mặt; sau
khi chọn xong, agent chạy tiếp và kể lần lượt từng lá, hình lá bài chèn ngay
giữa dòng diễn giải.

## Kiến trúc

```
              React / Vite  (chat UI · tarot UI · streaming · tool status)
                                    │
                        Supabase Auth (JWT)
                                    │
                  POST /functions/v1/agent   (SSE)
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        │              Edge Function: AGENT RUNTIME             │
        │  auth + rate limit · prompt builder · model adapter   │
        │  tool registry · tool executor · agent loop · stream  │
        └───────┬───────────────────────────────┬───────────────┘
                │                               └──► AI provider
                │                                    (OpenAI-compatible)
                ▼
        Supabase Postgres
        conversations · messages · agent_runs · tool_calls
        readings · cards · prompts
                │
                ▼
        Supabase Realtime  ──►  các tab khác đồng bộ theo conversation
```

### Thư mục

```
supabase/
  client/       kết nối: supabase-js, auth, queries, realtime, SSE client
  functions/    edge functions (agent runtime)
  migrations/   schema + seed, không ai chọt tay vào database
src/
  components/   bộ component M3 (giữ nguyên từ m3_ui)
  features/     auth · chat · tarot
  pages/        LoginPage · ChatPage
```

### Agent loop

`supabase/functions/agent/` chia đúng theo các khối trong sơ đồ:

Mỗi khối trong sơ đồ là một lớp, mỗi lớp một file:

| File | Vai trò |
| --- | --- |
| `index.ts` | chỉ lo HTTP: xác thực, định tuyến hai hành động, mở SSE |
| `runtime/session.ts` | `AgentSession` — dựng repository, tool, adapter cho một request |
| `runtime/agent.ts` | `Agent` — vòng lặp, tối đa 6 bước, hỗ trợ ngắt/tiếp tục |
| `runtime/tools/` | `Tool` (lớp trừu tượng), `ToolRegistry`, và ba tool cụ thể |
| `runtime/repositories/` | một lớp cho mỗi bảng, đều chạy dưới RLS của người gọi |
| `runtime/model/` | `ModelAdapter` trừu tượng, bản OpenAI-compatible và bản demo |
| `runtime/prompts/builder.ts` | `PromptBuilder` — ghép system prompt, hồ sơ, bối cảnh |
| `runtime/tarot/deck.ts` | `Deck` — xáo bài kiểu người thật, lật bài |
| `runtime/iching/caster.ts` | `IChingCaster` — gieo ba đồng xu, tra 64 quẻ |
| `runtime/compactor.ts` | `Compactor` — cô đọng hội thoại dài |
| `runtime/stream.ts` | `StreamController` — SSE |

Công cụ hiện có:

- `draw_cards(positions, reason)` — **ngắt** vòng lặp. Runtime xáo 78 lá, lưu
  thứ tự úp mặt, `agent_runs.status` chuyển sang `awaiting_input`. Người hỏi
  chọn bài, request thứ hai lật bài và chạy tiếp đúng transcript cũ.
- `cast_iching(question)` — gieo quẻ ba đồng xu, trả về quẻ chính, hào động,
  quẻ biến. Không ngắt vòng lặp.
- `lookup_cards(card_ids | query)` — tra nghĩa tham khảo, không rút thêm bài.

Thêm một tool là thêm một lớp kế thừa `Tool` rồi đăng ký trong `session.ts`;
`ToolRegistry` lo phần ghi bảng `tool_calls`, phát trạng thái cho UI và biến lỗi
thành kết quả model còn gỡ được.

Sự kiện SSE gửi về browser: `run.started`, `tool.started`, `tool.completed`,
`draw.requested`, `cards.revealed`, `iching.cast`, `message.delta`,
`message.completed`, `run.completed`, `run.error`.

### Trí nhớ: phản tư thay vì đếm tin nhắn

Sau khi trả lời xong, nếu người dùng ngừng gõ **6 giây**, client gọi
`{ action: 'reflect' }`. Agent chạy một lượt phụ không hiện trong chat, đọc lại
16 lượt gần nhất cùng những gì đã nhớ, rồi tự quyết định bằng tool:

- `remember(facts)` — lưu điều đáng nhớ lâu dài về người hỏi vào bảng `memories`,
  tự lọc trùng với những gì đã có. Các mục này được nạp vào system prompt của
  **mọi** cuộc trò chuyện sau đó.
- `compact_history(summary)` — viết lại `context_summary` của cuộc trò chuyện khi
  phần đầu không còn cần giữ nguyên văn.

Không có gì đáng nhớ thì nó không gọi gì cả. Lượt phản tư bị huỷ/dời khi người
dùng gõ tiếp, và bỏ qua hoàn toàn nếu không có tin nhắn nào mới hơn mốc
`reflected_at` — nên ngồi im không làm agent nghiền lại cùng một đoạn.

Model không tự thấy được hội thoại dài bao nhiêu, nên prompt phản tư nói thẳng
số tin nhắn chưa được cô đọng; thiếu con số đó thì nó gần như không bao giờ gọi
`compact_history`. `runtime/compactor.ts` vẫn còn nhưng đã lùi xuống làm lưới an
toàn ở ngưỡng 24 tin, cho trường hợp người dùng nói liên tục đến mức lượt phản
tư không kịp chạy.

### Trong khung chat

- Tiêu đề cuộc trò chuyện do model đặt ở lượt đầu, **trước** khi câu trả lời bắt
  đầu chảy (`runtime/titler.ts`), gửi về qua sự kiện `conversation.titled`.
- Ô tìm kiếm ở sidebar tìm cả tiêu đề lẫn nội dung tin nhắn, có debounce 220ms.
- Rê vào câu hỏi của mình để chép, sửa hoặc hỏi lại. Sửa và hỏi lại đều cắt bỏ
  lịch sử từ tin nhắn đó trở đi rồi chạy lại, nên không còn câu trả lời cũ treo
  dưới một câu hỏi đã đổi.

### Kể theo từng lá

Sau khi lật bài, prompt yêu cầu model chèn mã `[[card:N]]` trên một dòng riêng
ngay trước đoạn nói về lá thứ N. Bộ render Markdown thay mỗi mã bằng hình lá bài,
nên bài đọc chảy thành "đầu tiên bạn rút được lá này — hình — diễn giải" thay vì
dồn hết lá lên đầu. Nếu model quên đặt mã thì giao diện tự rơi về lưới lá như cũ.

### Xáo bài

`Deck.shuffle()` mô phỏng đúng thao tác tay chứ không hoán vị toán học: bảy vòng
riffle theo mô hình Gilbert–Shannon–Reeds (ngưỡng Bayer–Diaconis cho một cỗ bài),
xen kẽ overhand, quay ngược vài đoạn để sinh lá ngược, rồi cắt một nhát cuối.

Đo trên 20.000 lần xáo: chi-square vị trí của một lá cố định là 90.0 và của lá
nằm ở đáy là 71.3, với df = 77 và ngưỡng 5% ≈ 98.5 — tức không phát hiện lệch.
Lá ngược chiếm 46.7%. Hai lá cạnh nhau cùng chiều 57.2% chứ không phải 50%: quay
nguyên một đoạn thì cả đoạn cùng chiều, đó là đặc tính của thao tác thật.

### 64 quẻ Kinh Dịch

Bảng quẻ nằm trong `public.hexagrams`, tra bằng chuỗi 6 hào (`lines`, đọc từ hào
1 dưới cùng) nên runtime không phải mang theo bảng bát quái. Lúc sinh migration,
tên ghép của cả 64 quẻ được dựng lại từ cặp bát quái theo bảng King Wen rồi so
với danh sách gõ tay — khớp cả 64.

Gieo theo phép ba đồng xu: sấp 2, ngửa 3, tổng 6..9 với xác suất 1/8, 3/8, 3/8,
1/8. Hào 6 và 9 là hào động và sinh quẻ biến.

### Vì sao lượt chọn bài là thật

`readings.shuffled` giữ thứ tự cả bộ bài cùng chiều xuôi/ngược, cố định ngay lúc
xáo. Trình duyệt không bao giờ đọc được cột này, kể cả chủ sở hữu hàng đó — chỉ
service role trong edge function đọc, và chỉ sau khi RLS đã xác nhận quyền sở
hữu.

Cách khóa đáng chú ý ở chỗ RLS không làm được việc này: RLS lọc theo hàng, không
theo cột. Mà chỉ `revoke` theo cột cũng vô dụng, vì Supabase cấp sẵn quyền ở cấp
bảng cho role `authenticated`, và quyền cấp bảng luôn thắng revoke theo cột. Nên
`20260815000400_lock_deck.sql` thu hồi hẳn quyền cấp bảng rồi cấp lại từng cột
trừ `shuffled`. Đọc trộm cột đó giờ trả về lỗi `42501`.

## Chạy với project Supabase thật

Đây là cách đang dùng: database và edge function nằm trên cloud, chỉ frontend
chạy máy mình. Không cần Docker.

```bash
npm install
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```

Điền `supabase/.env.local` (xem `supabase/.env.local.example`) rồi đẩy lên:

```bash
npx supabase secrets set --env-file supabase/.env.local
npx supabase functions deploy agent
```

Tạo `.env.local` ở gốc cho frontend — URL và anon key lấy trong dashboard mục
Project Settings › API:

```dotenv
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

```bash
npm run dev
```

Đăng ký tài khoản ở `/login`. Nếu project bật xác nhận email, sau khi đăng ký sẽ
hiện màn hình nhắc mở thư xác thực; tắt yêu cầu này ở Authentication › Providers
› Email nếu muốn dùng ngay.

Đổi prompt hay đổi model thì không cần deploy lại frontend: prompt nằm trong
bảng `prompts`, model nằm trong secrets.

## Chạy local hoàn toàn (tùy chọn)

Cần Docker. `npm run db:start` dựng cả stack, `npm run db:reset` chạy lại
migration từ đầu, `npm run functions:serve` chạy edge function tại máy.

## Kiểm tra

```bash
npm run build   # tsc -b && vite build
npm run lint
```

## Deploy

```bash
npx supabase link --project-ref <ref>
npx supabase db push
npx supabase secrets set --env-file supabase/.env.local
npx supabase functions deploy agent
npm run build          # dist/ đem lên bất kỳ static host nào
```

Nhớ đặt `ALLOWED_ORIGINS` thành domain thật của frontend.

Tarot trong ứng dụng chỉ nhằm tự soi chiếu, không thay thế tư vấn y tế, pháp lý
hoặc tài chính.
