# Danh mục, phối đồ và tư vấn size — localhost

Danh mục và thông tin dưới đây là yêu cầu vận hành local. Số lượng sản phẩm/màu/biến thể thay đổi theo DB; không dùng thống kê seed hoặc đợt bàn giao cũ làm hiện trạng. Không reset/seed DB chính.

## Dữ liệu và nguồn minh họa

Ảnh/bản vẽ minh họa, mô tả chất liệu, phom và hướng dẫn chăm sóc chưa được đối chiếu hàng thật không phải bằng chứng về cấu tạo, màu hay giấy phép thương mại. Trước mở bán cần xác minh hàng, nhãn chăm sóc, ảnh được cấp quyền, tồn thực tế và bảng size. Giữ nguồn ảnh tại [THIRD_PARTY_IMAGES.md](THIRD_PARTY_IMAGES.md).

`ProductColor`, `ColorImage`, `OutfitCombination`, `OutfitItem`, `SizeChart` liên kết màu/ảnh/phối/size; biến thể tham chiếu colorId. Giữ ID/SKU và snapshot giá/ảnh của đơn cũ. Tên/HEX màu hiện tại có thể khác ký hiệu trong SKU cũ; không đổi mã lịch sử để làm đẹp.

## Chọn màu và phối đồ

Màu chọn dùng chung state giữa gallery, size và gợi ý phối. Gợi ý liên kết món bổ sung bán riêng, có nguyên tắc phối màu rõ ràng; không coi ảnh minh họa là hotspot Shop the Look hay cam kết hàng thật.

Các gợi ý loại món ngừng hoạt động, danh mục ngừng hoạt động, màu không có ảnh hoặc hết hàng. URL `?mau=<id>` mở đúng màu sản phẩm đích. Giá lấy trực tiếp từ DB. Ảnh giỏ hàng và ảnh lưu trong đơn mới lấy đúng màu; không thay ảnh lịch sử đơn đã đặt. Khi màu mới chưa có ảnh hoặc ảnh lỗi, hiển thị ô “Hình ảnh màu này đang cập nhật”, không mượn ảnh màu khác.

Trong trang sửa sản phẩm, phần “Màu sắc, hình ảnh & phối đồ” cho thêm/sửa tên, HEX, thứ tự, tải ảnh và danh sách ảnh từng màu (dòng đầu là ảnh chính), liên kết/xóa gợi ý phối. Ảnh toàn sản phẩm dùng cho thẻ được đồng bộ từ màu có thứ tự thấp nhất khi lưu màu. Sau khi thêm màu, thêm biến thể và tồn kho tại phần “Biến thể & tồn kho”. Đổi tên/HEX của màu cập nhật đồng bộ biến thể nhưng giữ ID/SKU/tồn kho.

## Tư vấn size và quyền riêng tư

`src/lib/sizing.ts` chứa thuật toán xác định và schema validation. Không có mô hình AI, không suy diễn số đo cơ thể từ BMI. Khi chỉ có chiều cao/cân nặng, dò ma trận khoảng chiều cao/cân nặng trong DB. Các khoảng giao nhau tạo kết quả hai size. Không có ô ma trận phù hợp thì dẫn tới bảng size, không ngoại suy.

Có số đo tùy chọn: áo/len ưu tiên ngực; quần/váy ưu tiên eo và mông; đầm/set xét ba vòng, phom slim tăng trọng số eo. Các khoảng ngoài phạm vi bảng không cho kết quả thiếu căn cứ. Số đo mâu thuẫn trả hai size hoặc đề nghị đối chiếu nếu phân tán hơn. Dung sai co giãn chỉ áp dụng khi quản trị đánh dấu đã xác minh (tối đa 3 cm). Với phom regular/relaxed/oversized, bảng riêng của sản phẩm biểu diễn khoảng phù hợp; hệ thống không tự giảm size dựa trên nhãn oversized khi chưa có thông số xác nhận. Không cam kết vừa tuyệt đối.

Bảng theo danh mục, ghi đè theo sản phẩm, nằm trong `SizeChart`. Cấu hình ban đầu là khoảng cơ thể tham khảo cho dữ liệu mẫu, không phải số đo thành phẩm được đo thật. Chỉ thêm chiều dài, tay, vai, dài trong ống khi có dữ liệu. Quản trị chỉnh bảng và ma trận bằng JSON có kiểm tra kiểu, khoảng tăng dần, size duy nhất và ma trận dùng size có trong bảng. Ghi đè riêng được ưu tiên; có thể bỏ ghi đè để kế thừa. Hỗ trợ XS–XXL và Free size. Set hiện bán chung một size, chưa hỗ trợ size độc lập từng thành phần; lưu ý này xuất hiện trong bảng và trang quản trị.

Size tốt nhất hết hàng vẫn được giải thích là hết hàng, không âm thầm thay bằng size khác. Chỉ nút chọn size còn hàng cập nhật selector thực; không tự thêm giỏ. Số đo chỉ tồn tại trong input/state trình duyệt; không API, tài khoản, localStorage, sessionStorage, URL hoặc analytics. Đóng cửa sổ bằng nút, Esc hay nền sẽ xóa số đo. Hộp thoại native hỗ trợ bàn phím, khóa focus trong dialog và trả focus sau khi đóng.

## Nghiệm thu

Kiểm màu/gallery, URL màu đích, fallback không mượn màu khác, giá snapshot, quản trị và thuật toán size/quyền riêng tư trên DB thử riêng. Các lệnh `npm test`, `npm run test:catalog`, `npm run test:e2e` và `npm run build` không phải kết quả đã chạy. Xem [báo cáo nghiệm thu](docs/business-acceptance-report.md) để phân biệt bằng chứng lịch sử với kiểm tra hiện hành chưa chạy.
