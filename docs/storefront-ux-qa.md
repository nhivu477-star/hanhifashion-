# QA storefront và Admin Phase5

COMPLETED cho phạm vi kiểm thử representative dưới đây; không tuyên bố exhaustive mọi tổ hợp sản phẩm/filter/thiết bị.

## Giao diện giữ nguyên

Áp dụng design-taste-frontend để rà soát ảnh render, giữ logo PNG chính thức, menu cũ đã duyệt, typography/bố cục LSOUL hiện tại. Không quay lại mô hình công sở cũ hoặc đổi palette. Không redraw direction, animation hay thêm ảnh vì yêu cầu Phase5 cấm redesign không cần thiết.

Static taste lint trên src: 24 FAIL/8 WARN (`verification/phase5-design-lint.log`), chủ yếu hairline, shadow/dấu ngăn và policy eyebrow/numbering sẵn có. Đây là luật thẩm mỹ của skill, **không phải lỗi build hay WCAG đã xác nhận**. Các chi tiết đã duyệt và convention bảng/form được giữ theo ưu tiên yêu cầu người dùng; không báo taste lint PASS. Inspector CDP riêng không chạy vì mọi browser UI dùng CUA. Đo DOM + screenshot CUA thay thế; không nhận kết quả inspector tự động.

Đánh giá hình ảnh chủ quan: design7/10, usability7.5/10, creativity6/10, content6/10; weighted6.85/10. Hệ thống bố cục nhất quán, ảnh không bị kéo giãn, tên/giá cùng hàng; hạn chế lớn là ảnh và nội dung merchandise chưa xác minh, không giải quyết bằng ảnh giả. Không phải chứng nhận thiết kế hoặc accessibility.

## Responsive đã thực thi

35 phép đo DOM trong phase5-responsive.json: homepage, listing, detail, populated cart, checkout, admin-product và checkout-final, mỗi nhóm đủ 360/390/768/1024/1440. Tất cả document.scrollWidth <= innerWidth. Listing24 card, tọa độ giá cùng hàng. Admin360 có table scroll616/client328 trong vùng riêng, document360, không phá toàn trang. Chỉ báo chất lượng và phân trang nhìn/thao tác được.

25 ảnh full-page chính xác chiều rộng tương ứng: verification/phase5-{home,listing,detail,cart,checkout}-full-{width}.jpg. Các fold-*.jpg lấy phần đầu từ ảnh full để xem rõ. Ảnh thumbnail viewport ban đầu có kích thước vật lý thay đổi theo IAB nên dùng bộ full-page cho đối chiếu. Viewport tạm đã reset sau kiểm tra.

## Browser E2E CUA thực tế

- Main read-only: menu mobile mở, focus nút đóng; Escape đóng/aria-expanded false. Search mobile nhập Ricci → đúng1 thiết kế. Modal filter hiển thị danh mục/màu/size/giá, đóng được; thêm accessible label Bộ lọc sản phẩm.
- Chọn M hiển thị SKU/tồn thực. Bộ Lotis Xanh bạc hà→Trắng đổi URL/alt/gallery đúng bản ghi; phase5-color-mapping.json. Không xác nhận màu hàng thực qua URL.
- DB test: ảnh thiếu có chủ đích ở qa-order-19 → SafeImage tải awaiting-photo.svg, không hiện ảnh màu khác. phase5-fallback.jpg.
- DB test vòng đầu: chọn M QA-V18 → thêm giỏ → checkout 540.000+30.000=570.000 → đặt COD guest → đơn lưu UNPAID → hủy → CANCELLED, movement -1/+1 đúng một lần. Đối chiếu DB trong phase5-browser-results.json; phase5-browser-order.png.
- DB test bản cuối: login từ /admin/san-pham trở về đúng trang, lọc QA-ORDER18, chỉ báo/lý do readiness, phân trang. phase5-admin-quality.jpg. Chụp lại populated cart/checkout bản cuối đủ5 viewport, mã giảm giá không gợi ý code cứng chưa chắc tồn tại.
- Khách Phase3 QA login trở về đúng /tai-khoan/don-hang/<id>, thấy timeline LOCAL_MANUAL và hạn72giờ từ DB; gửi yêu cầu lỗi1 món thành công, Chờ xem xét, lượng còn lại0. phase5-customer-return.jpg và bản ghi REQUESTED được đối chiếu.
- Form/gallery sử dụng dialog native và focus-visible hiện hữu; chỉ sửa label còn thiếu. Không báo đã chạy audit screen reader đầy đủ hoặc mọi touch target đạt44px. Giữ kích thước visual đã duyệt, các swatch nhỏ còn cần đánh giá nếu mở production.

Browser dùng hai DB test được ghi tường minh trong phase5-browser-results.json; vòng hồi quy cuối tạo DB khác. Không dùng screenshots phase trước làm bằng chứng mới. Không sửa dữ liệu main trong browser.

## Rà soát các trang còn lại

26 route smoke HTTP thực thi trong phase5-route-smoke.json: homepage, new/category/shoes/bags/accessories, collections, sale, search có/không kết quả, product, wishlist, cart, checkout, login/register/forgot, tracking, contact/about và4policy, account/order history authenticated. Tất cả200 và không Next not-found marker. Đây là kiểm route/render, không phải mọi nút đã được click.

Quyền sở hữu đơn/ảnh/return, filter admin, timeline/shipping/COD/refund, validation/đúp submit được kiểm integration Phase1–4 mới chạy lại. Các form dùng trạng thái busy, message/error và server validators hiện hữu. Không bật email thật, carrier/payment. Newsletter/contact lưu DB, không khẳng định có email gửi.

## Sửa có mục tiêu

Login/register returnTo được kiểm server, checkout giữ context. Product cards không lấy ảnh màu khác khi màu chọn thiếu ảnh. Product editor nhận nested URLs và size giày; các danh sách lớn phân trang. API no-store và thông báo parser an toàn. Không đổi tên/giá/ảnh/tồn hàng loạt.


## Dọn tệp sau bàn giao theo yêu cầu chủ dự án

Ảnh chụp QA cũ và các báo cáo phase lịch sử đã chuyển vào Thùng rác có manifest `verification/cleanup-result.json`. Giữ ba ảnh minh chứng hiện tại (admin-quality, customer-return, fallback), các JSON kết quả và backup. Các phép kiểm thử mô tả phía trên đã thực thi trước khi dọn; bộ ảnh full/fold không còn nằm trong dự án, có thể khôi phục từ vị trí ghi trong manifest. Không xóa dữ liệu database hoặc ảnh còn tham chiếu. Sau dọn: audit 1.423 URL ảnh không có tệp lỗi/thiếu, 65/65 unit PASS, trang chủ và sản phẩm HTTP200; 46 bảng dữ liệu chính không đổi.
