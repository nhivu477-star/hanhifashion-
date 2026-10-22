# HÀ NHI FASHION — website bán hàng local

Ứng dụng Next.js, React, TypeScript, Prisma và SQLite. Chế độ **LOCAL E-COMMERCE DEMO**: vận chuyển thủ công, COD/thanh toán/hoàn tiền mô phỏng. Không kết nối hãng vận chuyển hoặc chuyển tiền thật. Giữ chính sách lỗi đủ 72 giờ từ lúc nhận hàng.

## Nguồn ảnh và bản quyền

Ảnh tham khảo bên thứ ba thuộc chủ sở hữu tương ứng. Ghi nguồn và mục đích demo không thay thế giấy phép sử dụng. Chưa xác minh quyền tái sử dụng ảnh thương hiệu; cần xin phép hoặc thay ảnh trước khi công khai/kinh doanh. Xem [hồ sơ nguồn ảnh và trạng thái quyền](THIRD_PARTY_IMAGES.md) và trang `/nguon-anh` trên website. Giấy phép mã nguồn không cấp quyền với ảnh bên thứ ba.

## Mở ứng dụng

- Website: http://localhost:3000
- Quản trị: http://localhost:3000/admin
- Khởi động: `npm run dev`
- Tài khoản local: `.local-accounts.md` (tệp riêng tư đã ignore; mật khẩu được đối chiếu với database).

Database chính: `prisma/dev.db`. Không chạy reset hoặc seed để tránh ghi đè dữ liệu hiện có.

## Tài liệu đang dùng

- [Yêu cầu dự án](PROJECT_SPEC.md)
- [Báo cáo QA Phase 6 mới nhất](docs/phase-6-qa-report.md)
- [Chất lượng dữ liệu sản phẩm](docs/product-data-quality.md)
- [Quản lý ảnh](docs/product-image-management.md)
- [Quyền nhân viên](docs/rbac-role-permission-matrix.md)
- [Quy tắc đơn hàng](docs/order-business-rules.md)
- [Vận chuyển và COD](docs/shipping-business-rules.md)
- [Đổi trả](docs/returns-business-rules.md)
- [Backup và phục hồi](docs/local-backup-restore.md)
- [Hướng dẫn demo và xử lý lỗi](docs/local-demo-readiness.md)

## Kiểm tra và backup

`npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

`npm run test:phase6` tạo database kiểm thử riêng và chạy hồi quy nghiệp vụ Phase 1–6. `npm run test:e2e` tạo database test tên ngẫu nhiên, ghi đường dẫn trong `.test-credentials.json` để Playwright dùng cùng một database; không xóa `prisma/test.db` cũ hoặc dùng tài khoản QA trên database chính.

`npm run data:quality` kiểm tra dữ liệu/ảnh mà không sửa sản phẩm. `npm run db:backup` tạo bản sao SQLite nhất quán, kiểm tra toàn vẹn và phục hồi vào file riêng để đối chiếu; không đè database đang chạy.

### Cấu trúc và bảo trì

- `src/app`: route, API và giao diện trang; `src/components`: thành phần giao diện đang dùng; `src/lib`: nghiệp vụ và tiện ích dùng chung.
- `scripts/test-support`: fixture dùng chung cho các bài kiểm thử nghiệp vụ; các script chạy kiểm thử vẫn ở `scripts` để giữ nguyên lệnh hiện có.
- Đợt refactor bảo toàn hành vi: bỏ hai component không có nơi sử dụng (`campaign-artwork`, `lookbook-strip`) và dependency kiểm thử không dùng (`@testing-library/react`); gom tính toán dashboard lặp và khai báo thứ tự phase kiểm thử tại một nơi.
- Bỏ hai module provider không được tham chiếu (`shipping-providers/manual`, `shipping-providers/test-fixtures`); giữ nguyên vận chuyển thủ công đang dùng. Truy vấn catalog chỉ phân tích số trang một lần và bỏ nhánh sắp xếp không thể chạy.
- Không xóa hoặc di chuyển database, backup, upload, thông tin đăng nhập local và bằng chứng QA cũ. Không chạy reset/seed trên database chính.

## Trạng thái

Phase 6 analytics local đã triển khai; số lượng/sẵn sàng bán xem kiểm tra hiện tại qua `npm run data:quality`. Không coi dữ liệu tham khảo là hàng đã được xác minh để mở bán thật.

## Dọn tệp theo yêu cầu

Ảnh không được tham chiếu, ảnh chụp QA cũ và báo cáo phase lỗi thời đã chuyển khỏi dự án vào Thùng rác, có manifest khôi phục. Giữ nguyên database, backup, ảnh đang dùng và quy tắc nghiệp vụ. Xem `verification/cleanup-result.json` để biết vị trí, số lượng và danh sách tệp. Các báo cáo phase cũ trong master specification nay dẫn đến báo cáo tổng hợp hiện tại.
