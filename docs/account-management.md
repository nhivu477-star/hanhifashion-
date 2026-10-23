# Quản lý tài khoản

Chỉ có ba vai trò thật trong DB/API/UI: `CUSTOMER`, `SELLER`, `ADMIN`. Không có lớp ánh xạ sang vai trò khác. ADMIN có toàn quyền; SELLER vận hành sản phẩm, kho, đơn, giao nhận và hỗ trợ, không quản trị tài khoản/nhân viên/tài chính/lợi nhuận. [Ma trận quyền](rbac-role-permission-matrix.md) là hợp đồng chung.

## Quản trị

`/admin/tai-khoan` dành cho ADMIN: tìm kiếm, lọc vai trò/trạng thái, phân trang, tạo tài khoản, sửa tên/email, đổi vai trò, khóa/mở khóa. Không hiển thị password/hash/token. Tất cả API tài khoản kiểm `accounts.manage`; service lấy actor hiện tại từ DB, không tin role trong payload. Đăng ký công khai luôn tạo CUSTOMER; form hồ sơ không cho nâng quyền.

Đổi quyền/trạng thái và các thay đổi tài khoản nhạy cảm tăng permissionVersion, thu hồi phiên và ghi audit cùng transaction. Không tự khóa/đổi quyền tài khoản đang thao tác; không loại bỏ ADMIN hoạt động cuối. API nhân viên cũng chỉ quản lý ADMIN/SELLER, không tạo vai trò chuyên biệt. Khách không truy cập đơn/hồ sơ người khác. `returnTo` phải là đường dẫn local được phép và giữ ngữ cảnh mua hàng.

Tạo phiên phải CAS khớp passwordHash/permissionVersion đã qua kiểm mật khẩu cùng trạng thái active/vai trò hợp lệ; reset/đổi quyền đồng thời không được cấp phiên từ credential cũ. Đổi/reset mật khẩu thu hồi phiên và vô hiệu mọi token khôi phục chưa dùng của tài khoản cùng transaction/audit; token một lần/hết hạn không đổi được mật khẩu.

Mutation giữ permissionVersion của phiên đã xác thực và so lại trong transaction sau async; role còn giống hoặc quyền mới từ DB không hợp thức hóa actor version cũ. Đơn có userId yêu cầu phiên chủ sở hữu/staff đúng quyền, không fallback cookie hn_order/accessToken sau logout/thu hồi; capability chỉ cho đơn guest cũ userId=null.

Checkout đã xác thực không cấp cookie capability đơn. Cookie cũ còn trong trình duyệt không làm sống lại quyền đọc/hủy đơn tài khoản sau logout, reset mật khẩu hoặc khóa tài khoản.

## Credential local

Credential local phải git-ignored, mode0600, không in password trong log/báo cáo, không ghi vào URL/source/screenshot. Hash bcrypt trong DB không thay thế mật khẩu đủ mạnh. Không đổi ngầm mật khẩu, reset/seed DB chính hoặc ghi đè tài khoản hiện hữu khi tạo demo. Không dùng credential demo cho hệ thống công khai.

## Nghiệm thu

Phải kiểm đủ ba vai trò ở UI/API/service, phiên cũ sau đổi role/status, tranh chấp xác thực/reset, vô hiệu toàn bộ recovery token, bảo vệ ADMIN cuối và ownership trên DB riêng. [TS-001–003, TS-019–020, TS-032](test-scenarios.md) liên kết yêu cầu/rules với expected results. [Báo cáo hiện hữu](business-acceptance-report.md) ghi bằng chứng của lần chạy được mô tả, không tự chứng minh các thay đổi sau đó đã đạt.
