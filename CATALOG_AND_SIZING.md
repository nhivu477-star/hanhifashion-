> Cập nhật hiện tại: 11 thiết kế độc lập, 26 màu; 309 bản ghi trùng đã ẩn. Mỗi thiết kế một giá, ảnh chi tiết chỉ có trang phục. Xem `verification/BAO_CAO_NANG_CAP.md`. Số liệu 180/320 bên dưới mô tả dữ liệu seed/lịch sử.

> Trạng thái hiện tại (17/10/2026): 320 thiết kế, 1.130 màu, 6.780 biến thể. Các phần mô tả mốc 180 bên dưới là lịch sử đợt trước. Nâng cấp và xét duyệt ảnh theo README cùng `verification/BAO_CAO_NANG_CAP.md`; không mở bán thật các bản dựng nội bộ.

# Danh mục, phối đồ và tư vấn size — localhost

Đợt bổ sung ngày 17/10/2026 giữ nguyên cấu trúc trang chủ, menu, logo gốc, font và hệ màu đã duyệt. Không triển khai hoặc đẩy mã nguồn ra ngoài máy.

## Dữ liệu và nguồn minh họa

Danh mục mẫu có 180 thiết kế: 24 sơ mi, 22 áo kiểu, 18 vest/blazer, 25 quần, 25 chân váy, 30 đầm, 24 set và 12 len/cardigan. Có 621 màu thiết kế, 3.726 biến thể màu-size và 1.863 hình SVG tự vẽ bằng mã, theo đúng HEX của màu. Đây là bản vẽ minh họa trang phục, không phải ảnh chụp hay bằng chứng về cấu tạo, chất liệu hoặc độ chính xác màu của hàng thật. Mặt trước, góc đối diện và cận chi tiết là các góc của cùng bản vẽ, không thay thế bộ ảnh trước/sau thực tế. Ảnh chiến dịch đã có vẫn nằm ở vị trí biên tập trên trang chủ.

Tên, chất liệu, phom, chi tiết, thành phần set và hướng dẫn giặt là nội dung mẫu được cấu hình cho mục đích phát triển. Không có tỷ lệ thành phần, xuất xứ hoặc chứng nhận được xác minh. Trước khi bán thật, quản trị viên phải đối chiếu với hàng, nhãn chăm sóc, bộ ảnh được cấp quyền và bảng thông số đã xác nhận. Nguồn dữ liệu này được ghi trong tài liệu và trang quản trị, không chèn nhãn AI vào mô tả bán hàng.

Migration `colors_outfits_size_charts` bổ sung `ProductColor`, `ColorImage`, `OutfitCombination`, `OutfitItem`, `SizeChart`; liên kết biến thể bằng `colorId`. ID sản phẩm/biến thể, SKU cũ, giá, tồn kho, giỏ và ảnh snapshot đơn cũ được giữ; dữ liệu mẫu cũ được làm phong phú về nội dung/màu. Không xóa sản phẩm hoặc đơn. SKU cũ có thể chứa ký hiệu màu cũ: mã định danh được giữ để bảo toàn tham chiếu; tên/HEX màu lấy từ bản ghi hiện tại. Tên/URL slug cũ được giữ cho các sản phẩm sẵn có, nên URL có thể còn mô tả tên cũ.

`pnpm prisma db seed` bổ sung 80 thiết kế vào 100 mẫu ban đầu. `pnpm exec tsx scripts/enrich-catalog.ts` chạy riêng phần bổ sung; bản ghi đã nâng cấp được bỏ qua để giữ chỉnh sửa quản trị và tồn kho mới. Không dùng `scripts/link-demo-images.ts` trên danh mục này vì đó là tiện ích gán ảnh đời cũ. `pnpm exec tsx scripts/audit-catalog.ts` kiểm tra số lượng, liên kết, tệp ảnh/HEX và khóa ngoại. Khi cập nhật schema, chạy migration/generate và khởi động lại Next để thay Prisma client được lưu trong bộ nhớ.

## Chọn màu và phối đồ

Màu đang chọn dùng chung state giữa thư viện ảnh, chọn size và gợi ý phối. Mỗi mẫu có 2–5 màu, mỗi màu 2–3 liên kết phối theo nguyên tắc hài hòa, món bán riêng cùng sản phẩm hiện tại tạo thành một kết hợp. Dữ liệu ban đầu có 1.863 gợi ý. Mỗi gợi ý liên kết một món bổ sung; mô hình dữ liệu hỗ trợ nhiều món, trình quản trị hiện chỉnh từng gợi ý một món. Không có hotspot vì bản vẽ sản phẩm không phải ảnh Shop the Look.

