-- Model phải khai đang dựa vào lá nào để đoán. Dặn trong prompt thì nó quên,
-- nên chuyển thành tham số bắt buộc của tool và lưu lại để đối chiếu.
alter table public.clarifications add column based_on text not null default '';
