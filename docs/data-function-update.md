# HÀ NHI FASHION — Cập nhật dữ liệu và chức năng

Hoàn thành ngày 19/10/2026. Chỉ chạy local, không gọi thanh toán/hãng vận chuyển thật, không push hoặc triển khai. Không xóa tệp, không reset database.

## Kết quả dữ liệu

Thêm đúng **1.000 đơn**, từ **01/01/2025 đến 19/10/2026**, **2.394 dòng sản phẩm**, **180 khách hàng tổng hợp**, **52 khoản hoàn**. Thanh toán: COD 725, chuyển khoản 219, tiền mặt 56; đây là các bản ghi nội bộ, không có chuyển tiền. Checkout hiện có vẫn dùng COD.

Trạng thái: hoàn tất 744, đã giao 105, hủy 95, hoàn về 30, xác nhận 8, đang xử lý 6, đang giao 6, giao thất bại 4, chờ xác nhận 2. Giá, màu và size lấy từ catalog hiện có; không tự xác minh hàng hóa, sửa giá hoặc tạo giá vốn.

`SyntheticBatch` / `SyntheticRecord` đánh dấu nguồn gốc nội bộ, liên kết các đơn, khách hàng và biến động kho. Các bảng thanh toán/giao nhận/hoàn tiền truy ngược qua đơn hàng. Liên kết đa hình trong `SyntheticRecord` được kiểm tra bằng script, không trình bày như khóa ngoại SQL. Mã kiện dùng `HN-SHIP-`, provider `LOCAL_MANUAL`. Khách hàng tổng hợp dùng email `.test`, bị vô hiệu hóa đăng nhập.

Script tạo lô chạy trong một transaction; chạy lại cùng mã lô không thêm bản ghi. Nhập bổ sung và trả nhà cung cấp trong lịch sử tổng hợp cân đối lượng giữ hàng, hủy, hàng hoàn bán lại. Kiểm tra phát lại lịch sử không âm, tồn cuối của mọi SKU bằng tồn trước cập nhật. Dữ liệu cũ được đối chiếu từng dòng/từng cột với bản sao lưu trước khi thay đổi: giữ nguyên.

## Chức năng

- Bỏ nhãn demo/mock/simulated trên giao diện; giữ nguyên model/trạng thái nội bộ và giới hạn không giao dịch thật.
- Đăng nhập mặc định: ADMIN → `/admin`, SELLER → `/seller`, BUYER → `/`. Đường dẫn quay lại hợp lệ vẫn được kiểm tra quyền; hệ RBAC cũ giữ nguyên.
- Dashboard: doanh số và số đơn hôm nay theo giờ Việt Nam; KPI theo bộ lọc; khách hàng, tồn kho, COD theo quyền; đơn gần đây. Biểu đồ chọn chỉ số, hỗ trợ chuột, chạm và bàn phím; bộ lọc ngày/sản phẩm/danh mục/trạng thái giữ nguyên. Tồn kho là số dư hiện tại; hai KPI hôm nay độc lập bộ lọc kỳ và có chú thích.
- Admin vào cửa hàng và quay lại quản lý bằng liên kết trên giao diện.
- Tra cứu mã hoặc ID: sản phẩm/biến thể/số lượng/giá, tên người nhận, thanh toán, giao nhận và tiến trình. Nhân viên cần `orders.read`; khách đăng nhập chỉ tra đơn của mình; khách chưa đăng nhập phải cung cấp số điện thoại khớp. Không trả địa chỉ, token, chứng từ hoặc sổ tài chính nội bộ trong API tra cứu.
- Nhập/xuất kho theo SKU, số lượng, ngày, nhà cung cấp, lý do, ghi chú. Kiểm tra quyền tại API và service, cập nhật nguyên tử, chống gửi trùng, chặn xuất quá tồn, ghi biến động và audit. Cả form chỉnh tồn cũ cũng kiểm tra số dư trước cập nhật để tránh ghi đè khi có thao tác đồng thời.
- Chính sách đổi trả lỗi trong **72 giờ** được giữ nguyên. Dữ liệu tổng hợp có cùng mốc giao nhận giữa đơn/kiện và hạn đổi trả; kiểm hàng trước nhập lại kho.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Unit | 87/87 đạt |
| Hồi quy tích hợp Phase 1–6 | 141/141 đạt |
| Browser E2E | 22/22 đạt |
| Responsive | 360, 390, 768, 1024, 1440px đạt; dashboard tương tác cũng kiểm tra tràn ngang |
| Service kho trên database riêng | Nhập/xuất, quyền khách, chặn âm, ngày/số lượng sai, idempotency và xuất đồng thời một lần thành công: đạt |
| TypeScript / ESLint / production build | Đạt |
| Dữ liệu chính | integrity_check=ok, foreign_key_check=0, dữ liệu cũ và tồn kho giữ nguyên |
| Sao lưu/phục hồi độc lập | Nội dung mọi bảng khớp, integrity=ok, FK=0 |
| Local smoke | Storefront, đăng nhập, tra cứu, Admin/Seller và API báo cáo được kiểm tra; API báo cáo từ chối người chưa đăng nhập |

Các test trình duyệt và tích hợp dùng database riêng. Một kiểm tra tích hợp ban đầu còn đòi nhãn `LOCAL_MANUAL` trên giao diện; đã đổi kỳ vọng sang tiêu đề tiếng Việt, giữ nguyên kiểm tra không lộ chứng từ và chạy lại đạt toàn bộ. Các kỳ vọng tên nút hoàn tiền và trang chuyển sau đăng nhập cũng cập nhật theo yêu cầu mới.

Chứng cứ: `verification/data-update/` (build.log, unit.log, integration.log, browser.log, inventory.log, data-validation.json, generator-validation.json, backup-restore.json). Database/bản sao lưu và thông tin đăng nhập nằm trong đường dẫn được git-ignore. Không xóa báo cáo hoặc mã nguồn cũ.

## Sơ đồ

- [Nghiệp vụ → Chức năng → Backend → SQL — PNG](diagrams/business-processes.png) · [Mermaid](diagrams/business-processes.mmd)
- [Quan hệ SQL/PK/FK chính — PNG](diagrams/sql-relationships.png) · [Mermaid đầy đủ các bảng](diagrams/sql-relationships.mmd)

PNG là bố cục tĩnh để đọc; Mermaid là nguồn có thể sửa và bao quát toàn bộ schema. Các đường SQL được sinh từ khóa ngoại thật của SQLite.

## Giới hạn còn giữ

Catalog vẫn có sản phẩm chưa được xác minh và một sản phẩm giá 0 (“Bộ Buzz”); không sửa hoặc đưa sản phẩm giá 0 vào dữ liệu đơn mới. Chưa có giá vốn được xác minh thì báo cáo lợi nhuận tiếp tục báo thiếu dữ liệu, không suy đoán. Dự án sẵn sàng trình diễn local với dữ liệu lịch sử; chưa chuyển thành hệ thống giao dịch thật.
