# Phạm vi chức năng quản trị cửa hàng

Đối chiếu ban đầu ngày 19/10/2026, cập nhật triển khai ngày 20/10/2026. Trạng thái kiểm chứng tại [business-acceptance-report.md](business-acceptance-report.md); tiêu chuẩn theo cửa hàng tại [business-acceptance-31.md](business-acceptance-31.md).

| Phân hệ | Yêu cầu | Hiện trạng |
| --- | --- | --- |
| Tổng quan | Doanh thu hôm nay, số đơn, chờ xử lý, hoàn tất, khách hàng, hàng sắp hết; biểu đồ doanh thu và trạng thái đơn | Đã có dữ liệu/chức năng. Theo bố cục vừa duyệt, Tổng quan hiện chỉ có doanh thu và số đơn; các KPI nghiệp vụ ở trang tương ứng. Giữ bố cục đã duyệt, không tự chuyển lại sáu KPI. |
| Sản phẩm | Thêm, sửa, ẩn/xóa mềm; giá, ảnh, size, màu, SKU, danh mục, bộ sưu tập | Có quản lý sản phẩm, biến thể và trạng thái hoạt động; quyền lưu trữ được kiểm tra ở backend. |
| Kho hàng | Form nhập/xuất, tồn SKU, điều chỉnh, lịch sử | Có nhập/xuất, movement, phiếu kiểm kê gửi/duyệt, chặn ghi đè tồn phát sinh và cách ly hàng hỏng. |
| Đơn hàng | Tìm mã, chi tiết, xác nhận/từ chối, đóng gói, giao hàng, hủy | Có quy trình trạng thái, phân quyền, checklist đóng gói trước bàn giao, phân công và ưu tiên. |
| Vận chuyển & COD | Vận đơn nội bộ, tiến trình giao, thu tiền, đối soát | Đã có quy trình nội bộ. |
| Đổi trả & hoàn tiền | Điều kiện 72 giờ hàng lỗi, duyệt/từ chối, kiểm hàng, đổi SKU, hoàn tiền | Đã có quy trình và quy tắc 72 giờ; hoàn tiền hiện xử lý nội bộ trong bản local. |
| Khách hàng | Hồ sơ, lịch sử mua, đơn hàng, hỗ trợ, khóa/mở | Có danh sách, tổng số đơn, tổng đã trả, khóa/mở. Đã có hồ sơ riêng, lịch sử mua, đổi trả và hỗ trợ liên kết theo userId. |
| Khuyến mãi | Thêm/sửa/vô hiệu voucher, mức giảm, thời gian, lượt dùng | Có mức giảm, hạn hết hiệu lực, giới hạn lượt; đã có start/end hiệu lực giờ Việt Nam, giới hạn không thấp hơn lượt đã dùng. |
| Báo cáo | Doanh thu, lợi nhuận, đơn, tồn, khách; lọc thời gian, Excel/CSV | Có báo cáo, phân quyền, bộ lọc và CSV. Đã có Excel .xlsx dạng stream, kiểm quyền cùng scope với CSV. |
| Nhân viên | Tạo tài khoản, ADMIN/SELLER/CUSTOMER, khóa, nhật ký | Có quản lý tài khoản, hệ thống quyền và nhật ký; chỉ dùng đúng ba vai trò CUSTOMER, SELLER, ADMIN. |
| Cài đặt | Thông tin cửa hàng, ngôn ngữ, tiền tệ, chính sách bán/đổi trả | Có thông tin cửa hàng, tùy chọn ngôn ngữ/tiền tệ. Đã có hướng dẫn chính sách bổ sung trong quản trị và trang công khai; không thay rule lỗi 72 giờ. |

## Tiêu chí hoàn thiện

- Các trang dùng chung kiểu chữ, khoảng cách, bộ lọc, bảng, trạng thái và thông báo kết quả hiện tại.
- Mọi thao tác ghi và xuất dữ liệu phải kiểm tra quyền ở backend.
- Không thay đổi dữ liệu lịch sử hoặc các quy tắc tồn kho, COD và đổi trả khi chỉnh giao diện.
- Phân hệ khách hàng cần chỉ hiển thị dữ liệu hỗ trợ thực sự liên kết được với khách, không tự ghép tùy tiện.
- Excel cần giữ kiểu số/ngày, dữ liệu lọc và quyền truy cập tương đương CSV.
- Nội dung chính sách hiển thị và quy tắc thực thi 72 giờ cần nhất quán.
- Nghiệm thu bằng thao tác thực tế trên cơ sở dữ liệu thử nghiệm riêng, không reset dữ liệu hiện tại.
