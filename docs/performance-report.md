# Hiệu năng local — số đo thực tế

COMPLETED: đã đo và tối ưu có mục tiêu; không chứng nhận tải production.

## Phương pháp

Trước sửa có verification/phase5-performance-before.json (Next dev 127.0.0.1:3000, HTTP serial một warm-up bỏ qua + 3 mẫu, lấy cả body) và phase5-query-before.json (SQLite main read-only, một warm-up + 7 mẫu/query). Sau sửa chạy cùng cách: phase5-performance-after.json, phase5-query-after.json. Không benchmark song song đồng bộ tải, không suy ra phần trăm tốc độ chung từ dev server.

## Catalog query trực tiếp

| Tham số | Median ms trước → sau | JSON bytes trước → sau | Giảm bytes |
|---|---|---|---|
| {} | 4.02 → 3.54 | 114496 → 95667 | 16.4% |
| {'sort': 'price-asc'} | 3.43 → 3.36 | 78918 → 59939 | 24.0% |
| {'sort': 'popular'} | 3.91 → 3.93 | 114496 → 95667 | 16.4% |
| {'q': 'dress'} | 3.04 → 2.72 | 80994 → 61723 | 23.8% |
| {'color': 'White'} | 1.34 → 1.39 | 34 → 34 | 0.0% |

Color=White không có dữ liệu trong catalog tiếng Việt nên đây là đo empty filter, không đại diện filter màu có kết quả. CUA kiểm đổi Xanh bạc hà→Trắng của Bộ Lotis và gallery URL thực; không ngụy tạo baseline mới sau sửa.

Đã select trường card cần thay vì mọi Product scalar, vẫn giữ variants để effectivePrice/swatch/stock đúng. Pagination 24 của storefront đã có. Price/popular sort vẫn lọc IDs rồi SQL + hydration, chưa có lý do thay lớn vì bộ dữ liệu nhỏ. Dùng Map để khôi phục thứ tự hydrate thay lookup lặp. Không thêm dependency, cache riêng tư hoặc bỏ guard transaction.

Admin products/orders và customer order history thêm 24/trang thay unbounded; inventory30 và media24 có sẵn. Dashboard vẫn aggregate all orders cho tổng hiện hữu, nhưng chỉ select trường cần và 3 trường item, bỏ địa chỉ/token/payment proof không dùng; chưa làm analytics Phase6 hoặc chứng nhận dashboard lớn. Vẫn có thể tối ưu SQL aggregates nếu dữ liệu tăng.

## HTTP dev trước/sau

| Route | Median ms trước → sau | HTML bytes trước → sau |
|---|---|---|
| / | 139 → 107 | 271432 → 271337 |
| /trang-phuc | 129 → 120 | 275824 → 254326 |
| /trang-phuc?color=White&sort=price-asc | 63 → 68 | 79492 → 79482 |
| /san-pham/ls-yeri-dress | 68 → 82 | 134012 → 133921 |
| /gio-hang | 49 → 55 | 61050 → 61060 |
| /thanh-toan | 49 → 54 | 61055 → 61058 |
| /tai-khoan | 48 → 56 | 66661 → 66849 |
| /admin/don-hang | 53 → 53 | 66827 → 66816 |
| /admin/kho-hang | 50 → 53 | 66834 → 66816 |
| /images/awaiting-photo.svg | 1 → 1 | 475 → 475 |

Các route private trong phép đo này là **anonymous redirect**; cart/checkout là empty state. Không gọi chúng là thời gian authenticated order history/admin hay populated checkout. Có dao động và vài route chậm hơn; không tuyên bố tất cả nhanh hơn. Lợi ích chắc chắn là giảm payload catalog và giới hạn danh sách quản trị.

## Đo riêng có đăng nhập sau sửa

verification/phase5-private-after.json trên production build test3101 ghi 3 mẫu admin product/orders/inventory và bytes thực. Không có authenticated baseline trước nên **không tính speedup private**. Browser populated cart/checkout kiểm chức năng và responsive, không có Web Vitals trước/sau. Không thực hiện load/stress test hoặc Lighthouse, không bịa LCP/CLS.

Ảnh dùng cơ chế Next Image/sizes/cache ảnh công khai đã có; SVG fallback không qua optimize, uploads mới WebP resize. Audit lưu size/dimensions cho 1.423 URL. Không cache tài khoản/đơn/tài chính: API no-store, server reads cookies/dynamic.
