# Phase 5 — audit thực tế

19/10/2026; LOCAL E-COMMERCE DEMO. Nguồn sự thật là mã và SQLite hiện hữu.

Đã đọc PROJECT_SPEC và các audit/QA Phase 1–4 trước triển khai, đối chiếu schema/migrations, auth/RBAC, API, admin/catalog, media và test runner. Sau yêu cầu dọn tệp, báo cáo lịch sử được chuyển vào Thùng rác; kết quả tổng hợp giữ tại phase-5-qa-report.md.

## Có sẵn và tái sử dụng

Next.js 15/React 19, Prisma 6/SQLite (46 bảng ứng dụng, 11 migration), bcrypt/cookie session/version, default-deny granular RBAC. Order/shipping/COD/returns/refunds giữ transaction/CAS/idempotency và audit. Policy lỗi đủ 72 giờ. Shipping nội bộ HN-SHIP, mock money; carrier adapters vẫn bị vô hiệu hóa. Gallery nhiều ảnh/màu, ảnh chính theo position, Next Image responsive + fallback đã có; không xây lại.

Main DB trước Phase5: 555 product (234 active, 321 archived), 16.252 variant (xem thống kê JSON để lấy số chính xác), ảnh tham khảo/local development. Không seed dữ liệu kinh doanh giả vào main DB. Bộ fixtures riêng các phase có đủ đơn/kiện/COD/claim/exchange/refund/staff để demo.

## Phát hiện và xử lý

- Admin products và orders chưa phân trang; customer order history chưa phân trang. Thêm giới hạn 24/trang và giữ filter. Inventory và media đã có phân trang nên giữ.
- Catalog trả toàn bộ mô tả/dữ liệu product vào card, dư payload. Chọn các trường card cần, vẫn tính giá/filter qua DB; không thay transaction nghiệp vụ.
- Login chỉ quay về admin/account, checkout link mất context. Thêm returnTo nội bộ kiểm tra server, giữ cả khi đi qua đăng ký; không cho external redirect.
- Đường dẫn ảnh editor chỉ cho một cấp thư mục, không sửa được ảnh LSOUL đã nằm nested. Dùng validator chung cho nested paths, kiểm realpath, loại symlink thoát public, kích thước và bytes.
- Chưa có kiểm tra readiness tách publication, chưa có xóa metadata với reference guard, chưa có quy trình online backup/isolated restore vận hành. Đã bổ sung.
- Variant editor/API chỉ nhận size áo, không nhận size giày vốn có trong catalog: bổ sung size giày và One size, không sửa SKU/tồn lịch sử.
- Lỗi JSON có thể trả thông báo parser; chuẩn hóa thông báo, thêm requestId/log allowlist không body/PII. API thành công có Cache-Control no-store; không cache user/financial.
- Bộ Buzz có giá 0, active nhưng không tồn bán. Không suy đoán giá và không sửa sản phẩm lịch sử; đánh dấu INVALID. 554 sản phẩm còn lại NEEDS REVIEW do ảnh/hàng/tồn chưa xác minh.

Không migration Phase5; không reset DB, đổi role/password hoặc branding. Không tải thêm ảnh hay tạo ảnh merchandise. Audit báo cáo tệp chứ không khẳng định nội dung ảnh đã đúng hàng thật.

Bằng chứng ban đầu: verification/phase5-before.json, phase5-performance-before.json, phase5-query-before.json. Kết quả cuối ở phase-5-qa-report.md.
