# HÀ NHI FASHION — Hoàn thiện full-stack

Ngày 19/10/2026. Chỉ local; không push/deploy, không gọi API thanh toán/hãng vận chuyển. Không xóa tệp hoặc reset dữ liệu.

## Đã hoàn thành

- Kiểm tra 47 kết nối API/form tĩnh và rà soát các thao tác động của nhân viên, giao nhận, đổi trả; không còn route chưa kết nối trong danh sách kiểm tra. Giữ kiến trúc Next.js Route Handler → service → Prisma/SQLite và RBAC hiện hữu.
- Bổ sung `GET/POST /api/preferences`, `POST /api/admin/currencies`, service lưu/đọc tùy chọn, hook `usePreferences`, Context dùng chung và các trạng thái lưu/lỗi. Ngăn truyền userId/role từ client, kiểm tra origin và quyền mới nhất tại service, ghi audit khi đổi cấu hình tiền tệ.
- Chuyển Việt/Anh trên Storefront, Admin, Seller và tài khoản, gồm nội dung chính sách, form, thông báo/lỗi và nhãn trợ năng. Dùng React để render bản dịch, không sửa DOM sau hydration. Tên riêng, SKU, mã tham chiếu và dữ liệu gốc được giữ lại.
- Cookie lưu tùy chọn của trình duyệt; SQLite lưu lựa chọn khách vãng lai và tài khoản. Giữ lựa chọn qua chuyển trang, đăng nhập, tải lại và đăng xuất; đồng bộ tab qua thông báo storage. Kiểm tra phiên mới không có cookie tùy chọn vẫn đọc đúng lựa chọn của tài khoản, gồm ngôn ngữ tiêu đề trang.
- Khu vực VN/SG/US/GB/FR với nhãn địa chỉ, kiểm tra số điện thoại và postcode tương ứng. Địa chỉ mới theo lựa chọn khu vực; địa chỉ đã lưu giữ quốc gia thực của nó. Chọn địa chỉ checkout đồng bộ khu vực. Chỉ VN được quote/checkout; các nơi khác chỉ xem hàng/lưu địa chỉ. UI và server cùng chặn vùng chưa hỗ trợ trước khi tạo đơn/trừ kho.
- VND/USD/EUR/SGD mặc định; cho phép cấu hình thêm ISO currency và tỷ giá tại Admin → Cài đặt → Tỷ giá hiển thị. Tỷ giá là bảng tham chiếu local có ngày/nguồn, không phải giá thị trường hiện tại. Thanh toán, COD, hoàn tiền và mọi phép tính đơn vẫn dùng số nguyên VND trên server; checkout hiển thị thêm tổng VND. Không dùng giá/tỷ giá từ trình duyệt để tính tiền.
- Sửa xóa sản phẩm ngừng bán khỏi giỏ và danh sách yêu thích, vẫn giới hạn thao tác trong giỏ/danh sách của người đang sử dụng. Chặn hàng không khả dụng khi thêm/mua vẫn được giữ.

Cấu trúc bổ sung: `ShopperPreference` (FK User), Address/Order thêm `countryCode`, `postalCode`; cấu hình tỷ giá ở StoreSetting. Migration cộng thêm, không ghi đè dữ liệu cũ. Chi tiết: [Ngôn ngữ, khu vực và tiền tệ](localization-and-currency.md).

## Kết quả kiểm thử

| Kiểm tra | Kết quả |
| --- | --- |
| Unit | 92/92 đạt |
| API/tích hợp Phase 1–6 | 141/141 đạt |
| Browser toàn bộ | 26/26 đạt |
| Browser bổ sung sau chỉnh sửa đồng bộ/ngôn ngữ | 4/4 đạt |
| Responsive | 360, 390, 768, 1024, 1440px; cả giao diện Anh của Seller: không tràn ngang toàn trang |
| TypeScript / ESLint / production build | Đạt |
| Bảo toàn database chính | 70.309 bản ghi cũ được đối chiếu, không thay đổi nội dung các cột cũ; 1.000 đơn và 555 sản phẩm giữ nguyên |
| Toàn vẹn SQLite | integrity_check=ok, foreign_key_check=0 |
| Sao lưu/phục hồi | Bản sao độc lập khớp nội dung mọi bảng |

Kiểm tra mới bao gồm: chọn/lưu ngôn ngữ trên UI, SSR và title, chuyển tiền tệ, persistence qua tài khoản/phiên mới/đăng xuất, checkout luôn VND, chống sửa tổng/tỷ giá client, chặn vùng giao hàng, địa chỉ quốc tế sai postcode, CSRF, chặn chèn userId, Seller không sửa tỷ giá, ngăn cấu hình trùng mã và xóa hàng ngừng bán.

Đã khắc phục nhãn trợ năng của dropdown tùy chọn sau kiểm thử. Một kỳ vọng ban đầu chưa cộng phí giao hàng vào số VND được sửa về tổng đúng từ nghiệp vụ. Bộ test mở rộng chạm giới hạn đăng nhập do dùng chung danh tính mạng; đã tách nhóm khách kiểm thử, giữ nguyên giới hạn bảo vệ và chạy lại đạt.

Chứng cứ ở `verification/fullstack/`: unit.log, integration.log, browser-final.log, browser-locale-final.log, typescript.log, lint.log, build.log, connections.json, data-preservation.json, backup-restore.json, localization-responsive.json và các PNG. Các test ghi dữ liệu đều dùng database riêng. Không thay đổi mật khẩu hoặc tài khoản hiện hữu.

## Sử dụng

Mở `http://localhost:3000`. Thanh **Ngôn ngữ / Khu vực / Tiền tệ** ở đầu trang → chọn → **Lưu tùy chọn**. Các giao diện khác dùng cùng lựa chọn. Admin có quyền `content.manage` quản lý tỷ giá; Seller và Buyer không có quyền này.

Không bật bán hàng thật. Những sản phẩm chưa xác minh/giá 0 và dữ liệu thiếu giá vốn vẫn giữ nguyên để chủ dự án rà soát; không tự suy đoán hay sửa thông tin hàng hóa.
