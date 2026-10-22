# Sẵn sàng demo local

Main vẫn localhost:3000, SQLite cũ/owner hiện hữu. Không seed/reset main hoặc tạo staff ngầm. Mẫu nghiệp vụ đủ ở DB timestamp riêng từ `npm run test:phase6`: migration → fixtures → hồi quy Phase 1–6, server127.0.0.1:3101, cuối dừng server. Credentials giả mode0600 ignored, không in ra báo cáo. Runner từ chối cổng test bận và DB file mở exclusive.

Để xem workflow của bộ QA mới nhất: `npx tsx scripts/start-returns-browser.ts verification/phase4-fixtures.json`. Chỉ chấp nhận DB tên phase1-orders, không dev.db. Dữ liệu gồm orders completed/cancelled, failed delivery/returned, COD disputed/reconciled, returns/inspection/exchange/mock refund, các role staff. Chúng được tạo qua workflow test có assertion tồn/ledger, không tạo lịch sử tài chính rời rạc. Không cần chạy seed vào DB chính. Fixture mỗi lần test là DB mới, không ghi đè users cũ; không gọi fixture này idempotent trên cùng DB.

Catalog main đầy đủ danh mục/biến thể, nhưng hàng/ảnh/tồn tham khảo NEEDS REVIEW. Demo các thao tác local, bao gồm báo cáo analytics Phase 6, không có nghĩa hàng thực hoặc quyền dùng ảnh đã xác minh. Không gửi tiền thật/carrier API/analytics bên thứ ba; không deploy/push/publish.

## Khắc phục local

- Mở console server đọc requestId + area/code; tra audit theo quyền, không chia sẻ body/chứng từ/cookie.
- VALIDATION_ERROR: đối chiếu trường nhập; DATABASE_ERROR: kiểm file/quyền đĩa, migrate status và backup trước sửa, không reset.
- ACCESS_DENIED: kiểm role/session/version, đăng nhập lại; không nới quyền để bỏ lỗi.
- Shipping/refund/inventory conflict: tải lại trạng thái DB, tra lịch sử, không gửi lại với eventKey khác nếu thao tác đã commit.
- Ảnh thiếu: audit data:quality, gắn ảnh đúng màu hợp lệ hoặc giữ fallback; không dùng ảnh sản phẩm khác.
- Chưa có ảnh/hàng được duyệt: giữ preview, không đặt STORE_MODE=commercial để lách guard.
