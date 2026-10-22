# Final UAT — HÀ NHI FASHION

**Ngày: 19/10/2026. Kết luận: ĐẠT demo local trong phạm vi kiểm thử.**

Tiếp tục từ kết quả và thay đổi có sẵn; không chạy lại audit catalog, không reset database, không triển khai hoặc đẩy mã lên remote. Hệ thống chính giữ localhost:3000; server kiểm thử 3101/3102/3103 đã dừng.

## Kết quả

| Kiểm tra | Kết quả và bằng chứng |
|---|---|
| Unit | 87/87 PASS, 12 file; final-uat/unit.log |
| Integration Phase 1–6 | 141/141 PASS; giữ kết quả hồi quy đã hoàn tất trong final-uat/integration.log |
| Browser E2E | 20 kịch bản duy nhất đều đã PASS: 19 đạt trong lượt đầy đủ, kịch bản hành trình còn lại đạt khi chạy riêng sau sửa đồng bộ test. Không mô tả là một lượt 20/20 liên tục. final-results.json lưu từng lượt và kết quả mới nhất |
| Hành trình mua hàng | Đăng nhập, giữ returnTo sản phẩm, giỏ, checkout COD 630.000đ, đơn cá nhân, giao nhận nội bộ, thu/chuyển/đối soát COD, yêu cầu hàng lỗi kèm ảnh, kiểm hàng DAMAGED, hoàn mô phỏng 600.000đ, hồ sơ COMPLETED, đăng xuất về đăng nhập — PASS |
| Kho và chính sách | Tồn fixture 12 → 11 khi đặt; kiểm hàng lỗi không tăng tồn. Deadline đúng 72 giờ từ khi nhận. Hủy/đổi hàng, chống bán quá tồn và thao tác lặp đã được kiểm trong hồi quy |
| Vai trò | 10 vai trò cũ và SELLER bổ sung: menu và API đúng quyền. Tạo ADMIN/SELLER/BUYER, chống payload cấp quyền, actor giả mạo ở dịch vụ, dữ liệu đơn riêng tư, khóa/thu hồi phiên/mở khóa — PASS |
| Responsive | 360, 390, 768, 1024, 1440px: 60 phép đo trên các trang bán hàng, checkout, tài khoản và quản trị; không có tràn ngang document. Thêm ảnh đăng nhập ở cả năm chiều rộng |
| Smoke hệ thống chính | 13 nhóm PASS: 10 route công khai và 3 loại tài khoản thực, điều hướng mặc định, truy cập tài khoản/tài chính, đăng xuất; không tạo đơn thử trong DB chính |
| TypeScript / ESLint | PASS, không cảnh báo lint; typescript.log và eslint.log |
| Production build | PASS, build.log có Compiled successfully và tạo đủ trang tĩnh. E2E chạy next start từ build local này |
| Backup/restore | Cả DB chính và DB E2E có ledger/hoàn tiền được backup online và restore sang file riêng; integrity_check=ok, foreign_key_check rỗng, toàn bộ nội dung bản phục hồi khớp backup |

## Sửa đổi đã xác nhận

1. Đơn hàng và giao nhận: sau POST đã commit, router.refresh đôi lúc để giao diện ở trạng thái cũ. Chuyển sang tải lại snapshot đầy đủ; tạo hồ sơ giao nhận điều hướng một lần tới hồ sơ mới. Giữ nút bận trong khi chuyển trang để tránh gửi tiếp từ trạng thái cũ.
2. Analytics: sửa so origin với Host công khai thay vì hostname nội bộ của Next, chấp nhận request cùng origin localhost/127.0.0.1 nhưng vẫn từ chối origin khác. Browser xác nhận PRODUCT_VIEWED thực sự được lưu.
3. Sửa hydration ở title của biểu đồ SVG bằng một chuỗi text thống nhất; lỗi được tái hiện và kiểm tra lại không còn xuất hiện.
4. Bộ lọc trạng thái dùng lifecycle hiện có (PROCESSING thay PACKING, bổ sung trạng thái thực); thêm CSS bị thiếu cho KPI và bọc nội dung tài khoản trên màn nhỏ.
5. Ô thời gian chứng từ COD hỗ trợ giây, tránh chứng từ vừa nhập bị coi là trước thời điểm tạo đơn.
6. Sửa bộ E2E: selector theo giao diện hiện tại, phân biệt trang xem quyền cá nhân với quyền quản lý nhân sự; không đọc body của response đã bị unload; kiểm trạng thái INSPECTED/COMPLETED do dịch vụ tự chuyển thay vì đợi nút chuyển thủ công không tồn tại. Timeout action/expect 12 giây, navigation 20 giây, từng test 120 giây, hành trình 180 giây.