Các gợi ý loại món ngừng hoạt động, danh mục ngừng hoạt động, màu không có ảnh hoặc hết hàng. URL `?mau=<id>` mở đúng màu sản phẩm đích. Giá lấy trực tiếp từ DB. Ảnh giỏ hàng và ảnh lưu trong đơn mới lấy đúng màu; không thay ảnh lịch sử đơn đã đặt. Khi màu mới chưa có ảnh hoặc ảnh lỗi, hiển thị ô “Hình ảnh màu này đang cập nhật”, không mượn ảnh màu khác.

Trong trang sửa sản phẩm, phần “Màu sắc, hình ảnh & phối đồ” cho thêm/sửa tên, HEX, thứ tự, tải ảnh và danh sách ảnh từng màu (dòng đầu là ảnh chính), liên kết/xóa gợi ý phối. Ảnh toàn sản phẩm dùng cho thẻ được đồng bộ từ màu có thứ tự thấp nhất khi lưu màu. Sau khi thêm màu, thêm biến thể và tồn kho tại phần “Biến thể & tồn kho”. Đổi tên/HEX của màu cập nhật đồng bộ biến thể nhưng giữ ID/SKU/tồn kho.

## Tư vấn size và quyền riêng tư

`src/lib/sizing.ts` chứa thuật toán xác định và schema validation. Không có mô hình AI, không suy diễn số đo cơ thể từ BMI. Khi chỉ có chiều cao/cân nặng, dò ma trận khoảng chiều cao/cân nặng trong DB. Các khoảng giao nhau tạo kết quả hai size. Không có ô ma trận phù hợp thì dẫn tới bảng size, không ngoại suy.

Có số đo tùy chọn: áo/len ưu tiên ngực; quần/váy ưu tiên eo và mông; đầm/set xét ba vòng, phom slim tăng trọng số eo. Các khoảng ngoài phạm vi bảng không cho kết quả thiếu căn cứ. Số đo mâu thuẫn trả hai size hoặc đề nghị đối chiếu nếu phân tán hơn. Dung sai co giãn chỉ áp dụng khi quản trị đánh dấu đã xác minh (tối đa 3 cm). Với phom regular/relaxed/oversized, bảng riêng của sản phẩm biểu diễn khoảng phù hợp; hệ thống không tự giảm size dựa trên nhãn oversized khi chưa có thông số xác nhận. Không cam kết vừa tuyệt đối.

Bảng theo danh mục, ghi đè theo sản phẩm, nằm trong `SizeChart`. Cấu hình ban đầu là khoảng cơ thể tham khảo cho dữ liệu mẫu, không phải số đo thành phẩm được đo thật. Chỉ thêm chiều dài, tay, vai, dài trong ống khi có dữ liệu. Quản trị chỉnh bảng và ma trận bằng JSON có kiểm tra kiểu, khoảng tăng dần, size duy nhất và ma trận dùng size có trong bảng. Ghi đè riêng được ưu tiên; có thể bỏ ghi đè để kế thừa. Hỗ trợ XS–XXL và Free size. Set hiện bán chung một size, chưa hỗ trợ size độc lập từng thành phần; lưu ý này xuất hiện trong bảng và trang quản trị.

Size tốt nhất hết hàng vẫn được giải thích là hết hàng, không âm thầm thay bằng size khác. Chỉ nút chọn size còn hàng cập nhật selector thực; không tự thêm giỏ. Số đo chỉ tồn tại trong input/state trình duyệt; không API, tài khoản, localStorage, sessionStorage, URL hoặc analytics. Đóng cửa sổ bằng nút, Esc hay nền sẽ xóa số đo. Hộp thoại native hỗ trợ bàn phím, khóa focus trong dialog và trả focus sau khi đóng.

## Kiểm tra

- `pnpm test`: kiểm thử thương mại và thuật toán tư vấn.
- `pnpm test:e2e`: chỉ dựng lại `prisma/test.db`, không reset `prisma/dev.db`; kiểm thử cũ và các trường hợp 32–39 bổ sung.
- `pnpm build`: bản build riêng `.next-production`, không trộn với server dev và test.

Kết quả lần bàn giao được cập nhật trong `BAO_CAO_BAN_GIAO.md` và log `verification/catalog-*`.
