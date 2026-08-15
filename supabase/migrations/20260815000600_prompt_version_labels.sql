-- Nhãn version cũ còn mang tên riêng; đổi cho khớp với reader v3.
update public.prompts set version = 'v2' where slug = 'compactor' and version = 'huyen-co-v2';
