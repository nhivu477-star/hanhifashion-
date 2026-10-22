# Quản lý nhân viên — Phase 4

19/10/2026. Chỉ local demo; mật khẩu và mã phiên không đưa vào audit.

- Giữ User/Session/AuditLog hiện có, không tạo hệ thống đăng nhập thứ hai. User.role là một vai trò chuẩn, ma trận static explicit trong rbac.ts; chưa có custom roles/quyền riêng theo cá nhân.
- SUPER_ADMIN quản lý danh tính/quyền. STORE_MANAGER đọc danh sách nhân viên, không tạo/cấp role/khóa hoặc xử lý tài chính. ADMIN cũ giữ nghiệp vụ cũ nhưng không tự có quyền SUPER_ADMIN.
- Chủ dự án đã trả lời “Nâng tài khoản quản trị hiện tại”. BootstrapOwner là thao tác local một lần, chỉ khi chưa có SUPER_ADMIN và đúng một ADMIN active. Không có HTTP bootstrap/public self-promotion; ghi audit phê duyệt, tăng permissionVersion, thu hồi phiên, không đổi mật khẩu.
- Staff registration không công khai. API staff.create yêu cầu cả staff.create và roles.assign, allowlist vai trò chuẩn. Email unique, mật khẩu khởi tạo từ người quản trị tối thiểu 12 ký tự, bcrypt cost12, không trả lại password/hash hoặc ghi secret vào audit.
- Staff update cho tên/email; không có endpoint đổi mật khẩu qua quản lý staff trong phạm vi này. Không biến CUSTOMER thành nhân viên qua update/role. Customer endpoint chỉ nhận target role CUSTOMER, không thể khóa SUPER_ADMIN bằng đường vòng.
- Đổi role/trạng thái cần lý do, cùng transaction với audit và thu hồi toàn bộ Session. Sửa metadata cũng thu hồi phiên để đăng nhập bằng thông tin mới. Không chỉnh role/status của chính mình. Không loại bỏ SUPER_ADMIN active cuối cùng. Transaction SQLite/retry bảo vệ hai quản trị cùng hạ quyền.
- Account inactive không login/currentUser. Session cần chưa hết hạn, user active và session.permissionVersion == user.permissionVersion. User/role mới được đọc từ DB trên yêu cầu tiếp theo; service nhạy cảm kiểm lại quyền theo actor ID trong DB, không tin role/permission do payload gửi.
- Kích hoạt lại không hồi sinh session cũ. Không thay mật khẩu của tài khoản hiện hữu khi đổi role. LastLoginAt cập nhật khi tạo session sau xác thực thành công; createdAt cũ giữ nguyên.
- Staff list `/admin/nhan-vien` tìm tên/email, lọc role/active, xem last login/created/version/quyền và lịch sử quản lý danh tính. `/admin/phan-quyen` xem quyền hiện tại; `/admin/nhat-ky` yêu cầu audit.read và chỉ đọc.

Không xóa tài khoản/ledger/audit. Không custom permissions, impersonation, SSO, 2FA, email kích hoạt hoặc production identity provider trong Phase 4.
