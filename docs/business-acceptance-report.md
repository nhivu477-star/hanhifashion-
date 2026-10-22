# Kết quả nghiệm thu nghiệp vụ HÀ NHI

Cập nhật: 2026-10-19T17:12:06.047Z. Word là mẫu quy trình; bộ chuẩn thực thi tại [31 Use Case](business-acceptance-31.md) và [dữ liệu tiêu chí](business-acceptance-31.json).

## Phạm vi đã kiểm

**31/31 PASS, 0 FAIL** trong phạm vi local đã điều chỉnh cho cửa hàng; 186 nhóm tiêu chí main/alternative/exception/permission/integrity/UI–API–DB. Các nhánh chưa có chính sách hoặc ngoài phạm vi được ghi riêng là BLOCKED, không tính thành nghiệp vụ đã triển khai.

- Unit: 120 PASS.
- API/integration/concurrency/fault injection/regression: 199 PASS.
- E2E trình duyệt: 34 PASS; kiểm tra responsive 360/390/768/1024/1440px và thao tác form thật.
- TypeScript, ESLint và production build: PASS; build CkvRgMmlweEkuAh4Xv0Dp.
- Main: lịch sử nghiệp vụ giữ nguyên; integrity/FK: PASS. Hoạt động duyệt trang có thể cập nhật VisitorSession/AnalyticsEvent, được tách khỏi đối chiếu lịch sử nghiệp vụ.

## Thay đổi chính

- Receipt giỏ độc lập analytics; kiểm payload key checkout, giới hạn lượng, báo lỗi khoảng giá và giỏ clear scoped theo người dùng. Giữ màu/size/lượng khi quay lại sau đăng nhập.
- Giao dịch DB và audit atomic cho catalog, voucher, cài đặt, hồ sơ/địa chỉ, nhân viên và các nghiệp vụ tồn/tiền; lỗi ghi audit rollback đã được chủ động kiểm thử.
- Checklist SKU/màu/size/lượng, tạm dừng đóng gói, packedAt/packedBy trước bàn giao; phân công và ưu tiên đơn.
- Phiếu kiểm kê nháp/gửi/duyệt/hủy, so tồn trước–sau; chặn kiểm kê cũ ghi đè giao dịch mới; tách hàng hỏng khỏi tồn bán được.
- Đánh giá xác minh đơn đã nhận, trả lời/kiểm duyệt có lịch sử; hỗ trợ theo tài khoản và phản hồi đúng khách. SELLER chỉ được bổ sung quyền hỗ trợ phi tài chính.
- Hồ sơ khách, địa chỉ mặc định, lịch sử mua/hỗ trợ; start/end voucher giờ VN; Excel .xlsx thật cùng scope/quyền với CSV; hướng dẫn chính sách bổ sung giữ rule lỗi 72 giờ.
- Sửa khôi phục mật khẩu local và cập nhật mật khẩu/thu hồi phiên atomic; đăng nhập thành công không bị tính thành chuỗi đăng nhập sai.

## Ma trận 31 Use Case

| Use Case | Nghiệp vụ | Trạng thái |
|---|---|---|
| UC01 | Đăng ký tài khoản | PASS |
| UC02 | Đăng nhập và xác thực | PASS |
| UC03 | Quản lý thông tin cá nhân | PASS |
| UC04 | Xem danh sách sản phẩm | PASS |
| UC05 | Tìm kiếm và lọc sản phẩm | PASS |
| UC06 | Xem chi tiết sản phẩm | PASS |
| UC07 | Thêm sản phẩm vào giỏ hàng | PASS |
| UC08 | Quản lý giỏ hàng | PASS |
| UC09 | Đặt hàng | PASS |
| UC10 | Thanh toán và COD | PASS |
| UC11 | Theo dõi đơn hàng | PASS |
| UC12 | Hủy đơn hàng | PASS |
| UC13 | Xem và tiếp nhận đơn mới | PASS |
| UC14 | Xác nhận đơn hàng | PASS |
| UC15 | Đóng gói sản phẩm | PASS |
| UC16 | Cập nhật giao hàng | PASS |
| UC17 | Kiểm tra, nhập và xuất kho | PASS |
| UC18 | Đánh giá và hỗ trợ khách hàng | PASS |
| UC19 | Quản lý người dùng | PASS |
| UC20 | Quản lý nhân viên và phân quyền | PASS |
| UC21 | Quản lý sản phẩm | PASS |
| UC22 | Quản lý danh mục | PASS |
| UC23 | Quản lý khuyến mãi | PASS |
| UC24 | Quản lý đơn hàng | PASS |
| UC25 | Báo cáo thống kê | PASS |
| UC26 | Đổi trả sản phẩm | PASS |
| UC27 | Hoàn tiền | PASS |
| UC28 | Đối soát COD | PASS |
| UC29 | Kiểm kê và xử lý chênh lệch kho | PASS |
| UC30 | Ngôn ngữ, khu vực và tiền tệ | PASS |
| UC31 | Nhật ký và kiểm soát vận hành | PASS |

## BLOCKED và giới hạn còn lại

- **POLICY-PARTIAL-CANCEL:** Chưa có chính sách tài chính hủy một phần được chủ cửa hàng phê duyệt. Database chính không có approval, API từ chối và UI ẩn. Ca positive chỉ dùng policy fixture trong DB thử nghiệm. Chốt từ chối an toàn đã kiểm: PASS.
- **POLICY-EXCHANGE-PRICE-DIFFERENCE:** Chưa có quy tắc bù chênh lệch giá khi đổi SKU. Engine chỉ chấp nhận cùng đơn giá lịch sử; không tự thu/hoàn phần chênh. Chốt từ chối an toàn đã kiểm: PASS.
- **LIVE-PAYMENT-CARRIER:** Ngoài phạm vi: PROJECT_SPEC cấm kết nối tiền/hãng vận chuyển thật. Kết quả kiểm thử là local, không chứng nhận giao dịch production. Chốt từ chối an toàn đã kiểm: PASS.
- **MERCHANDISE-COMMERCIAL-VERIFICATION:** Ảnh hàng thật, quyền sử dụng, nguồn tồn và giá vốn cần chủ cửa hàng xác minh; không dùng dữ liệu demo để tự xác nhận. Chốt từ chối an toàn đã kiểm: PASS.

Đã kiểm trên SQLite local và database thử nghiệm riêng; kết quả không chứng minh tải production nhiều instance, tính hợp pháp của nguồn hàng/ảnh, tiền thật hoặc vận chuyển thật. Không reset main, không push/deploy.

## Bằng chứng và tái chạy

- `npm run test:business`: tạo DB thử riêng, migrate, production build, toàn bộ API/integration và BA-* (bao gồm concurrency và fault injection).
- `npx tsx scripts/run-final-uat-browser.ts`: clone main thành DB riêng, E2E và kiểm backup/restore.
- `npm test`, `npm run lint`, `npx tsc --noEmit`.
- `verification/business-acceptance/acceptance-results.json`: từng nhóm tiêu chí và bằng chứng theo tên bài kiểm thử, kiểm gate và database.
- `verification/business-acceptance/integration-final.log`, `e2e.log`, `unit-results.json`, `data-preservation.json`: kết quả thực thi.
