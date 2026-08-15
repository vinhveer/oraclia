-- Bản reader cũ đã tắt và không còn agent_run nào tham chiếu tới; xóa hẳn để
-- trong database không còn dấu vết tên riêng.
delete from public.prompts where slug = 'reader' and version = 'huyen-co-v2';
