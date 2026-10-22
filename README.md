# HÀ NHI FASHION

Website thời trang Next.js, React, TypeScript, Prisma và SQLite chạy tại `http://localhost:3000`. Chế độ **LOCAL E-COMMERCE DEMO**: giao nhận thủ công, COD/thanh toán/hoàn tiền mô phỏng, không kết nối hãng vận chuyển hoặc chuyển tiền thật.

## Khởi động

Cài dependencies theo lockfile, cấu hình môi trường local theo `.env.example`, chạy `npx prisma migrate deploy`, sau đó `npm run dev`. Không reset/seed database chính hiện hữu. Mật khẩu tài khoản hiện có được giữ nguyên; thông tin credential local cũ cần đối chiếu đúng database, không đưa vào source/log/báo cáo.

Chỉ có ba vai trò: **CUSTOMER** mua hàng và quản lý dữ liệu của mình; **SELLER** vận hành sản phẩm, kho, đơn, giao nhận và hỗ trợ; **ADMIN** toàn quyền, gồm tài khoản/nhân viên, tài chính và lợi nhuận. Menu không thay thế kiểm quyền API/service. Xem [ma trận quyền](docs/rbac-role-permission-matrix.md).

Bản production local chạy bằng `npm run build && npm start`. Cookie phiên luôn `HttpOnly`, `SameSite=Lax`; chỉ bỏ `Secure` khi host chính xác là `localhost`, `127.0.0.1` hoặc `[::1]` để đăng nhập qua HTTP loopback. Host production khác vẫn yêu cầu cookie `Secure`.

## Cấu trúc

- `src/app`: route, API và trang; `src/components`: giao diện; `src/lib`: nghiệp vụ dùng chung.
- `prisma`: schema, migrations và SQLite local; `public`: tài nguyên và ảnh đang dùng.
- `scripts/testing`: runner và kịch bản kiểm thử nghiệp vụ; `scripts/test-support`: fixture/helper dùng chung; `tests`: unit và browser tests.
- `docs`: tài liệu nghiệp vụ/vận hành; `verification`: đầu ra kiểm chứng local và backup, không phải yêu cầu sản phẩm.

## Tài liệu

- [Đặc tả hiện hành](PROJECT_SPEC.md)
- [Báo cáo nghiệm thu và giới hạn](docs/business-acceptance-report.md)
- [31 nghiệp vụ](docs/business-acceptance-31.md) và [chuẩn nghiệm thu](docs/business-acceptance-standards.md)
- [Tài khoản](docs/account-management.md), [phạm vi quản trị](docs/admin-functional-scope.md)
- [Danh mục và size](CATALOG_AND_SIZING.md), [chất lượng sản phẩm](docs/product-data-quality.md), [quản lý ảnh](docs/product-image-management.md)
- [Đơn](docs/order-business-rules.md), [giao nhận](docs/shipping-business-rules.md), [COD](docs/cod-reconciliation.md), [đổi trả](docs/returns-business-rules.md)
- [Analytics](docs/analytics-business-rules.md), [ngôn ngữ/tiền tệ](docs/localization-and-currency.md), [backup/restore](docs/local-backup-restore.md)

## Kiểm tra và vận hành

`npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

Các bộ nghiệp vụ: `npm run test:orders`, `npm run test:shipping`, `npm run test:returns`, `npm run test:rbac`, `npm run test:catalog`, `npm run test:analytics`, `npm run test:business`. Browser: `npm run test:e2e`. Các runner dùng DB thử riêng; không chạy thao tác reset/seed lên `prisma/dev.db`.

`npm run data:quality` audit read-only dữ liệu/ảnh. `npm run db:backup` tạo bản sao SQLite nhất quán và phục hồi kiểm tra vào file riêng, không đè DB đang chạy. Backup và credential chứa dữ liệu riêng tư, chỉ giữ local.

Kết quả và phạm vi kiểm chứng được ghi tại [báo cáo hợp nhất](docs/business-acceptance-report.md). Giữ chính sách hàng lỗi đủ **72 giờ** từ khi nhận; hủy một phần và đổi SKU khác đơn giá chưa có chính sách nên bị chặn. Không coi hàng/ảnh/tồn demo là đã xác minh để mở bán thật.

## Nguồn ảnh và bản quyền

Dự án phục vụ học tập/thực hành, không sử dụng thương mại. Cảm ơn tác giả và chủ sở hữu hình ảnh; ảnh tham khảo thuộc chủ sở hữu tương ứng. Ghi nguồn/mục đích demo không thay giấy phép. Quyền tái sử dụng ảnh thương hiệu chưa được xác minh: phải xin phép hoặc thay ảnh trước sử dụng thương mại. Giữ attribution tại [THIRD_PARTY_IMAGES.md](THIRD_PARTY_IMAGES.md).
