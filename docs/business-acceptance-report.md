# Báo cáo kiểm chứng HÀ NHI FASHION

## Phạm vi

Ứng dụng local thống nhất ba vai trò CUSTOMER / SELLER / ADMIN. ADMIN toàn quyền; SELLER vận hành sản phẩm, tồn, đơn, giao nhận và hỗ trợ nhưng không quản trị tài khoản/nhân viên/tài chính/giá vốn/lợi nhuận; CUSTOMER chỉ thao tác dữ liệu của mình. Menu và API/service cùng dùng ma trận quyền, vai trò không hợp lệ mặc định bị từ chối.

## Kết quả thực thi

| Kiểm tra | Kết quả |
|---|---|
| Unit (`npm test`) | 115 đạt, 16 tệp |
| Nghiệp vụ (`npm run test:business -- --reuse-build`) | 199 đạt: đơn 17, giao nhận 18, đổi trả 28, phân quyền 28, danh mục 17, analytics 33, nghiệm thu 58 |
| ESLint (`npm run lint`) | Đạt |
| TypeScript (`npx tsc --noEmit`) | Đạt |
| Production build (`npm run build`) | Đạt |
| Browser UAT (`npx tsx scripts/testing/run-uat-browser.ts`) | 26/26 đạt; responsive 360/390/768/1024/1440 px |
| Backup/restore database UAT | Integrity/FK đạt; toàn bộ bảng và nội dung sau phục hồi bằng bản nguồn |
| Liên kết tài liệu | 34 tệp Markdown, không có liên kết nội bộ bị hỏng tại thời điểm kiểm |
| SQLite chính | `quick_check`: ok; không có lỗi khóa ngoại |

Các bộ nghiệp vụ tạo database cô lập, chạy qua HTTP/API với SQLite thật; bao gồm cạnh tranh tồn kho, thu hồi phiên, quản trị viên hoạt động cuối, kiểm quyền độc lập tại service, audit rollback và quyền sở hữu dữ liệu. Không dùng kết quả của các phiên bản cũ để thay thế kiểm tra hiện tại.

## Kiểm tra giao diện thực tế

- Đã đăng nhập qua form bằng tài khoản ADMIN, SELLER và CUSTOMER trên database thử riêng. ADMIN mở tổng quan; SELLER đến `/admin/don-hang`, không có liên kết quản trị tài khoản/tài chính; CUSTOMER đến cửa hàng, dùng trang tài khoản và bị từ chối khi mở quản lý tài khoản.
- Đã xác nhận cookie đăng nhập hoạt động trên trình duyệt WebKit với bản production chạy HTTP loopback. Host production ngoài loopback vẫn dùng cookie Secure.
- Trang `/gioi-thieu` hiển thị tiêu đề **Thời trang nữ, giày, túi xách & phụ kiện**, cùng đề mục và nội dung tương ứng; tiêu đề trình duyệt đồng bộ. Giao diện công khai không hiển thị liên kết quản trị khi chưa có vai trò nhân viên/quản trị.
- Form tài khoản dùng POST để tránh đưa mật khẩu lên URL nếu submit trước khi JavaScript sẵn sàng. Đăng ký chấp nhận email hoặc số điện thoại và mật khẩu từ tám ký tự, khớp validator API.

## Bảo toàn dữ liệu và ảnh

Backup trước thay đổi: `verification/backups/before-role-consolidation.db`. Không reset/seed database chính, không đổi mật khẩu, không xóa uploads hoặc ảnh đang dùng. Chuyển vai trò cũ sang ba vai trò chuẩn, tăng phiên bản quyền và thu hồi phiên nhân viên để đăng nhập lại.

Đối chiếu với backup: 55 bảng nghiệp vụ không thay nội dung; mọi trường ColorImage ngoài `position` được giữ nguyên. Migration chỉ sửa gallery có vị trí trùng/âm, không xóa ảnh hay sửa ID/URL. Không còn cặp `(colorId, position)` trùng; integrity/FK đạt.

Đã chạy chính script đồng bộ gallery với fixture local và database sao chép: gallery có ảnh ở vị trí 9 thêm ảnh mới ở vị trí 10; lần chạy tiếp theo thêm 0 ảnh. Không tải mạng trong smoke này; fixture đã được dọn sau kiểm tra.

Audit read-only hiện tại: 235 sản phẩm, 4.167 URL ảnh; không có tệp ảnh thiếu/không hợp lệ. Sau sửa thứ tự gallery: 234 sản phẩm NEEDS REVIEW, một INVALID do giá 0 (`HN-TP-0167`, Bộ Buzz), không có sản phẩm tự nâng READY.

## Giới hạn còn lại

- Giá chính xác của Bộ Buzz, giá vốn, hàng thật, nguồn tồn và quyền sử dụng ảnh cần chủ cửa hàng xác minh; không tự suy đoán hoặc sửa giá để đạt kiểm tra.
- Tệp credential local cũ không khớp database chính; đã sửa hướng dẫn để không khẳng định sai rằng đăng nhập được. Không tự đặt lại mật khẩu tài khoản hiện hữu. Tài khoản thử chỉ dùng với database cô lập.
- Hủy một phần chưa có chính sách tài chính được duyệt: API chặn và UI không cung cấp trên database chính; positive fixture không phải phê duyệt. Đổi SKU chỉ cùng đơn giá lịch sử, không tự bù chênh lệch.
- Đổi trả chỉ lỗi được xác minh trong đủ 72 giờ từ mốc nhận hàng. Giao nhận LOCAL_MANUAL và COD/hoàn tiền là mô phỏng, không phải giao dịch tiền hoặc hãng vận chuyển thật.
- Không chứng nhận production nhiều instance, tải lớn, WCAG đầy đủ, quyền thương mại của ảnh hay sẵn sàng mở bán. Analytics không bịa hành vi quá khứ/giá vốn; doanh số theo ngày tạo đơn không phải dòng tiền theo ngày thu.

## Tái chạy

`npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`; `npm run test:business -- --reuse-build` sau build; browser UAT: `npx tsx scripts/testing/run-uat-browser.ts`; dữ liệu: `npm run data:quality`. Không chạy reset/seed lên `prisma/dev.db`. Không ghi credential vào báo cáo.
