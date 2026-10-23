# Quản lý ảnh local

Giữ kiến trúc public/images + public/uploads; MediaAsset/ProductImage/ColorImage hiện hữu. `position=0` là ảnh chính, các dòng tiếp theo thứ tự gallery. Editor sản phẩm và editor từng màu cho nhiều URL; upload trả đường dẫn mới để người sửa thêm vào đúng màu. Không tự gán ảnh màu khác.

Đồng bộ gallery thêm ảnh sau `MAX(position)` hiện có, không dùng vị trí trong manifest đã lọc lỗi tải. Migration sửa gallery có vị trí trùng/âm bằng thứ tự `position, id`, giữ nguyên ID, URL và mọi ảnh; không thay gallery hợp lệ. Đồng bộ lại cùng manifest không thêm ảnh trùng URL trong cùng màu.

Bổ sung validator `local-images.ts`: allowlist đường dẫn nested /images hoặc /uploads, không ../, ký tự URL lạ, loại tệp thực bằng sharp, kiểm symlink realpath nằm trong public, file không rỗng <=10MB, tối đa 40 megapixel. SVG local chỉ placeholder an toàn, không script/foreignObject/events/external active links. Không hỗ trợ upload SVG. Upload raster PNG/JPEG/WebP <=5MB được decode có giới hạn pixels, strip metadata/rotate, resize trong 1800x2400, lưu WebP tên ngẫu nhiên exclusive mode0600. Quyền server products.update hoặc content.manage trước đọc form.

Sau đọc multipart và decode bất đồng bộ, upload phải kiểm lại phiên/quyền với permissionVersion đã xác thực trước khi ghi file/audit. Nếu phiên bị thu hồi hoặc ghi file/audit thất bại, không trả thành công và dọn chỉ artifact do request này tạo; không xóa ảnh sẵn có hoặc artifact của request khác. Đây là hợp đồng an toàn, không phải tuyên bố test đã PASS.

Media editor kiểm bytes, product-color ownership, bằng chứng/license/authorizedUse/garmentVerified trước APPROVED. Editor product/color kiểm file trước commit. Nested assets cũ sửa được; URL lịch sử được giữ, ngoại trừ đợt gỡ ảnh AI/sinh tự động đã xác minh theo yêu cầu chủ dự án.

Xóa hồ sơ: /admin/thu-vien-anh chọn asset, nhập lý do >=10 ký tự, xác nhận. API admin/media-delete yêu cầu products.update. Trong transaction kiểm ProductImage/ColorImage (id hoặc URL), OrderItem snapshot, Banner/Collection/Category/StoreSetting. Nếu còn tham chiếu, từ chối. Chỉ xóa metadata không còn sử dụng; **tệp gốc không bị xóa** để tránh phá URL lịch sử hoặc tham chiếu ngoài schema. Dọn orphan files thủ công ngoài phạm vi nghiệp vụ.

Giữ SafeImage (Next Image sizes + native WebP optimization, stable width/height + fallback awaiting-photo.svg). Product color gallery chỉ đọc ColorImage đúng màu; filter màu ở listing dùng gallery màu, không lấy override tùy ý từ setting. Nếu màu không có ảnh, dùng fallback trung tính, không thay bằng màu mặc định.

Gallery chi tiết dùng chung một khung ảnh cho mọi sản phẩm và màu. Chiều cao tối đa là `clamp(160px, calc(100svh - 300px), 640px)` để chừa chỗ cho header, breadcrumb và ảnh thu nhỏ; ảnh chính và thumbnail dùng `object-fit: contain`, giữ tỷ lệ và không cắt ảnh. Khung tự thu nhỏ theo điện thoại hoặc màn hình thấp; nút chuyển ảnh, chọn thumbnail và hộp phóng to vẫn hoạt động độc lập. Không sửa kích thước hoặc nội dung tệp ảnh gốc.

Toàn trang chi tiết giới hạn bề ngang 1160px và căn giữa bằng container chung. Desktop chia hai cột bằng nhau, cách 28px; khung ảnh chiếm đủ chiều rộng cột và dùng nền trắng để ảnh không bị dồn sang trái khi giới hạn chiều cao. Khung mua hàng có padding 16px, tên sản phẩm 24px; điện thoại dùng một cột với lề 16px. Các phần đề xuất và đánh giá giữ cùng lề với cụm chi tiết.

