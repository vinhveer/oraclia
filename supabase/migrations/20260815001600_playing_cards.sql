-- Bộ bài tây 52 lá. Mã lá theo tên file ảnh: hạng + chất, '0' là mười.
-- Bài tây không có lá ngược — hoa văn đối xứng nên chiều lá không mang nghĩa.
create table public.playing_cards (
  id         text primary key,
  rank       text not null,
  suit       text not null,
  name_vi    text not null,
  image      text not null,
  keywords   jsonb not null default '[]'::jsonb,
  meaning    text not null,
  sort_order integer not null default 0
);

alter table public.playing_cards enable row level security;

create policy "playing cards are public reference data" on public.playing_cards
  for select to authenticated using (true);
create policy "admins curate playing cards" on public.playing_cards
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.playing_cards
  (id, rank, suit, name_vi, image, keywords, meaning, sort_order)
values
  ('AH', 'A', 'cơ', 'Át Cơ', 'baitay/AH.png', '["khởi đầu tình cảm", "mái ấm", "mở lòng"]'::jsonb, 'Một khởi đầu ấm áp trong chuyện tình cảm hoặc chuyện nhà; trái tim đang mở ra.', 0),
  ('2H', '2', 'cơ', 'Hai Cơ', 'baitay/2H.png', '["gắn kết", "hòa hợp", "hai người"]'::jsonb, 'Một mối quan hệ đang tìm được nhịp chung; sự gắn kết cần cả hai phía.', 1),
  ('3H', '3', 'cơ', 'Ba Cơ', 'baitay/3H.png', '["vui vầy", "sum họp", "san sẻ"]'::jsonb, 'Niềm vui đến từ việc có người cùng chia; đừng giữ mọi thứ một mình.', 2),
  ('4H', '4', 'cơ', 'Bốn Cơ', 'baitay/4H.png', '["ổn định", "nếp nhà", "tạm đủ"]'::jsonb, 'Tình cảm đã yên chỗ, nhưng yên quá lâu thì dễ hóa nhàm.', 3),
  ('5H', '5', 'cơ', 'Năm Cơ', 'baitay/5H.png', '["tiếc nuối", "đổi thay", "hụt hẫng"]'::jsonb, 'Có gì đó vừa mất đi trong lòng; đừng để tiếc nuối che mất phần còn lại.', 4),
  ('6H', '6', 'cơ', 'Sáu Cơ', 'baitay/6H.png', '["chuyện cũ", "biết ơn", "giúp đỡ"]'::jsonb, 'Quá khứ quay lại, có thể là người cũ hoặc một ơn nghĩa chưa trả.', 5),
  ('7H', '7', 'cơ', 'Bảy Cơ', 'baitay/7H.png', '["mơ mộng", "ảo tưởng", "chọn lựa"]'::jsonb, 'Nhiều lựa chọn tình cảm nhưng phần lớn là tưởng tượng; hãy tỉnh táo.', 6),
  ('8H', '8', 'cơ', 'Tám Cơ', 'baitay/8H.png', '["rời đi", "chuyển hướng", "buông"]'::jsonb, 'Rời khỏi một điều từng quan trọng để đi tìm thứ thật hơn.', 7),
  ('9H', '9', 'cơ', 'Chín Cơ', 'baitay/9H.png', '["toại nguyện", "mong ước", "đủ đầy"]'::jsonb, 'Lá của điều ước: thứ bạn mong trong lòng đang tới gần.', 8),
  ('0H', '0', 'cơ', 'Mười Cơ', 'baitay/0H.png', '["viên mãn", "gia đình", "trọn vẹn"]'::jsonb, 'Một chu kỳ tình cảm hoàn tất trong sự yên ổn.', 9),
  ('JH', 'J', 'cơ', 'Bồi Cơ', 'baitay/JH.png', '["người trẻ", "tin vui", "chân thành"]'::jsonb, 'Một người trẻ có lòng, hoặc một tin nhắn từ người quan tâm bạn.', 10),
  ('QH', 'Q', 'cơ', 'Đầm Cơ', 'baitay/QH.png', '["người nữ ân cần", "thấu cảm", "nâng đỡ"]'::jsonb, 'Một người phụ nữ giàu tình cảm đang ở gần, hoặc phần dịu dàng trong chính bạn.', 11),
  ('KH', 'K', 'cơ', 'Già Cơ', 'baitay/KH.png', '["người nam điềm đạm", "bao dung", "chỗ dựa"]'::jsonb, 'Một người đàn ông chín chắn, sống bằng tình; có thể là chỗ dựa.', 12),
  ('AD', 'A', 'rô', 'Át Rô', 'baitay/AD.png', '["tin mới", "cơ hội", "khoản thu"]'::jsonb, 'Một tin tức hoặc cơ hội vật chất vừa xuất hiện.', 13),
  ('2D', '2', 'rô', 'Hai Rô', 'baitay/2D.png', '["cân đối", "xoay xở", "hai việc"]'::jsonb, 'Đang phải cân hai thứ cùng lúc; giữ được nhịp thì qua.', 14),
  ('3D', '3', 'rô', 'Ba Rô', 'baitay/3D.png', '["tay nghề", "tiến bộ", "được ghi nhận"]'::jsonb, 'Công sức bắt đầu ra kết quả và có người nhìn thấy.', 15),
  ('4D', '4', 'rô', 'Bốn Rô', 'baitay/4D.png', '["giữ chặt", "tiết kiệm", "phòng thân"]'::jsonb, 'Giữ của là đúng, nhưng giữ quá chặt thì không còn chỗ cho cái mới.', 16),
  ('5D', '5', 'rô', 'Năm Rô', 'baitay/5D.png', '["thiếu hụt", "lo tiền", "chật vật"]'::jsonb, 'Một giai đoạn eo hẹp; đừng ngại nhờ khi cần.', 17),
  ('6D', '6', 'rô', 'Sáu Rô', 'baitay/6D.png', '["cho và nhận", "trợ giúp", "cân bằng lại"]'::jsonb, 'Dòng tiền hoặc sự giúp đỡ đang chảy qua tay bạn theo cả hai chiều.', 18),
  ('7D', '7', 'rô', 'Bảy Rô', 'baitay/7D.png', '["chờ kết quả", "kiên nhẫn", "đánh giá"]'::jsonb, 'Đã gieo rồi, giờ là lúc chờ và xem có đáng tiếp tục không.', 19),
  ('8D', '8', 'rô', 'Tám Rô', 'baitay/8D.png', '["chuyên tâm", "làm đều", "học nghề"]'::jsonb, 'Kết quả tới từ việc lặp lại đều đặn, không phải từ cú nhảy.', 20),
  ('9D', '9', 'rô', 'Chín Rô', 'baitay/9D.png', '["tự chủ", "dư dả", "tự lo được"]'::jsonb, 'Đứng được bằng chân mình, không cần dựa ai.', 21),
  ('0D', '0', 'rô', 'Mười Rô', 'baitay/0D.png', '["bền vững", "của cải", "dài hạn"]'::jsonb, 'Nền tảng vật chất đủ vững để tính chuyện lâu dài.', 22),
  ('JD', 'J', 'rô', 'Bồi Rô', 'baitay/JD.png', '["tin tức", "người đưa tin", "học việc"]'::jsonb, 'Một tin về tiền bạc hoặc công việc sắp tới.', 23),
  ('QD', 'Q', 'rô', 'Đầm Rô', 'baitay/QD.png', '["người nữ thực tế", "khéo lo", "quản lý"]'::jsonb, 'Một người phụ nữ giỏi thu vén, hoặc lời nhắc bạn thực tế hơn.', 24),
  ('KD', 'K', 'rô', 'Già Rô', 'baitay/KD.png', '["người nam làm ăn", "quyết đoán", "nguồn lực"]'::jsonb, 'Một người đàn ông có tiền hoặc có quyền quyết trong chuyện làm ăn.', 25),
  ('AC', 'A', 'nhép', 'Át Nhép', 'baitay/AC.png', '["bắt đầu làm", "ý tưởng", "động lực"]'::jsonb, 'Sức bật để khởi sự một việc; lúc này hành động hơn bàn.', 26),
  ('2C', '2', 'nhép', 'Hai Nhép', 'baitay/2C.png', '["kế hoạch", "chọn hướng", "chờ tín hiệu"]'::jsonb, 'Đã có tầm nhìn nhưng chưa bước; phải chọn một hướng.', 27),
  ('3C', '3', 'nhép', 'Ba Nhép', 'baitay/3C.png', '["mở rộng", "hợp tác", "đường xa"]'::jsonb, 'Việc bắt đầu vươn ra ngoài, có thể cần người cùng làm.', 28),
  ('4C', '4', 'nhép', 'Bốn Nhép', 'baitay/4C.png', '["thành quả", "nghỉ ngơi", "ăn mừng"]'::jsonb, 'Một chặng đã xong, cho phép mình dừng lại một nhịp.', 29),
  ('5C', '5', 'nhép', 'Năm Nhép', 'baitay/5C.png', '["va chạm", "cạnh tranh", "ồn ào"]'::jsonb, 'Nhiều ý kiến đối chọi; tranh luận thẳng còn hơn ngấm ngầm.', 30),
  ('6C', '6', 'nhép', 'Sáu Nhép', 'baitay/6C.png', '["thắng lợi", "được công nhận", "đà tốt"]'::jsonb, 'Nỗ lực được nhìn thấy; giữ khiêm là giữ được đà.', 31),
  ('7C', '7', 'nhép', 'Bảy Nhép', 'baitay/7C.png', '["giữ vững", "bị thử", "đơn độc"]'::jsonb, 'Bạn đang phải bảo vệ vị trí của mình; đứng vững là thắng.', 32),
  ('8C', '8', 'nhép', 'Tám Nhép', 'baitay/8C.png', '["nhanh", "dồn dập", "tin gấp"]'::jsonb, 'Mọi thứ chuyển động nhanh; bắt kịp nhịp thì lợi.', 33),
  ('9C', '9', 'nhép', 'Chín Nhép', 'baitay/9C.png', '["bền bỉ", "gần đích", "cảnh giác"]'::jsonb, 'Đã đi xa hơn bạn nghĩ; chặng còn lại ngắn hơn vẻ ngoài của nó.', 34),
  ('0C', '0', 'nhép', 'Mười Nhép', 'baitay/0C.png', '["quá tải", "ôm đồm", "gánh nặng"]'::jsonb, 'Đang vác nhiều hơn sức; bớt một việc là cứu cả phần còn lại.', 35),
  ('JC', 'J', 'nhép', 'Bồi Nhép', 'baitay/JC.png', '["người nhiệt tình", "tin về việc", "hăng hái"]'::jsonb, 'Một người trẻ đầy năng lượng, hoặc một tin thúc bạn hành động.', 36),
  ('QC', 'Q', 'nhép', 'Đầm Nhép', 'baitay/QC.png', '["người nữ quyết đoán", "tự tin", "ấm áp"]'::jsonb, 'Một người phụ nữ thẳng thắn và có sức hút.', 37),
  ('KC', 'K', 'nhép', 'Già Nhép', 'baitay/KC.png', '["người nam dẫn dắt", "tầm nhìn", "chủ động"]'::jsonb, 'Một người đàn ông biết dẫn việc; có thể là người bạn cần gặp.', 38),
  ('AS', 'A', 'bích', 'Át Bích', 'baitay/AS.png', '["bước ngoặt", "sự thật", "cắt bỏ"]'::jsonb, 'Một sự thật sắc như dao: khó nghe nhưng gỡ được nút thắt.', 39),
  ('2S', '2', 'bích', 'Hai Bích', 'baitay/2S.png', '["bế tắc", "né tránh", "không quyết"]'::jsonb, 'Đang nhắm mắt trước một lựa chọn; không chọn cũng là chọn.', 40),
  ('3S', '3', 'bích', 'Ba Bích', 'baitay/3S.png', '["tổn thương", "chia lìa", "đau lòng"]'::jsonb, 'Một nỗi đau thật; đừng vội gọi tên nó là kết thúc.', 41),
  ('4S', '4', 'bích', 'Bốn Bích', 'baitay/4S.png', '["nghỉ", "rút lui", "hồi phục"]'::jsonb, 'Cần dừng để lành, không phải để trốn.', 42),
  ('5S', '5', 'bích', 'Năm Bích', 'baitay/5S.png', '["thắng mà mất", "xung đột", "ăn thua"]'::jsonb, 'Có thắng cũng mất phần khác; cân xem có đáng không.', 43),
  ('6S', '6', 'bích', 'Sáu Bích', 'baitay/6S.png', '["rời đi", "chuyển tiếp", "nhẹ dần"]'::jsonb, 'Đang rời khỏi vùng khó sang chỗ yên hơn.', 44),
  ('7S', '7', 'bích', 'Bảy Bích', 'baitay/7S.png', '["giấu giếm", "mưu tính", "một mình"]'::jsonb, 'Có gì đó không được nói thẳng; cẩn thận với cách đi tắt.', 45),
  ('8S', '8', 'bích', 'Tám Bích', 'baitay/8S.png', '["tự trói", "bí bách", "tưởng kẹt"]'::jsonb, 'Cảm giác kẹt phần lớn do chính mình dựng lên.', 46),
  ('9S', '9', 'bích', 'Chín Bích', 'baitay/9S.png', '["lo âu", "mất ngủ", "nghĩ quá"]'::jsonb, 'Nỗi lo trong đầu đang lớn hơn chuyện thật ngoài đời.', 47),
  ('0S', '0', 'bích', 'Mười Bích', 'baitay/0S.png', '["kết thúc", "chạm đáy", "làm lại"]'::jsonb, 'Một chương khép lại hẳn; sau đáy là đường lên.', 48),
  ('JS', 'J', 'bích', 'Bồi Bích', 'baitay/JS.png', '["tin không vui", "người dò xét", "cảnh báo"]'::jsonb, 'Một tin khó nghe hoặc một người đang quan sát bạn.', 49),
  ('QS', 'Q', 'bích', 'Đầm Bích', 'baitay/QS.png', '["người nữ sắc sảo", "thẳng thắn", "từng trải"]'::jsonb, 'Một người phụ nữ nói thật, đôi khi hơi lạnh nhưng đúng.', 50),
  ('KS', 'K', 'bích', 'Già Bích', 'baitay/KS.png', '["người nam nghiêm khắc", "lý trí", "quyền lực"]'::jsonb, 'Một người đàn ông lý trí, có quyền phán xét trong chuyện này.', 51)
on conflict (id) do update set
  rank = excluded.rank, suit = excluded.suit, name_vi = excluded.name_vi,
  image = excluded.image, keywords = excluded.keywords, meaning = excluded.meaning,
  sort_order = excluded.sort_order;

-- Một lượt rút có thể là tarot hoặc bài tây; mặt sau và cách hiển thị khác nhau.
alter table public.readings
  add column deck text not null default 'tarot' check (deck in ('tarot', 'playing'));
