# Bảo mật Phase5

Giữ Phase4 default deny/ownership/version/session expiration và guard service. Không đổi role/password tài khoản chính. Các API tài chính tiếp tục kiểm quyền granular, trạng thái và dữ liệu DB; không nhận actor role tin từ client. Return evidence vẫn private/no-store.

Thay đổi: returnTo kiểm server chỉ local path, chặn protocol-relative, backslash/control và vòng lặp auth/API; kiểm file thực/realpath/nested path; upload có pixel limit và exclusive write; không ghi tên file do khách nhập vào audit. Chuẩn hóa SyntaxError để không lộ đoạn JSON lỗi, giữ thông báo validation, che Prisma lỗi. API responses no-store, lỗi POST có correlation ID, log mới chỉ event/requestId/method/area/code allowlist. Không log request body/error message/stack chứa dữ liệu người dùng. Audit DB nghiệp vụ có thể chứa actor/lý do/chứng từ cần thiết, chỉ người có quyền xem; không coi audit nghiệp vụ là telemetry công khai.

CSP/nosniff/frame deny đã có. CSP dev cho unsafe-eval/inline vì Next dev; không tuyên bố chuẩn production. Không external auth/cloud monitoring, không bảo đảm multi-instance hoặc chống brute-force phân tán. Rate-limit memory local giữ nguyên.

## Credential hiện tại

Mật khẩu local cũ do chủ dự án yêu cầu yếu; hash bcrypt không làm mật khẩu dễ đoán trở nên an toàn. Không in lại credential và không đổi ngầm. Chỉ chủ tài khoản đăng nhập /tai-khoan/thong-tin → Đổi mật khẩu, dùng mật khẩu riêng >=12 ký tự ngẫu nhiên, nhập mật khẩu cũ/mới, rồi đăng nhập lại. Kiểm thu hồi phiên sau đổi theo cơ chế hiện có. Không đặt credential trong URL, source hoặc screenshots. Backup chứa dữ liệu/hash: để local mode0600, không chia sẻ.

Kết quả RBAC/ownership/disabled-session regression và upload negative tests xem phase-5-qa-report.md. Không nhận chứng nhận vận hành thương mại từ demo local.
