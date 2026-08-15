# Oraclia

Đọc tarot và Kinh Dịch để tự soi chiếu.

## Chạy

```bash
npm install
npm run dev
```

URL và anon key của project nằm sẵn trong `supabase/client/client.ts` (anon key
vốn công khai, RLS mới là thứ chặn truy cập), nên clone về là chạy. Muốn trỏ sang
project khác thì đặt `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` trong
`.env.local`.

## Thay đổi backend

```bash
npx supabase db push                                     # migration
npx supabase secrets set --env-file supabase/.env.local  # secrets
npx supabase functions deploy agent
```

Secrets (xem `supabase/.env.local.example`):

```dotenv
LLM_API_KEY=            # để trống = demo mode
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4.1-mini
AGENT_RUNS_PER_HOUR=60
ALLOWED_ORIGINS=https://vinhveer.github.io,http://localhost:5173
```

Model **bắt buộc hỗ trợ tool calling**, không thì chẳng bao giờ rút được bài.
Prompt nằm trong bảng `prompts`, sửa không cần deploy lại.

## Deploy lên GitHub Pages

```bash
npm run build       # ra thư mục docs/, kèm .nojekyll và 404.html
git add docs && git commit -m "build" && git push
```

Settings › Pages chọn nhánh `main`, thư mục `/docs`. Site chạy ở
`https://vinhveer.github.io/oraclia`, khớp với `base` trong `vite.config.ts`.
`.nojekyll` để Pages không bỏ qua thư mục `_*` của Vite; `404.html` là bản sao
`index.html` để mở thẳng đường dẫn con không ra trang lỗi.

Đổi domain thì sửa ba chỗ: `base` trong vite config, `ALLOWED_ORIGINS` trong
secrets, và Site URL / Redirect URLs trong Authentication của project.

---

Tarot và Kinh Dịch ở đây chỉ để tự soi chiếu, không thay thế tư vấn y tế, pháp lý
hoặc tài chính. Trân trọng.
