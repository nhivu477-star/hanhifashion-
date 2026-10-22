# Giao diện quản trị thống nhất — QA

19/10/2026. Phát triển và kiểm thử chỉ tại localhost.

## Giao diện cuối

- Giữ Tổng quan làm chuẩn: hai KPI hôm nay, chừa hai cột trên desktop cho chức năng tương lai; không thêm chức năng giả. Không còn dải tab, bộ lọc hoặc liên kết xuất dữ liệu tại Tổng quan.
- Đường doanh thu dạng cong đơn điệu, đi qua điểm thật và không vượt giá trị cực trị giữa các điểm. Tooltip dd/mm/yyyy và tiền tách hàng nghìn; trục ngày có hai đầu phạm vi và mốc 5 ngày theo lịch. Trục tiền có bước làm tròn và tên đơn vị.
- Trạng thái đơn theo ngày tạo đơn được chọn, hiển thị trạng thái hiện tại của các đơn đó; không tự tạo dữ liệu trạng thái lịch sử. Mặc định ngày Việt Nam hiện tại.
- KPI chờ xử lý/hoàn tất tại Đơn hàng; khách mua trong kỳ tại Khách hàng; sản phẩm sắp hết tại Sản phẩm. Chỉ số kỳ dùng 30 ngày, độc lập bộ lọc danh sách và có chú thích rõ.
- Bộ lọc chi tiết, chọn loại báo cáo và CSV ở Báo cáo. Các báo cáo cũ vẫn có đường dẫn trong sidebar và giữ RBAC.
- Các trang vận hành dùng cùng font Arial/Helvetica, thang chữ, mô tả trang, breadcrumb, form/nút 40px, bảng trắng và nhãn trạng thái. Form sản phẩm bỏ viền lồng dư; bảng cuộn ngang trên điện thoại và giữ mã đơn một dòng.
- Banner cửa hàng tĩnh: Ers quay trái bằng góc ảnh có sẵn, Erros giữa, Awak phải; không có parallax/hover dịch chuyển. Ba mẫu sát hơn. Header căn theo chân chữ và biểu tượng.

## Kiểm thử

- 96/96 unit tests; 5/5 E2E đạt trên database bản sao riêng.
- Smoke 18 mục: đơn, sản phẩm, khách, kho, giao nhận/COD, đổi trả, ảnh, danh mục, bộ sưu tập, nhân viên, tài khoản, quyền, nhật ký, ưu đãi, banner, cài đặt, liên hệ và báo cáo. Kiểm tra thêm chi tiết đơn và form tạo sản phẩm.
- Responsive 360/390/768/1024/1440px ở các trang đại diện; không tràn ngang toàn trang. Bảng dài cuộn bên trong khung.
- Bộ lọc ngày/trạng thái/loại báo cáo, xuất CSV, lựa chọn ngày donut, tooltip, điều hướng mobile, chuyển cửa hàng/quản trị và giới hạn Seller/Buyer đạt. Không có pageerror trong các bài dashboard và giao diện chung.
- TypeScript, ESLint toàn dự án, production build đạt.
- Database kiểm thử backup/restore: integrity_check=ok, không lỗi FK, tất cả bảng và nội dung khớp sau phục hồi.

Không reset, migrate hoặc sửa sản phẩm/đơn/tồn kho của database chính. Không đổi API nghiệp vụ, quyền hoặc tích hợp dịch vụ ngoài. Không push/deploy.

Bằng chứng: `verification/admin-unified/`, `verification/admin-redesign/refined-verified.json` và `verification/ui-consistency/static-final.json`.

## Cập nhật KPI tháng và danh mục LSOUL

- Đơn hàng có bốn thẻ theo thứ tự: Tổng đơn của tháng, Đơn hoàn tất, Chờ xử lý, Đơn hoàn/hủy. Tính từ đầu tháng hiện tại đến hết ngày hôm nay theo giờ Việt Nam. Hoàn tất gồm DELIVERED/COMPLETED; chờ xử lý là PENDING; hoàn/hủy là RETURNED/CANCELLED. Không tự thay đổi trạng thái đơn hay tính lại tiền.
- Bỏ các đoạn diễn giải kỳ thống kê dưới KPI, chú thích dài của biểu đồ và phần cách tính trên Tổng quan; giữ cảnh báo chất lượng dữ liệu quan trọng trong Báo cáo. Thẻ màu xanh dương/xanh lá/cam/đỏ, thứ tự không đổi trên mobile.
- Theo yêu cầu xóa sản phẩm ngoài LSOUL: sao lưu SQLite trước khi thực hiện, xóa 320 sản phẩm không có quan hệ đơn hàng/giá vốn/nhập xuất/đổi hàng và 3.728 bản ghi ảnh không còn thuộc danh mục. Không xóa tệp ảnh trên ổ đĩa. Còn 235 sản phẩm và 1.147 bản ghi ảnh LSOUL. Logo hiển thị vẫn dùng tệp gốc.
- Sản phẩm LSOUL, biến thể và ảnh gắn sản phẩm được đối chiếu trước/sau, không thay đổi. Đối chiếu toàn bộ 19 bảng nghiệp vụ/lịch sử với bản sao lưu cho kết quả nguyên vẹn; integrity_check=ok, không lỗi FK. Có audit log cho thao tác dọn danh mục.
- 96 unit tests và 5 E2E đạt; E2E đối chiếu độc lập bốn con số tháng với SQLite, kiểm tra thứ tự, các trang quản lý, responsive và RBAC. TypeScript, ESLint và production build đạt.
- Bằng chứng dọn dữ liệu: `verification/catalog-cleanup/results.json` và `history-preservation.json`; bản sao lưu ở thư mục git-ignored `verification/backups/catalog-lsoul/`.
