-- 64 quẻ Kinh Dịch theo thứ tự King Wen. `lines` đọc từ hào 1 (dưới cùng) lên
-- hào 6, '1' là hào dương, '0' là hào âm — tra quẻ chỉ cần khớp chuỗi này, nên
-- runtime không phải mang theo bảng bát quái nào.
create table public.hexagrams (
  number        integer primary key check (number between 1 and 64),
  lines         text not null unique check (lines ~ '^[01]{6}$'),
  name          text not null,
  full_name     text not null,
  lower_trigram text not null,
  upper_trigram text not null,
  keywords      jsonb not null default '[]'::jsonb,
  meaning       text not null,
  advice        text not null
);

alter table public.hexagrams enable row level security;

create policy "hexagrams are public reference data" on public.hexagrams
  for select to authenticated using (true);
create policy "admins curate hexagrams" on public.hexagrams
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.hexagrams
  (number, lines, name, full_name, lower_trigram, upper_trigram, keywords, meaning, advice)
values
  (1, '111111', 'Càn', 'Thuần Càn', 'Càn', 'Càn', '["sáng tạo", "cương kiện", "chủ động"]'::jsonb, 'Sức sáng tạo đang mạnh và thuận: đây là lúc khởi sự, dẫn dắt, đi trước.', 'Giữ chính trực và đừng lạm dụng thế mạnh; cương quá thì gãy.'),
  (2, '000000', 'Khôn', 'Thuần Khôn', 'Khôn', 'Khôn', '["thuận theo", "dung chứa", "bền bỉ"]'::jsonb, 'Sức mạnh nằm ở sự tiếp nhận và nâng đỡ, không ở việc tranh phần dẫn đầu.', 'Đi sau mà giữ được thì hơn đi trước mà mất; nuôi dưỡng trước khi đòi kết quả.'),
  (3, '100010', 'Truân', 'Thủy Lôi Truân', 'Chấn', 'Khảm', '["khởi đầu khó", "rối", "nảy mầm"]'::jsonb, 'Việc mới nhú lên giữa bộn bề, chưa thành hình nhưng có sức sống.', 'Đừng vội bung ra; tìm người đồng hành và gỡ từng mối một.'),
  (4, '010001', 'Mông', 'Sơn Thủy Mông', 'Khảm', 'Cấn', '["chưa tỏ", "học hỏi", "cần dẫn"]'::jsonb, 'Có chỗ còn mông muội, thiếu thông tin hoặc thiếu kinh nghiệm.', 'Hỏi cho đúng người và chịu học; đừng giả vờ đã hiểu.'),
  (5, '111010', 'Nhu', 'Thủy Thiên Nhu', 'Càn', 'Khảm', '["chờ đợi", "nuôi lực", "kiên nhẫn"]'::jsonb, 'Thời chưa tới, phía trước còn hiểm; chờ là hành động chứ không phải bỏ cuộc.', 'Chuẩn bị và giữ sức trong lúc chờ, đừng liều vượt.'),
  (6, '010111', 'Tụng', 'Thiên Thủy Tụng', 'Khảm', 'Càn', '["tranh chấp", "bất đồng", "phân xử"]'::jsonb, 'Có mâu thuẫn về lẽ phải hoặc quyền lợi đang cần được nói rõ.', 'Nói thẳng nhưng đừng đẩy tới cùng; hòa giải sớm lợi hơn thắng muộn.'),
  (7, '010000', 'Sư', 'Địa Thủy Sư', 'Khảm', 'Khôn', '["tổ chức", "kỷ luật", "dẫn dắt"]'::jsonb, 'Việc lớn cần người cầm trịch và một kỷ luật rõ ràng.', 'Chọn người đứng đầu có uy tín, đặt quy tắc trước khi ra quân.'),
  (8, '000010', 'Tỷ', 'Thủy Địa Tỷ', 'Khôn', 'Khảm', '["gắn kết", "đồng minh", "thân cận"]'::jsonb, 'Đây là lúc xích lại gần nhau, chọn đúng người mà nương tựa.', 'Kết thân sớm và chân thành; đến muộn thì khó có chỗ.'),
  (9, '111011', 'Tiểu Súc', 'Phong Thiên Tiểu Súc', 'Càn', 'Tốn', '["tích nhỏ", "kiềm chế", "chưa đủ"]'::jsonb, 'Lực còn mỏng, chỉ tích được từng chút, chưa đến lúc bung.', 'Giữ nhịp nhỏ mà đều; đừng ép thời cuộc.'),
  (10, '110111', 'Lý', 'Thiên Trạch Lý', 'Đoài', 'Càn', '["cẩn trọng", "bước đi", "lễ độ"]'::jsonb, 'Đang đi trên chỗ nguy mà vẫn qua được nhờ giữ đúng cách cư xử.', 'Biết mình đứng đâu; lễ độ và cẩn thận là cái đỡ chân.'),
  (11, '111000', 'Thái', 'Địa Thiên Thái', 'Càn', 'Khôn', '["hanh thông", "giao hòa", "thuận"]'::jsonb, 'Trên dưới thông nhau, việc trôi chảy, đúng thời để mở rộng.', 'Thời thịnh không kéo mãi; làm điều dài hạn ngay lúc đang thuận.'),
  (12, '000111', 'Bĩ', 'Thiên Địa Bĩ', 'Khôn', 'Càn', '["bế tắc", "cách trở", "ngưng"]'::jsonb, 'Trên dưới không thông, cố cũng không thấu; đây là thời đóng.', 'Rút về giữ mình, đừng phô trương; chờ thời chuyển.'),
  (13, '101111', 'Đồng Nhân', 'Thiên Hỏa Đồng Nhân', 'Ly', 'Càn', '["đồng lòng", "cộng sự", "công khai"]'::jsonb, 'Việc nên làm cùng người khác, giữa thanh thiên bạch nhật.', 'Kết hợp trên lẽ chung chứ đừng bè phái nhỏ.'),
  (14, '111101', 'Đại Hữu', 'Hỏa Thiên Đại Hữu', 'Càn', 'Ly', '["sung mãn", "sở hữu lớn", "sáng"]'::jsonb, 'Có nhiều trong tay và có tầm ảnh hưởng.', 'Của nhiều thì dễ sinh kiêu; chia sẻ và giữ khiêm.'),
  (15, '001000', 'Khiêm', 'Địa Sơn Khiêm', 'Cấn', 'Khôn', '["khiêm nhường", "hạ mình", "bền"]'::jsonb, 'Càng hạ mình càng được nâng; đây là quẻ hiếm hoi không có nét xấu.', 'Nói ít làm nhiều, đừng nhận công về mình.'),
  (16, '000100', 'Dự', 'Lôi Địa Dự', 'Khôn', 'Chấn', '["hứng khởi", "chuẩn bị", "thuận đà"]'::jsonb, 'Có sự phấn chấn và động lực, dễ kéo được người theo.', 'Vui mà không buông thả; chuẩn bị trước khi hào hứng qua đi.'),
  (17, '100110', 'Tùy', 'Trạch Lôi Tùy', 'Chấn', 'Đoài', '["thuận theo", "thích ứng", "đi cùng"]'::jsonb, 'Nên theo thời và theo người xứng đáng, không cứng nhắc giữ ý cũ.', 'Theo cái đúng chứ đừng theo cái tiện.'),
  (18, '011001', 'Cổ', 'Sơn Phong Cổ', 'Tốn', 'Cấn', '["sửa chữa", "tồn đọng", "gốc hỏng"]'::jsonb, 'Có thứ đã hỏng từ lâu bị bỏ mặc, giờ phải xử lý tận gốc.', 'Nhìn thẳng vào nguyên nhân cũ; vá tạm sẽ hỏng lại.'),
  (19, '110000', 'Lâm', 'Địa Trạch Lâm', 'Đoài', 'Khôn', '["tiến tới", "gần gũi", "đang lên"]'::jsonb, 'Thời đang mở ra, việc tiếp cận và mở rộng thuận lợi.', 'Tiến khi còn thuận, nhưng nhớ rằng thời nào cũng có hạn.'),
  (20, '000011', 'Quán', 'Phong Địa Quán', 'Khôn', 'Tốn', '["quan sát", "chiêm nghiệm", "tấm gương"]'::jsonb, 'Lúc để nhìn cho kỹ chứ chưa phải lúc ra tay.', 'Quan sát cả cách mình đang được người khác nhìn.'),
  (21, '100101', 'Phệ Hạp', 'Hỏa Lôi Phệ Hạp', 'Chấn', 'Ly', '["dứt khoát", "xử lý", "cắn vỡ"]'::jsonb, 'Có vật cản nằm giữa, phải cắn vỡ mới thông.', 'Xử lý minh bạch và đúng mức, đừng nửa vời.'),
  (22, '101001', 'Bí', 'Sơn Hỏa Bí', 'Ly', 'Cấn', '["hình thức", "trau chuốt", "vẻ ngoài"]'::jsonb, 'Vẻ ngoài đang được chăm chút, nhưng cái đẹp chỉ là lớp áo.', 'Trang sức vừa đủ; đừng để hình thức che mất thực chất.'),
  (23, '000001', 'Bác', 'Sơn Địa Bác', 'Khôn', 'Cấn', '["tiêu mòn", "rơi rụng", "suy"]'::jsonb, 'Nền đang bị bào mòn từ dưới, cấu trúc yếu dần.', 'Không chống lại thời suy; giữ gốc và chờ.'),
  (24, '100000', 'Phục', 'Địa Lôi Phục', 'Chấn', 'Khôn', '["trở lại", "hồi phục", "chu kỳ"]'::jsonb, 'Một mầm dương vừa quay lại sau chỗ tối nhất.', 'Bắt đầu lại từ cái nhỏ, đúng nhịp; đừng ép nhanh.'),
  (25, '100111', 'Vô Vọng', 'Thiên Lôi Vô Vọng', 'Chấn', 'Càn', '["tự nhiên", "không vọng cầu", "chân thật"]'::jsonb, 'Làm đúng lẽ tự nhiên thì thông, tính toan bậy thì hỏng.', 'Bỏ ý đồ vụ lợi; làm việc nên làm.'),
  (26, '111001', 'Đại Súc', 'Sơn Thiên Đại Súc', 'Càn', 'Cấn', '["tích lớn", "kìm giữ", "nuôi lực"]'::jsonb, 'Sức đang được tích lại nhiều, chưa dùng ngay là để dùng lớn.', 'Nuôi tài và học; dừng lại lúc này là để đi xa.'),
  (27, '100001', 'Di', 'Sơn Lôi Di', 'Chấn', 'Cấn', '["nuôi dưỡng", "ăn nói", "chăm sóc"]'::jsonb, 'Chuyện nuôi thân và nuôi chí — cả thức ăn lẫn lời nói.', 'Xem mình đang nạp vào những gì, cả nghĩa đen lẫn nghĩa bóng.'),
  (28, '011110', 'Đại Quá', 'Trạch Phong Đại Quá', 'Tốn', 'Đoài', '["quá tải", "gánh nặng", "vượt sức"]'::jsonb, 'Xà nhà cong vì gánh quá nặng; vượt quá mức chịu đựng.', 'Bỏ bớt hoặc chống đỡ ngay; đừng gồng tới lúc gãy.'),
  (29, '010010', 'Khảm', 'Thuần Khảm', 'Khảm', 'Khảm', '["hiểm", "lặp lại", "thành tín"]'::jsonb, 'Hiểm chồng hiểm, phải đi xuyên qua chứ không vòng được.', 'Giữ lòng thành và làm đúng bài bản; nước gặp chỗ trũng rồi vẫn chảy tiếp.'),
  (30, '101101', 'Ly', 'Thuần Ly', 'Ly', 'Ly', '["sáng rõ", "bám víu", "phụ thuộc"]'::jsonb, 'Ánh sáng cần chỗ bám mới cháy; sự sáng suốt cũng cần chỗ dựa.', 'Nương vào cái đúng; đừng bám vào thứ sẽ tắt.'),
  (31, '001110', 'Hàm', 'Trạch Sơn Hàm', 'Cấn', 'Đoài', '["cảm ứng", "thu hút", "đáp lại"]'::jsonb, 'Hai bên cảm nhau tự nhiên, quan hệ đang có sức hút.', 'Cảm mà giữ được sự chân thành thì bền.'),
  (32, '011100', 'Hằng', 'Lôi Phong Hằng', 'Tốn', 'Chấn', '["lâu bền", "kiên trì", "nếp"]'::jsonb, 'Điều đáng giữ là cái đều đặn, không phải cái bùng lên.', 'Giữ nếp nhưng đừng cứng; bền không có nghĩa là bất động.'),
  (33, '001111', 'Độn', 'Thiên Sơn Độn', 'Cấn', 'Càn', '["lui về", "rút", "giữ mình"]'::jsonb, 'Thời tiểu nhân lên, rút lui đúng lúc là khôn ngoan chứ không phải thua.', 'Lui mà giữ được thế, đừng lui trong hoảng loạn.'),
  (34, '111100', 'Đại Tráng', 'Lôi Thiên Đại Tráng', 'Càn', 'Chấn', '["mạnh", "đà lớn", "hăng"]'::jsonb, 'Sức đang rất mạnh, dễ đi tới chỗ dùng sức thay vì dùng lý.', 'Mạnh mà giữ lễ; đừng húc bừa như dê húc rào.'),
  (35, '000101', 'Tấn', 'Hỏa Địa Tấn', 'Khôn', 'Ly', '["tiến lên", "được nhìn nhận", "sáng dần"]'::jsonb, 'Đang tiến và được ghi nhận, như mặt trời lên khỏi mặt đất.', 'Tiến bằng thực lực và sự sáng rõ, đừng bằng quan hệ suông.'),
  (36, '101000', 'Minh Di', 'Địa Hỏa Minh Di', 'Ly', 'Khôn', '["che khuất", "ẩn sáng", "chịu đựng"]'::jsonb, 'Ánh sáng bị vùi; người giỏi tạm thời bị lu mờ hoặc bị hiểu sai.', 'Giấu sáng mà giữ chí; đừng phô ra lúc này.'),
  (37, '101011', 'Gia Nhân', 'Phong Hỏa Gia Nhân', 'Ly', 'Tốn', '["gia đình", "vai trò", "nội bộ"]'::jsonb, 'Chuyện trong nhà, trong nhóm; ai đúng vai nấy thì yên.', 'Bắt đầu từ việc chỉnh chính mình và ranh giới trong nhà.'),
  (38, '110101', 'Khuê', 'Hỏa Trạch Khuê', 'Đoài', 'Ly', '["trái lìa", "khác biệt", "hiểu lầm"]'::jsonb, 'Hai bên đi ngược hướng, dễ hiểu lầm nhau.', 'Việc nhỏ còn làm được; đừng ép hợp nhất cái vốn khác nhau.'),
  (39, '001010', 'Kiển', 'Thủy Sơn Kiển', 'Cấn', 'Khảm', '["trắc trở", "vướng chân", "dừng"]'::jsonb, 'Đường phía trước gập ghềnh, càng đi càng vướng.', 'Quay lại tìm người giúp và tự xét mình, đừng cố vượt.'),
  (40, '010100', 'Giải', 'Lôi Thủy Giải', 'Khảm', 'Chấn', '["cởi bỏ", "tháo gỡ", "nhẹ nhõm"]'::jsonb, 'Nút thắt vừa được gỡ, căng thẳng đang giãn ra.', 'Xong thì dứt hẳn, đừng để dây dưa lại.'),
  (41, '110001', 'Tổn', 'Sơn Trạch Tổn', 'Đoài', 'Cấn', '["bớt đi", "hy sinh", "giảm"]'::jsonb, 'Phải bớt chỗ này để bồi chỗ kia; mất mà là được.', 'Bớt cái thừa thật lòng thì ít mà vẫn đủ.'),
  (42, '100011', 'Ích', 'Phong Lôi Ích', 'Chấn', 'Tốn', '["thêm vào", "cho đi", "lợi ích"]'::jsonb, 'Trên bớt để dưới thêm; đang có nguồn hỗ trợ.', 'Được thì làm việc đáng làm ngay, thời thuận không dài.'),
  (43, '111110', 'Quải', 'Trạch Thiên Quải', 'Càn', 'Đoài', '["quyết đoán", "nói ra", "dứt điểm"]'::jsonb, 'Đã đến lúc phải nói rõ và loại bỏ điều sai.', 'Công khai và đường hoàng; đừng dùng thủ đoạn để thắng.'),
  (44, '011111', 'Cấu', 'Thiên Phong Cấu', 'Tốn', 'Càn', '["gặp gỡ", "bất ngờ", "cám dỗ"]'::jsonb, 'Có cái gì đó âm thầm len vào, tưởng nhỏ mà lan nhanh.', 'Nhận diện sớm; đừng để quan hệ hay thói quen mới lấn dần.'),
  (45, '000110', 'Tụy', 'Trạch Địa Tụy', 'Khôn', 'Đoài', '["tụ họp", "quy tụ", "đông"]'::jsonb, 'Người và nguồn lực đang tụ lại quanh một điểm chung.', 'Có tụ thì phải có người chủ và mục đích rõ, không thì loạn.'),
  (46, '011000', 'Thăng', 'Địa Phong Thăng', 'Tốn', 'Khôn', '["đi lên", "tích tiến", "thuận"]'::jsonb, 'Như mầm xuyên đất, tiến từ từ mà chắc.', 'Cứ lên đều, đừng nhảy cóc; nhớ nhìn lại gốc.'),
  (47, '010110', 'Khốn', 'Trạch Thủy Khốn', 'Khảm', 'Đoài', '["khốn cùng", "cạn", "bị vây"]'::jsonb, 'Đang bị vây khốn, nói cũng không mấy ai tin.', 'Giữ chí và bớt lời; qua khỏi chỗ cạn thì tự sáng.'),
  (48, '011010', 'Tỉnh', 'Thủy Phong Tỉnh', 'Tốn', 'Khảm', '["nguồn nuôi", "căn bản", "sửa gốc"]'::jsonb, 'Cái giếng vẫn ở đó, vấn đề là có khơi và có múc hay không.', 'Chăm cái nền nuôi mình lâu dài; đừng bỏ giếng khi còn khát.'),
  (49, '101110', 'Cách', 'Trạch Hỏa Cách', 'Ly', 'Đoài', '["cải cách", "thay cũ", "chuyển"]'::jsonb, 'Đến lúc thay cái cũ đã hết dùng.', 'Đổi khi đã đủ tin cậy và đúng thời, đừng đổi vì chán.'),
  (50, '011101', 'Đỉnh', 'Hỏa Phong Đỉnh', 'Tốn', 'Ly', '["đổi mới", "nuôi lớn", "ổn định"]'::jsonb, 'Cái vạc nấu chín và nuôi người; đổi mới đi cùng nuôi dưỡng.', 'Đặt vững ba chân rồi hãy nấu; nền không vững thì đổ.'),
  (51, '100100', 'Chấn', 'Thuần Chấn', 'Chấn', 'Chấn', '["chấn động", "giật mình", "tỉnh"]'::jsonb, 'Một cú sốc làm rung chuyển, nhưng cũng làm tỉnh ra.', 'Sợ mà không loạn; sau tiếng sấm vẫn giữ được việc trong tay.'),
  (52, '001001', 'Cấn', 'Thuần Cấn', 'Cấn', 'Cấn', '["dừng lại", "tĩnh", "biết đủ"]'::jsonb, 'Đến lúc phải dừng, và dừng đúng chỗ là một loại năng lực.', 'Yên cái lưng thì yên cái đầu; ngừng nghĩ lan man.'),
  (53, '001011', 'Tiệm', 'Phong Sơn Tiệm', 'Cấn', 'Tốn', '["tiến dần", "tuần tự", "đúng trình tự"]'::jsonb, 'Tiến từng bước như cây lớn trên núi, chậm mà chắc.', 'Đừng đốt cháy giai đoạn; thứ tự đúng thì kết quả bền.'),
  (54, '110100', 'Quy Muội', 'Lôi Trạch Quy Muội', 'Đoài', 'Chấn', '["danh không chính", "lệch vai", "vội"]'::jsonb, 'Vào một vị trí không chính danh hoặc một quan hệ lệch thế.', 'Biết chỗ đứng thật của mình; cố tiến sẽ phải trả giá.'),
  (55, '101100', 'Phong', 'Lôi Hỏa Phong', 'Ly', 'Chấn', '["thịnh", "đỉnh", "chói"]'::jsonb, 'Đang lúc thịnh nhất — và mặt trời đứng bóng thì bắt đầu xế.', 'Tận dụng lúc sáng để làm việc phải làm; chuẩn bị cho lúc xế.'),
  (56, '001101', 'Lữ', 'Hỏa Sơn Lữ', 'Cấn', 'Ly', '["lữ khách", "tạm bợ", "xa nhà"]'::jsonb, 'Ở thế người đi đường: không gốc rễ, phải nhún nhường.', 'Giữ mình khiêm và gọn; đừng cư xử như chủ nhà.'),
  (57, '011011', 'Tốn', 'Thuần Tốn', 'Tốn', 'Tốn', '["thấm dần", "mềm mại", "thuyết phục"]'::jsonb, 'Như gió len vào từng khe, ảnh hưởng bằng sự mềm và bền.', 'Đi vào nhẹ nhàng và lặp lại; đừng cưỡng ép.'),
  (58, '110110', 'Đoài', 'Thuần Đoài', 'Đoài', 'Đoài', '["vui", "giao tiếp", "cởi mở"]'::jsonb, 'Niềm vui và trao đổi cởi mở, học được từ nhau.', 'Vui thật lòng thì lợi; nịnh nhau thì hại.'),
  (59, '010011', 'Hoán', 'Phong Thủy Hoán', 'Khảm', 'Tốn', '["tan ra", "giải tán", "khơi thông"]'::jsonb, 'Cái đang kết tụ bế tắc cần được làm cho tan.', 'Làm tan sự chia rẽ, rồi tụ lại quanh điều lớn hơn.'),
  (60, '110010', 'Tiết', 'Thủy Trạch Tiết', 'Đoài', 'Khảm', '["tiết chế", "giới hạn", "chừng mực"]'::jsonb, 'Cần một cái mức, một đường ranh cho vừa sức.', 'Đặt hạn hợp lý; khắt khe quá cũng không giữ được lâu.'),
  (61, '110011', 'Trung Phu', 'Phong Trạch Trung Phu', 'Đoài', 'Tốn', '["lòng thành", "tin cậy", "thật"]'::jsonb, 'Sự chân thành ở giữa là thứ thuyết phục được cả người khó tính.', 'Tin nhau bằng thực chất chứ đừng bằng lời hứa.'),
  (62, '001100', 'Tiểu Quá', 'Lôi Sơn Tiểu Quá', 'Cấn', 'Chấn', '["vượt nhỏ", "khiêm", "chi tiết"]'::jsonb, 'Chỉ nên vượt ở việc nhỏ; việc lớn thì chưa phải lúc.', 'Như chim bay thấp thì an, bay cao thì nguy.'),
  (63, '101010', 'Ký Tế', 'Thủy Hỏa Ký Tế', 'Ly', 'Khảm', '["đã xong", "hoàn tất", "dễ lơi"]'::jsonb, 'Mọi thứ đã vào chỗ, nhưng chính lúc xong là lúc dễ rệu.', 'Xong rồi vẫn phải giữ; cái hỏng thường bắt đầu từ chỗ yên.'),
  (64, '010101', 'Vị Tế', 'Hỏa Thủy Vị Tế', 'Khảm', 'Ly', '["chưa xong", "sắp tới", "dở dang"]'::jsonb, 'Gần tới đích mà chưa qua sông; còn một đoạn quyết định.', 'Cẩn thận đúng lúc cuối, như con cáo non lội sông ướt đuôi.')
on conflict (number) do update set
  lines = excluded.lines, name = excluded.name, full_name = excluded.full_name,
  lower_trigram = excluded.lower_trigram, upper_trigram = excluded.upper_trigram,
  keywords = excluded.keywords, meaning = excluded.meaning, advice = excluded.advice;
