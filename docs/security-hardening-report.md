# An toàn ứng dụng local

## Kiểm soát bắt buộc

Default deny, ownership và kiểm user/session/permissionVersion từ DB áp dụng ở API/service, không chỉ menu. ADMIN toàn quyền; SELLER không tài khoản/nhân viên/tài chính/giá vốn/lợi nhuận; CUSTOMER chỉ dữ liệu mình. Đổi role chỉ theo hợp đồng ba vai trò được phê duyệt, không đổi ngầm mật khẩu.

Mutation giữ permissionVersion của actor đã xác thực, đối chiếu trong transaction sau các bước async; không lấy role/version mới để hợp thức hóa request từ phiên đã thu hồi. Đơn có userId cần phiên chủ sở hữu hoặc staff đúng quyền; cookie hn_order/accessToken còn lại không thay thế phiên. Capability chỉ áp dụng đơn guest cũ userId=null; mã+điện thoại chỉ tra cứu tối thiểu.

`returnTo` chỉ nhận local path, chặn protocol-relative, backslash/control và vòng lặp auth/API. Upload kiểm bytes/format/pixel/size/realpath, chặn traversal/symlink thoát public, ghi file exclusive và không tin tên/MIME client. Ảnh lỗi đổi trả phải riêng tư, no-store và chỉ ADMIN hoặc chủ hồ sơ được đọc.

Upload kiểm quyền trước đọc và kiểm lại phiên/quyền sau multipart/decode, trước ghi. Khi ghi file/audit lỗi, chỉ dọn artifact thuộc request đó, không xóa ảnh hiện hữu; không trả thành công hoặc để lại tệp công khai của mutation thất bại. Các yêu cầu này cần được nghiệm thu trên DB/file fixture riêng, không tự ghi nhận PASS.

Chuẩn hóa lỗi parser/Prisma, không trả raw JSON/SQL. API cá nhân/tài chính private/no-store. Log kỹ thuật chỉ allowlist event/requestId/method/area/code, không body/error message/stack có PII/password/token. Audit nghiệp vụ có actor/lý do/chứng từ cần thiết nhưng chỉ quyền tương ứng được xem, không phải telemetry công khai.

## Giới hạn

CSP/nosniff/frame deny không thay kiểm quyền. CSP dev có unsafe-eval/inline phục vụ Next dev; rate-limit bộ nhớ không bảo đảm nhiều instance hoặc brute-force phân tán. Không có chứng nhận production security, external auth/cloud monitoring hay kiểm toán chuyên sâu. Quyền sửa SQLite trực tiếp của chủ máy nằm ngoài RBAC web.

## Credential và backup

Mật khẩu dễ đoán vẫn rủi ro dù hash bcrypt. Không in credential hoặc tự đổi mật khẩu người dùng. Chủ tài khoản đổi tại `/tai-khoan/thong-tin`, dùng mật khẩu riêng tối thiểu 12 ký tự ngẫu nhiên và đăng nhập lại; thay mật khẩu phải thu hồi phiên cũ. Không để credential trong URL/source/screenshot. Tệp credential và backup chứa dữ liệu/hash phải giữ local/mode0600 và git-ignored.

Đây là yêu cầu và giới hạn vận hành, không phải khẳng định thay đổi hiện tại đã được kiểm. Kết quả lịch sử và trạng thái mới tại [báo cáo nghiệm thu](business-acceptance-report.md).
