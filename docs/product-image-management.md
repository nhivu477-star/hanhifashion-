# Quản lý ảnh local

Giữ kiến trúc public/images + public/uploads; MediaAsset/ProductImage/ColorImage hiện hữu. `position=0` là ảnh chính, các dòng tiếp theo thứ tự gallery. Editor sản phẩm và editor từng màu cho nhiều URL; upload trả đường dẫn mới để người sửa thêm vào đúng màu. Không tự gán ảnh màu khác.

Bổ sung validator `local-images.ts`: allowlist đường dẫn nested /images hoặc /uploads, không ../, ký tự URL lạ, loại tệp thực bằng sharp, kiểm symlink realpath nằm trong public, file không rỗng <=10MB, tối đa 40 megapixel. SVG local chỉ placeholder an toàn, không script/foreignObject/events/external active links. Không hỗ trợ upload SVG. Upload raster PNG/JPEG/WebP <=5MB được decode có giới hạn pixels, strip metadata/rotate, resize trong 1800x2400, lưu WebP tên ngẫu nhiên exclusive mode0600. Quyền server products.update hoặc content.manage trước đọc form.

Media editor kiểm bytes, product-color ownership, bằng chứng/license/authorizedUse/garmentVerified trước APPROVED. Editor product/color kiểm file trước commit. Nested assets cũ sửa được; không thay đường dẫn cũ trong đơn hàng.

Xóa hồ sơ: /admin/thu-vien-anh chọn asset, nhập lý do >=10 ký tự, xác nhận. API admin/media-delete yêu cầu products.update. Trong transaction kiểm ProductImage/ColorImage (id hoặc URL), OrderItem snapshot, Banner/Collection/Category/StoreSetting. Nếu còn tham chiếu, từ chối. Chỉ xóa metadata không còn sử dụng; **tệp gốc không bị xóa** để tránh phá URL lịch sử hoặc tham chiếu ngoài schema. Dọn orphan files thủ công ngoài phạm vi Phase5.

Giữ SafeImage (Next Image sizes + native WebP optimization, stable width/height + fallback awaiting-photo.svg). Product color gallery chỉ đọc ColorImage đúng màu; filter màu ở listing dùng gallery màu, không lấy override tùy ý từ setting. Nếu màu không có ảnh, dùng fallback trung tính, không thay bằng màu mặc định.

Audit 1.423 URL độc nhất: 0 missing/invalid files. Metadata width/height/type/bytes trong JSON; SVG có dimension null. Điều này chỉ xác nhận tệp, không xác minh quyền sử dụng/đúng thiết kế/màu thật. Catalog tham khảo vẫn NEEDS REVIEW. Không tải hoặc tạo thêm ảnh thời trang.
