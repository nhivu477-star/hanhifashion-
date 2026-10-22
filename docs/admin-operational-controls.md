# Kiểm soát vận hành quản trị

## Xác thực và quyền

`currentUser` kiểm cookie HttpOnly bằng tokenHash, expiry, active, permissionVersion và user hiện tại trong DB. Chỉ ADMIN/SELLER được vào chức năng quản trị phù hợp; CUSTOMER và role không xác định bị từ chối. Menu/nút lọc theo quyền nhưng API/service phải kiểm độc lập, default deny cho endpoint/quyền không biết. Không gán SELLER thành ADMIN giả.

ADMIN toàn quyền. SELLER chỉ vận hành sản phẩm/ảnh/biến thể/danh mục, kho, đơn/đóng gói/giao nhận và hỗ trợ, đọc báo cáo sản phẩm/tồn được cấp. Không cho SELLER quản trị tài khoản/nhân viên/cấu hình hệ thống, thu/chuyển/đối soát COD, duyệt/thực hiện hoàn tiền, giá vốn hoặc lợi nhuận. Xem [ma trận](rbac-role-permission-matrix.md).

## Dữ liệu và giao dịch

- Mutation kiểm origin và schema strict, actor từ DB; không tin giá/stock/payment/provider/userId do client gửi.
- Catalog publication tách readiness; thay tồn cần inventory.adjust và lý do. Upload kiểm quyền trước đọc và chỉ chấp nhận ảnh local hợp lệ.
- Đơn, kiện, COD, đổi trả và movement dùng transaction/CAS/idempotency; tiền thu khách, chuyển về, đối soát và hoàn tiền là nghiệp vụ riêng. Delivery không phải PAID; tiền/stock không được retry ngoài transaction đã rollback.
- Khách chỉ nhận allowlist của đơn/hồ sơ mình; evidence/actor/ghi chú tài chính và audit nội bộ không được lộ. Điều kiện lỗi đủ 72 giờ giữ nguyên.
- Không hỗ trợ carrier/payment thật; không có quyền nào mở tích hợp hãng qua cấu hình hoặc payload.

## Audit

AuditLog lưu actor/time/resource/result/before/after/reason cần thiết, cùng transaction với thay đổi nghiệp vụ. Bản ghi cũ không có metadata không được bịa lại. Đổi quyền/khóa người dùng atomic với version/session. Truy cập bị từ chối và lỗi nghiệp vụ chỉ ghi endpoint/quyền/code an toàn, không raw payload/password/token/PII/SQL.

Không có API sửa/xóa audit. Chỉ ADMIN xem audit toàn hệ thống; SELLER chỉ xem lịch sử vận hành được cấp. SQLite trực tiếp của chủ máy nằm ngoài RBAC web: không tuyên bố chống sửa ngoại tuyến hay là sổ kế toán production.
