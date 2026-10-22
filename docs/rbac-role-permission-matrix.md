# Ma trận quyền ba vai trò

Hệ thống chỉ có `CUSTOMER`, `SELLER`, `ADMIN`, dùng cùng tên trong DB, API và giao diện. Đây là hợp đồng hiện hành, không phải báo cáo kiểm thử.

| Nghiệp vụ | CUSTOMER | SELLER | ADMIN |
|---|---|---|---|
| Hồ sơ/địa chỉ/giỏ/đơn cá nhân | Của mình | Của mình | Của mình |
| Sản phẩm, ảnh, màu, size, danh mục, bộ sưu tập | Xem công khai | Vận hành | Toàn bộ |
| Tồn, nhập/xuất, kiểm kê | Không | Vận hành có audit | Toàn bộ |
| Đơn hàng, đóng gói, giao nhận thủ công | Theo dõi của mình | Vận hành | Toàn bộ |
| Đánh giá và hỗ trợ | Của mình | Phản hồi/kiểm duyệt có lý do | Toàn bộ |
| Đổi trả | Gửi/xem của mình | Đọc phục vụ hỗ trợ | Duyệt, nhận/kiểm, đổi |
| Thu/chuyển/đối soát COD và hoàn tiền | Trạng thái được phép | Không | Toàn bộ, chỉ mô phỏng |
| Phân tích sản phẩm và tồn | Không | Có | Toàn bộ |
| Tài khoản/nhân viên/quyền/khóa tài khoản | Không | Không | Toàn bộ |
| Giá vốn, lợi nhuận, tài chính, nhật ký toàn hệ thống | Không | Không | Toàn bộ |
| Cấu hình hệ thống | Không | Không | Toàn bộ |

UI lọc điều hướng và nút theo quyền; API/service vẫn kiểm riêng từ user hiện tại trong DB. Không tin role client, không giả ADMIN cho nghiệp vụ SELLER. Quyền không khai báo mặc định từ chối. Không có alias vai trò cũ hay vai trò chuyên biệt.

Đổi role/status tăng permissionVersion và thu hồi phiên. Chặn tự khóa/tự đổi role và bảo vệ ADMIN hoạt động cuối. Quyền truy cập SQLite trực tiếp của chủ máy nằm ngoài RBAC web. Xem [tài khoản](account-management.md), [kiểm soát vận hành](admin-operational-controls.md) và [báo cáo kiểm chứng](business-acceptance-report.md).
