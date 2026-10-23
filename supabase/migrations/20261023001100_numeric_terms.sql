-- loose_terms bỏ mọi từ một ký tự, kể cả chữ số — nên "thuần càn hào 6" mất số
-- hào và khớp hào 1 trước hào 6. Giữ lại chữ số đứng riêng; chữ cái lẻ vẫn bỏ.
create or replace function public.loose_terms(value text)
returns text[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(word), '{}')
  from unnest(tsvector_to_array(to_tsvector('simple'::regconfig, public.f_unaccent(coalesce(value, ''))))) word
  where (length(word) > 1 or word ~ '^[0-9]$')
    and word not in (select s.word from public.text_stopwords s)
$$;
