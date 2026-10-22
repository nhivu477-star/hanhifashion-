# Vận hành demo local

Ứng dụng chính chạy localhost:3000. Không reset/seed DB chính, tạo nhân viên ngầm hoặc đổi mật khẩu hiện hữu. Dữ liệu thử phải ở DB mới riêng và credential git-ignored/mode0600; không in credential vào log/báo cáo.

Bộ nghiệp vụ có các lệnh `npm run test:orders`, `npm run test:shipping`, `npm run test:returns`, `npm run test:rbac`, `npm run test:catalog`, `npm run test:analytics`, `npm run test:business`. Đây là hướng dẫn vận hành, không phải kết quả đã chạy. Runner và fixtures nằm trong `scripts/testing`; helpers tại `scripts/test-support`. Không dùng fixture QA để seed DB chính.

Nhóm hàng gồm Trang phục, Giày, Túi xách và Phụ kiện. Catalog/ảnh/tồn tham khảo không tự trở thành hàng đã xác minh; demo local không phê duyệt quyền ảnh hoặc mở bán. Không gửi tiền thật, carrier API, analytics bên thứ ba hay deploy/push.

## Khắc phục local

- Tra requestId + area/code và audit theo quyền; không chia sẻ body/chứng từ/cookie.
- VALIDATION_ERROR: đối chiếu trường nhập. DATABASE_ERROR: kiểm file/quyền đĩa, trạng thái migration và backup trước sửa; không reset.
- ACCESS_DENIED: kiểm ba vai trò/session/version và đăng nhập lại, không nới quyền để bỏ lỗi.
- Conflict shipping/refund/inventory: tải lại DB/lịch sử, không đổi eventKey để gửi trùng thao tác đã commit.
- Ảnh thiếu: `npm run data:quality`, gắn ảnh đúng màu hợp lệ hoặc giữ fallback, không mượn ảnh khác.
- Chưa có hàng/ảnh được duyệt: giữ preview, không dùng STORE_MODE=commercial để lách guard.

Trạng thái kiểm chứng tại [báo cáo nghiệm thu](business-acceptance-report.md).
