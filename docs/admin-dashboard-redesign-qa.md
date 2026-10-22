# QA — Dashboard quản trị

Ngày: 19/10/2026. Chỉ chạy localhost; không triển khai, đẩy GitHub hoặc kết nối dịch vụ thật.

## Thay đổi

- Shell quản trị riêng: sidebar desktop 250px, bốn nhóm chức năng, menu thu gọn trên tablet/mobile; giữ logo gốc. Giữ các chức năng và điều kiện RBAC hiện có.
- Header tìm chức năng quản trị, liên kết cửa hàng, thông báo số đơn chờ xử lý từ SQLite, tài khoản cá nhân.
- Tổng quan: sáu KPI và biểu đồ doanh thu/trạng thái 3:1; biểu đồ ngày/tháng, tooltip bằng chuột, chạm và bàn phím. Nhóm trạng thái khác giữ các đơn giao lỗi/hoàn về để tổng đơn không bị thiếu.
- Bỏ mục Kỳ; dùng ngày bắt đầu/kết thúc, danh mục, sản phẩm, trạng thái, SKU và sắp xếp. Giữ bộ lọc khi đổi tab; bỏ các bộ lọc không được backend hỗ trợ khi vào phễu/giỏ bỏ dở.
- Tổng quan không còn sản phẩm bán chạy, đơn gần đây, tác vụ/cảnh báo. Báo cáo và xuất CSV nằm trong mục riêng; giữ các báo cáo giỏ bỏ dở, nguồn tiếp cận và báo cáo khác qua sidebar.
- Không thay đổi schema, dữ liệu sản phẩm/đơn hàng/tồn kho hoặc quy tắc giao nhận, thanh toán, hoàn tiền.

## Cách tính

Doanh thu hôm nay tái sử dụng sổ phân bổ giảm giá/hoàn tiền hiện có: hàng ròng của đơn tạo hôm nay theo giờ Việt Nam và đã giao/hoàn tất; không gồm phí vận chuyển. Hai KPI hôm nay độc lập bộ lọc và so sánh hôm qua. Chờ xử lý, hoàn tất, khách đã đặt hàng dùng phạm vi bộ lọc và so sánh khoảng trước có cùng độ dài. Sản phẩm sắp hết là sản phẩm đang hoạt động có ít nhất một biến thể dưới 5, áp dụng bộ lọc sản phẩm/danh mục/SKU, không có lịch sử để tạo tỷ lệ tăng giảm. Sắp xếp áp dụng bảng chi tiết/báo cáo; biểu đồ thời gian giữ thứ tự ngày. Các số tiền dashboard giữ VND, thống nhất với báo cáo.

## Kết quả

- 92/92 unit tests đạt.
- 4/4 browser E2E có liên quan đạt trên database bản sao riêng: KPI, tổng đơn, ngày/trạng thái/danh mục/sản phẩm, chuyển tab, biểu đồ và tooltip, CSV, menu mobile, tìm chức năng, chuyển qua lại cửa hàng, Seller/Buyer bị chặn đúng quyền, giao diện tiếng Anh.
- Responsive 360, 390, 768, 1024, 1440px: không tràn ngang. 1440px: tỷ lệ chiều rộng biểu đồ 3:1.
- TypeScript, ESLint toàn dự án và production build đạt. Không có pageerror trong bài kiểm tra dashboard.
- Backup/restore database kiểm thử: integrity_check=ok, không có lỗi FK, tất cả bảng/nội dung khớp sau restore.

Ảnh chụp và log: `verification/admin-redesign/`. Chưa có ảnh tham chiếu được đính kèm trong yêu cầu này; giao diện được thực hiện theo thông số mô tả, chưa khẳng định đối chiếu pixel với ảnh duyệt.