Khung thông tin mua hàng có khoảng cách và viền thống nhất với gallery; hai nút mua hàng đặt cạnh nhau trên desktop, xếp dọc dưới 1024px. Chi tiết thiết kế, chăm sóc và chính sách mặc định thu gọn; không lặp mô tả ngắn hoặc hiển thị dòng thuộc tính chung chung “Theo thiết kế”. Gợi ý phối đồ chỉ xuất hiện khi có sản phẩm phù hợp còn hàng. Danh sách sản phẩm liên quan nằm trước đánh giá, cách nội dung chính 32px (24px trên điện thoại); các phần dùng chung lề nội dung, tiêu đề 22px/20px và nội dung 14px.

Điều hướng sang sản phẩm khác đặt cuộn về đầu trang ngay khi pathname đổi, không kế thừa vị trí ở vùng đề xuất của trang trước. Chọn màu chỉ thay query trong cùng sản phẩm nên không đặt lại cuộn. Nút Back/Forward của trình duyệt vẫn dùng cơ chế phục hồi vị trí của Next.js; không đặt lại cuộn khi nhận `popstate`.

## Gỡ ảnh AI và ảnh sản phẩm sinh tự động

Đã xóa thật 3.398 tệp: 3.390 SVG SKU do bộ vẽ catalog sinh, 1 SVG danh mục do `scripts/assets.py` sinh, 5 PNG có metadata C2PA ghi `ChatGPT`, `gpt-image`, `trainedAlgorithmicMedia`, 1 banner đã chỉnh quần áo bằng image editor theo hồ sơ importer và 1 bản upload của ảnh hero AI. Hai bản tối ưu ảnh hero trong cache Next cũng đã xóa. **Logo là ngoại lệ được chủ dự án yêu cầu giữ**, dù có metadata AI.

Đã bỏ bộ vẽ SVG, nhánh tái sinh asset, importer banner đã chỉnh bằng AI và script gán lại PNG demo. Seed/enrichment tạo sản phẩm chưa có ảnh bằng gallery rỗng; không tạo ảnh hàng hóa giả hoặc tự gán ảnh màu khác. Ảnh editorial có nguồn Pexels vẫn dùng cho bộ sưu tập/banner, không làm bằng chứng ảnh sản phẩm.

Đã xử lý cả dữ liệu không active, snapshot đơn hàng và mọi DB test/backup local tìm thấy: quét 136 DB, sửa 77 DB; 212.175 thay đổi dòng/trường, trong đó DB chính sửa 1 banner và 64 danh mục. Gỡ 1 snapshot JSON chỉ lưu gallery minh họa cũ; không xóa đơn hàng, thanh toán hoặc lịch sử nghiệp vụ. Các trường ảnh bắt buộc dùng chuỗi rỗng khi thiếu ảnh; bản ghi gallery/MediaAsset của asset bị gỡ được xóa.

Kiểm tra sau xử lý: toàn bộ tệp `public` ngoài tập xóa giữ nguyên SHA-256; giữ 4.170 ảnh LSOUL, 311 ảnh SAINT AND SOFIA, 14 ảnh Pexels trong `demo-photos`, ảnh editorial và logo. Có 4.170 URL ảnh không rỗng trên catalog active/banner/danh mục/bộ sưu tập, không thiếu tệp; không có vi phạm FK hoặc tham chiếu asset bị gỡ trong 136 DB. Seed thật trên DB schema rỗng chạy thành công: 320 sản phẩm, 1.130 màu, không tạo ProductImage/ColorImage giả và không tái sinh tệp đã xóa. Chi tiết bằng chứng tại `verification/ai-image-removal.json`.

Chưa có bằng chứng AI đủ chắc cho banner gốc người dùng cung cấp, bản banner xanh không logo và ba banner `thu-thao`; giữ nguyên, không suy đoán từ vẻ ngoài. Upload 16×16 là fixture kiểm thử raster (không phải ảnh demo sản phẩm); giữ nguyên. `awaiting-photo.svg` là trạng thái thiếu ảnh trung tính hiện hữu, không phải ảnh hàng hóa.
