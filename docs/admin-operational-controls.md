# Kiểm soát vận hành admin — Phase 4

## Điểm kiểm tra

1. currentUser xác thực cookie HttpOnly bằng tokenHash, session expiry, active, permissionVersion và user mới trong DB.
2. AdminPage chỉ nhận role staff được biết; kiểm permission của tab trước truy vấn/hiển thị. `/admin` chuyển nhân viên tới chức năng đầu tiên được phép, không ép ai cũng xem dashboard. Menu lọc quyền; `/admin/phan-quyen` xem ma trận. Khách/unknown STAFF bị từ chối.
3. Mọi admin mutation qua authorizeAdminAction, bản đồ quyền default deny; unknown endpoint bị chặn. Origin check giữ nguyên. Staff service, order/shipping/return services kiểm quyền actor từ DB; không gán staff thành ADMIN giả.
4. Hiển thị nút/form chỉ theo quyền; đồng thời backend vẫn kiểm độc lập. COD/refund proof, audit, movements và lịch sử tài chính bị ẩn với staff không có quyền đọc tương ứng. Customer owner allowlist vẫn giữ, 72 giờ không đổi.

## Endpoint / nghiệp vụ

| Endpoint | Quyền chính |
|---|---|
| admin/staff/create | staff.create + roles.assign |
| admin/staff/update / status / role | staff.update / staff.disable / roles.assign |
| admin/product | products.create/update; active=false thêm products.archive |
| admin/publication | products.publish |
| admin/media, color, outfit, size-chart, category, collection | products.update |
| admin/upload | products.update hoặc content.manage; chỉ ảnh local |
| admin/variant | products.update; thay stock/stockOrigin cần inventory.adjust |
| admin/stock | inventory.adjust, lý do bắt buộc |
| admin/order | orders.manage; cancel là orders.cancel; thu COD legacy là cod.collection.confirm |
| admin/shipping/create | shipping.create |
| admin/shipping/status | shipping.update; failed/returning/returned thêm shipping.failures.manage; canceled thêm orders.cancel |
| admin/shipping/collection / remittance / reconcile | cod.collection.confirm / cod.remittance.record / cod.reconcile |
| admin/returns/status | returns.review; nhận hàng là returns.inspect |
| admin/returns/inspect | returns.inspect; SELLABLE thêm inventory.adjust |
| admin/returns/exchange | returns.exchange |
| admin/returns/exchange-status | returns.exchange + shipping.update; ngoại lệ thêm shipping.failures.manage |
| admin/returns/refund / refund-status | refunds.approve; SIMULATED_COMPLETED riêng refunds.execute |
| admin/coupon | promotions.manage |
| admin/banner, settings | content.manage |
| admin/customer | customers.manage, target CUSTOMER duy nhất |
| admin/inquiry | inquiries.manage |
| admin/ghn/*; shipping/ghn/webhook | khóa 410, không transport thật |

Tài chính tách thu khách, chuyển về, đối soát và refund; không suy ra đã thu từ delivery, không thay amount từ client. Quy tắc tồn/transaction/idempotency Phase 1–3 giữ nguyên. Nhân viên fulfillment có quyền trừ tồn khi phân bổ hàng đổi qua returns.exchange nhưng không có quyền tùy ý đặt số stock.

## Audit

Tái sử dụng AuditLog, bổ sung resourceType/result/beforeJson/afterJson/reason. Records cũ mang LEGACY/SUCCESS và không bịa lại actor/before/after. Staff change/disable/bootstrap ghi cùng transaction với version/session changes. Stock/variant movement có actor và audit trong transaction; order/shipping/COD/returns dùng audit cùng transaction hiện hữu. Các cập nhật catalog/content/promotions lưu snapshot allowlist trước/sau và kết quả thành công; không ghi body client, mật khẩu hoặc token. Quyền bị từ chối tạo ACCESS_DENIED/DENIED chỉ chứa endpoint/quyền; lỗi nghiệp vụ admin tạo OPERATION_REJECTED/REJECTED với code chung, không dump payload.

Không có API sửa/xóa audit. SUPER_ADMIN có audit.read; các role vận hành chỉ xem lịch sử nghiệp vụ được cấp, không toàn bộ audit. Quyền truy cập trực tiếp SQLite của chủ máy nằm ngoài RBAC web; không tuyên bố audit có chống sửa ngoại tuyến hoặc là sổ kế toán production.
