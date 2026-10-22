# Phase 6 — QA report (local demo)

## Phạm vi và dữ liệu

Đã audit schema, dashboard, API và tài liệu Phase 1–5 trước khi thay đổi. SQLite chính ban đầu có 46 bảng, 555 sản phẩm, không có đơn hàng; báo cáo cũ tải toàn bộ đơn và chỉ xem tiền COD đã đối soát/đơn PAID. Có sẵn transaction, payment giả lập, Shipment/COD ledger, return/refund, inventory movement và audit. Không có event lịch sử, attribution, giá vốn, hay báo cáo analytics riêng. Quy tắc sản phẩm đang có là 554 `NEEDS REVIEW`, 1 `INVALID`; catalog không được tự chỉnh.

## Cài đặt

Migration local cộng sáu bảng analytics và index; schema cũ không đổi cột. SQLite có 46 bảng nghiệp vụ ban đầu; sau migration, cả 46/46 bảng cũ giữ nguyên hash, sáu bảng analytics được thêm và Prisma ghi thêm bảng metadata migration. SQLite `integrity_check=ok`, `foreign_key_check=0`. Backup cô lập trước triển khai và khôi phục thử đã xác minh trong `verification/phase6-backup-before.json`; đối chiếu sau migration ở `verification/phase6-preservation-after.json`. Event tracking dùng SQLite first-party, không kết nối hãng vận chuyển, thanh toán thật, quảng cáo hay nền tảng analytics.

## Nghiệp vụ và giao diện

Đã triển khai mười một mục báo cáo: tổng quan, doanh số, sản phẩm, khách hàng, funnel, giỏ bỏ dở, tồn, lợi nhuận, attribution, COD, và đối chiếu. Có khoảng ngày VN, category/product/status/search/sort/pagination ở báo cáo giao dịch; ngưỡng bỏ giỏ 1–720 giờ; KPI, SVG chart, bảng, empty/error state và CSV streaming. CSV chỉ xuất khi có quyền export. Bộ lọc phiên/giỏ chỉ nhận ngày, sort và inactivity vì không có khóa category/order trong sự kiện; UI không gửi những bộ lọc không hỗ trợ.

Tăng giỏ và checkout yêu cầu đăng nhập. API ghi attempt trước kiểm tra auth, success sau cập nhật giỏ trong transaction. Sau login, chuyển lại trang sản phẩm an toàn để khách tự thêm lại. Session 30 phút first-party; không lưu IP, user-agent, thông tin liên hệ, token đăng nhập hay truy vấn tìm kiếm. UTM first-touch chỉ nhận campaign tag không chứa URL/email/điện thoại. Cookie `hn_analytics=off` tắt tracking. Chưa thu được session lịch sử nên funnel ban đầu để trống.

## Công thức và giới hạn

Chỉ đơn DELIVERED/COMPLETED là hàng đã giao. Hàng gộp trừ giảm giá phân bổ chính xác và refund mô phỏng đã hoàn tất; phí vận chuyển tách riêng. COD chưa thu không phải doanh thu tiền mặt; tiền chuyển COD không cộng lại doanh thu. Đơn được lọc theo ngày tạo và trạng thái hiện tại, nên đây là cohort đơn chứ không phải dòng tiền theo ngày thu.

Giá vốn thiếu để NULL; lãi toàn kỳ chỉ hiện khi độ phủ giá vốn 100%. Giá vốn đơn mới không gán ngược lịch sử; sửa nguồn lịch sử cần quyền cost và audit. Tồn chỉ đọc; sell-through chưa tính khi không có baseline tồn/nhập đã xác minh. Giá trị tồn chỉ tính đơn vị và hàng hóa đã xác minh cùng giá vốn biết trước. Sản phẩm cần rà soát giữ nguyên; số live theo cùng quality service: 554 NEEDS REVIEW và 1 INVALID.

## Kiểm thử

- Unit: `npm test` — **82 passed** (10 files), gồm timezone, date bounds, UTM privacy, CSV injection, quyền.
- Integration: `npm run test:phase6` chạy DB/file riêng, migration mới, hồi quy Phase 1–5 và 33 kiểm tra Phase 6. **141/141** dòng kiểm thử toàn chuỗi đều PASS; không có FAIL. Chi tiết ở `verification/phase6-results.json` và `verification/phase6-integration.log`.
- Dataset: 1.000 đơn giả lập chỉ trong DB thử nghiệm. Đo thời gian từng báo cáo, pagination và query plan ở `verification/phase6-performance.json`; truy vấn đơn dùng `Order_status_createdAt_idx`. Báo cáo trong fixture 1.000 đơn hoàn tất dưới 20 ms mỗi mục trên máy này. Export trả từng trang 250 dòng.
- Trình duyệt local: đã mở `/admin/phan-tich/products`, thấy readiness 554/1 và 20 dòng trang hiện tại; ảnh `verification/phase6-admin-products.png`. Trang overview cho thấy 0 đơn và trạng thái thiếu dữ liệu thay vì số liệu mẫu.
- TypeScript: `npx tsc --noEmit` — pass. ESLint: `npm run lint` — pass. Production build trong phase runner — **Compiled successfully**, tạo đủ 6 trang tĩnh và hoàn tất chuỗi chạy.

## Giới hạn đã biết

Không có lịch sử hành vi, chi phí nhập hàng, nhập kho đầy đủ hoặc dòng tiền thật nên không thể hồi dựng conversion, realized profit hay sell-through quá khứ. Cửa sổ visitor là 30 phút; lượt truy cập đồng thời đầu tiên có thể sinh hơn một visitor cookie/session trước khi cookie được trình duyệt lưu. Chưa có danh mục/giá trị ship nguồn lịch sử đủ xác minh cho mọi đơn.
