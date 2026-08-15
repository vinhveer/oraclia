# Oraclia

Đọc tarot và Kinh Dịch để tự soi chiếu.

## Chạy

```bash
npm install
npm run dev
```

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
ALLOWED_ORIGINS=https://nguyenquangvinh.id.vn,http://localhost:5173
```

---

Tarot và Kinh Dịch ở đây chỉ để tự soi chiếu, không thay thế tư vấn y tế, pháp lý
hoặc tài chính. Trân trọng.
