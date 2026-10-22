# Quản lý nhân viên

Nhân viên chỉ dùng ADMIN hoặc SELLER; CUSTOMER là khách hàng. Không có vai trò chuyên biệt, custom role hay hệ đăng nhập thứ hai. User/Session/AuditLog hiện có là nguồn sự thật; [quản lý tài khoản](account-management.md) và [ma trận quyền](rbac-role-permission-matrix.md) định nghĩa hợp đồng chung.

- Chỉ ADMIN quản lý danh tính, quyền, khóa/mở nhân viên và xem audit toàn hệ thống. SELLER không có quyền quản trị nhân sự.
- Không đăng ký nhân viên công khai, HTTP bootstrap hoặc self-promotion. API tạo/đổi role kiểm allowlist và actor thực trong DB; CUSTOMER không đổi thành nhân viên qua payload hồ sơ.
- Email unique; mật khẩu khởi tạo tối thiểu 12 ký tự, bcrypt; không trả password/hash/token hoặc ghi secret vào audit. Không đổi ngầm mật khẩu tài khoản hiện hữu khi đổi role.
- Đổi role/status cần lý do, transaction cùng audit và tăng permissionVersion/thu hồi phiên. Sửa metadata nhạy cảm cũng thu hồi phiên. Chặn tự khóa/tự đổi role, không loại ADMIN hoạt động cuối; bảo vệ cả thao tác đồng thời.
- User inactive hoặc session hết hạn/sai version không được xác thực. Kích hoạt lại không hồi sinh phiên cũ; quyền phải đọc lại từ DB, không tin quyền trong payload.
- Danh sách nhân viên có tìm tên/email, lọc role/active, thông tin đăng nhập gần nhất và lịch sử quản lý danh tính. Audit chỉ đọc; không xóa tài khoản/ledger/audit làm mất lịch sử.

Không cam kết SSO, 2FA, impersonation, email kích hoạt hoặc identity provider production. Credential local riêng tư; [báo cáo nghiệm thu](business-acceptance-report.md) không xác nhận các thay đổi hiện hành đã được kiểm.
