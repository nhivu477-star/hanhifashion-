# Quản lý tài khoản

Chỉ có ba vai trò thật trong DB/API/UI: `CUSTOMER`, `SELLER`, `ADMIN`. Không có lớp ánh xạ sang vai trò khác. ADMIN có toàn quyền; SELLER vận hành sản phẩm, kho, đơn, giao nhận và hỗ trợ, không quản trị tài khoản/nhân viên/tài chính/lợi nhuận. [Ma trận quyền](rbac-role-permission-matrix.md) là hợp đồng chung.

## Quản trị

`/admin/tai-khoan` dành cho ADMIN: tìm kiếm, lọc vai trò/trạng thái, phân trang, tạo tài khoản, sửa tên/email, đổi vai trò, khóa/mở khóa. Không hiển thị password/hash/token. Tất cả API tài khoản kiểm `accounts.manage`; service lấy actor hiện tại từ DB, không tin role trong payload. Đăng ký công khai luôn tạo CUSTOMER; form hồ sơ không cho nâng quyền.

Đổi quyền/trạng thái và các thay đổi tài khoản nhạy cảm tăng permissionVersion, thu hồi phiên và ghi audit cùng transaction. Không tự khóa/đổi quyền tài khoản đang thao tác; không loại bỏ ADMIN hoạt động cuối. API nhân viên cũng chỉ quản lý ADMIN/SELLER, không tạo vai trò chuyên biệt. Khách không truy cập đơn/hồ sơ người khác. `returnTo` phải là đường dẫn local được phép và giữ ngữ cảnh mua hàng.

## Credential local

Credential local phải git-ignored, mode0600, không in password trong log/báo cáo, không ghi vào URL/source/screenshot. Hash bcrypt trong DB không thay thế mật khẩu đủ mạnh. Không đổi ngầm mật khẩu, reset/seed DB chính hoặc ghi đè tài khoản hiện hữu khi tạo demo. Không dùng credential demo cho hệ thống công khai.

## Nghiệm thu

Phải kiểm đủ ba vai trò ở UI/API/service, phiên cũ sau đổi role/status, bảo vệ ADMIN cuối và ownership trên DB riêng. [Báo cáo](business-acceptance-report.md) ghi phạm vi, kết quả thực thi hiện tại và các giới hạn còn lại.