## Ba tài khoản demo

| Loại | Email | Giao diện mặc định |
|---|---|---|
| ADMIN | admin.demo@hanhi.local | /admin |
| SELLER | seller.demo@hanhi.local | /admin/don-hang |
| BUYER | buyer.demo@hanhi.local | /tai-khoan |

Mật khẩu riêng nằm ở **.local-demo-accounts.json**, quyền file 0600, git-ignored; không ghi plaintext vào báo cáo/log. Đăng nhập tại http://localhost:3000/dang-nhap. Cả ba đã đăng nhập và đăng xuất qua API thực trên server chính. ADMIN mới ánh xạ SUPER_ADMIN; SELLER có tập quyền bán hàng riêng; BUYER ánh xạ CUSTOMER. Tài khoản SUPER_ADMIN cũ và quyền các vai trò chuyên biệt không bị ghi đè. Ma trận và hướng dẫn: docs/account-management.md.

## Bảo toàn dữ liệu và vấn đề còn lại

- Catalog, ảnh, biến thể, đơn, giá lịch sử, kho, giao nhận, COD, trả hàng và hoàn tiền chính khớp snapshot ban đầu. Không có đơn giao dịch UAT trong DB chính; toàn bộ workflow thử nằm ở DB timestamp riêng.
- DB chính được bổ sung đúng ba tài khoản demo và ba audit tạo tài khoản. Snapshot qua cả khoảng sử dụng ứng dụng ghi nhận thêm session/cart/wishlist; User cũ chỉ khác lastLoginAt/updatedAt và một giỏ khách trống được hợp nhất khi đăng nhập. Không đổi mật khẩu, vai trò, thông tin người dùng cũ hoặc mất dòng hàng. Không phục hồi đè các thay đổi phiên hợp lệ này. Chi tiết: final-uat/data-preservation.json; không tuyên bố mọi bảng đều giữ nguyên hash.
- Kết quả audit đã hoàn tất vẫn là 554 NEEDS REVIEW và Bộ Buzz giá 0 cần chủ shop xác minh. Không bịa giá, tồn, ảnh hoặc nâng trạng thái merchandise. 1.423 URL ảnh đã kiểm có tệp hợp lệ; điều đó không xác minh hàng thực hay quyền thương mại của ảnh.
- Thiếu lịch sử tracking và giá vốn đầy đủ vẫn hiển thị thiếu dữ liệu. UAT không chứng nhận mở bán thật, mọi thiết bị/trình duyệt, kiểm toán bảo mật chuyên sâu hoặc chịu tải production.

## Tệp thay đổi và xóa

- Tính năng tài khoản: thêm account-types.ts, managed-accounts.ts, account-admin.tsx, provision-demo-accounts.ts, account-management.md; cập nhật rbac.ts, staff.ts, admin-authorization.ts, staff-forms.tsx, admin.tsx, API action và .gitignore. Không migration/schema reset.
- Sửa UAT: order-actions.tsx, shipping-forms.tsx, analytics-admin.tsx, API analytics, globals.css. Thêm runner/fixture/smoke, cấu hình Playwright UAT, test account-types và tests/uat.
- **Không chủ động xóa tệp mã nguồn, ảnh sản phẩm hoặc database.** Các bằng chứng E2E thất bại trước sửa được giữ riêng với hậu tố before-retry; output build là tệp sinh tự động. Giữ các thay đổi có sẵn từ phiên trước, gồm kiểm thử giá gợi ý phối đồ.

Bằng chứng tổng hợp: verification/final-uat/final-results.json, journey.json, smoke.json, responsive-*.json, ảnh screenshots/, bản backup/restore riêng. Dừng sau Final UAT; không bắt đầu phase khác.
