# Nghiệm thu 31 nghiệp vụ phù hợp cửa hàng HÀ NHI

Tiêu chuẩn thực thi dựa trên PROJECT_SPEC và chính sách cửa hàng hiện hành. Đây là yêu cầu nghiệm thu, không phải kết quả kiểm thử phiên bản mới.

Đọc kết quả thực thi tại `business-acceptance-report.md`. Danh mục có 31 Use Case, mỗi mục có 6 nhóm tiêu chí Given–When–Then (186 nhóm). PASS chỉ được ghi khi phiên bản đang nghiệm thu có bằng chứng thực thi, không phải cam kết mọi tổ hợp hay sẵn sàng bán thật.

## Phạm vi áp dụng

- **UC01:** Tài khoản mua hàng dùng role CUSTOMER ; đăng nhập bằng email hoặc số điện thoại. Đăng ký yêu cầu ít nhất một trong hai; giữ validation và quy tắc duy nhất của định danh hiện hành. Đăng ký hiện tự đăng nhập; không tự cấp quyền từ payload.
- **UC03:** Email đăng nhập không đổi qua form hồ sơ; sửa tên/SĐT và địa chỉ riêng, địa chỉ mặc định, mật khẩu, ngôn ngữ/tiền tệ. Không sửa snapshot địa chỉ đơn cũ.
- **UC04:** Preview local có ảnh tham chiếu, không coi là hàng/ảnh đã xác minh thương mại. Chế độ commercial vẫn kiểm publication/readiness.
- **UC09:** Chỉ COD nội bộ theo PROJECT_SPEC; phương thức khác không được trình bày như thanh toán thật. Địa chỉ VN, tiền giao dịch VND.
- **UC10:** Thu COD, chuyển tiền về và đối soát mô phỏng độc lập; không kết nối cổng thanh toán hoặc xác thực tiền thật.
- **UC12:** Hủy toàn bộ theo quy tắc hiện hành; hủy một phần bị khóa chờ duyệt chính sách. Đơn đang giao đi theo shipment/return, không hoàn tồn tùy tiện.
- **UC13:** Dùng danh sách trạng thái, lọc ngày, tìm mã, ưu tiên và phân công trong module hiện tại; không thêm hệ thống nhân sự hoặc chấm công.
- **UC14:** Checkout đã trừ tồn và giữ snapshot; xác nhận không trừ lại. Không dùng tồn còn lại sau khi đã xuất để kết luận đơn mua đơn vị cuối là thiếu hàng.
- **UC15:** Giữ enum PROCESSING và ghi packedAt/packedBy cùng checklist SKU/màu/size/lượng. Tạo shipment hoặc chuyển SHIPPING phải đã kiểm tra đóng gói; không thêm enum phá lịch sử cũ.
- **UC16:** Mã HN-SHIP-* là hồ sơ giao nhận local, không phải mã hãng. Không gọi logistics bên ngoài.
- **UC18:** Đánh giá xác minh mua sau giao; SELLER có quyền hỗ trợ phi tài chính, trả lời và ẩn/hiện có lý do. Hỗ trợ dùng inquiry + replies nội bộ, không xây chat thời gian thực ngoài phạm vi.
- **UC21:** Ưu tiên lưu nháp/readiness, ẩn sản phẩm/màu và giữ SKU/ảnh đã có ledger; không cung cấp hard delete làm mất snapshot. Không suy ra quyền sử dụng thương mại từ ảnh tham chiếu.
- **UC23:** Hai loại voucher hiện hành FIXED/PERCENT; một mã mỗi đơn. Phí ship chuẩn 30.000đ và miễn ship theo ngưỡng net hiện hành. Không tự sáng tạo chính sách chồng mã, đối tượng riêng hay đổi mức phí ngoài cấu hình đã duyệt.
- **UC26:** Chỉ lỗi được xác minh trong đủ 72 giờ từ mốc nhận; ảnh không bắt buộc theo chính sách hiện hành. Đổi SKU chỉ cùng đơn giá lịch sử; khác giá bị từ chối chờ chính sách.
- **UC27:** SIMULATED REFUND, không chuyển tiền thật; duyệt và thực thi theo quyền riêng, giữ trần khoản thực thu và số lượng được phép.
- **UC29:** Phiếu DRAFT→SUBMITTED→APPROVED/CANCELLED; countedStock chỉ hàng bán được, damagedStock cách ly. Tồn sổ thay đổi trong thời gian chờ thì phải kiểm đếm lại, không ghi đè giao dịch.
- **UC30:** VI/EN, vùng/tiền tệ hiển thị được cấu hình; tỷ giá tham khảo local. Checkout/ledger luôn VND; vùng khác VN không giao hàng.
- **UC31:** Audit quan trọng atomic với dữ liệu DB; upload file được xác minh trước khi đưa vào catalog. Log từ chối chỉ chứa mã an toàn, không raw token/password/SQL.

## Tiêu chí từng nghiệp vụ

### UC01 — Đăng ký tài khoản

Tài khoản mua hàng dùng role CUSTOMER ; đăng nhập bằng email hoặc số điện thoại. Đăng ký yêu cầu ít nhất một trong hai; giữ validation và quy tắc duy nhất của định danh hiện hành. Đăng ký hiện tự đăng nhập; không tự cấp quyền từ payload.

**UC01-M — Luồng chính**

Given: Không có tài khoản trùng định danh email/số điện thoại

When: Nhập hồ sơ và mật khẩu hợp lệ → tạo tài khoản → đăng nhập

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC01-A — Luồng phụ áp dụng**

Given: Không có tài khoản trùng định danh email/số điện thoại

When: Email khác chữ hoa/thường được chuẩn hóa; wishlist được hợp nhất

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC01-E — Ngoại lệ**

Given: Không có tài khoản trùng định danh email/số điện thoại

When: Email trùng, điện thoại sai, mật khẩu ngắn/không khớp; chèn role không được nâng quyền

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC01-P — Quyền**

Given: Không có tài khoản trùng định danh email/số điện thoại

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Guest → CUSTOMER

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC01-I — Toàn vẹn và hậu điều kiện**

Given: Không có tài khoản trùng định danh email/số điện thoại

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: User duy nhất; passwordHash bcrypt; phiên HttpOnly; không lộ mật khẩu

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC01-U — UI/API/DB và trạng thái**

Given: Không có tài khoản trùng định danh email/số điện thoại

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Guest → CUSTOMER

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC02 — Đăng nhập và xác thực

Áp dụng các luồng hợp lệ trong module hiện hữu, theo PROJECT_SPEC và RBAC hiện tại.

**UC02-M — Luồng chính**

Given: Email hoặc số điện thoại và mật khẩu hợp lệ; tài khoản chưa bị khóa; Token còn hạn 30 phút, chưa dùng; Mật khẩu hiện tại đúng; tài khoản hoạt động

When: Đăng nhập → cookie → đúng trang theo quyền; đăng xuất → xóa phiên; Tạo mail local → dùng token → đổi hash → thu hồi phiên; Kiểm tra mật khẩu → đổi → thu hồi tất cả phiên

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC02-A — Luồng phụ áp dụng**

Given: Email hoặc số điện thoại và mật khẩu hợp lệ; tài khoản chưa bị khóa; Token còn hạn 30 phút, chưa dùng; Mật khẩu hiện tại đúng; tài khoản hoạt động

When: returnTo nội bộ hợp lệ; ADMIN/SELLER/CUSTOMER có điểm đến riêng; Email không tồn tại nhận cùng thông báo; retry sau rollback; Đăng nhập lại bằng mật khẩu mới

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC02-E — Ngoại lệ**

Given: Email hoặc số điện thoại và mật khẩu hợp lệ; tài khoản chưa bị khóa; Token còn hạn 30 phút, chưa dùng; Mật khẩu hiện tại đúng; tài khoản hoạt động

When: Sai mật khẩu, khóa, returnTo bên ngoài, phiên cũ/hết hạn; Token hết hạn, đã dùng; hai yêu cầu đồng thời chỉ một thành công; Sai mật khẩu cũ, phiên hết hạn, lỗi audit, hai lần đổi tranh chấp

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC02-P — Quyền**

Given: Email hoặc số điện thoại và mật khẩu hợp lệ; tài khoản chưa bị khóa; Token còn hạn 30 phút, chưa dùng; Mật khẩu hiện tại đúng; tài khoản hoạt động

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Mọi tài khoản hoạt động; Guest với token bí mật một lần; Tài khoản đăng nhập

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC02-I — Toàn vẹn và hậu điều kiện**

Given: Email hoặc số điện thoại và mật khẩu hợp lệ; tài khoản chưa bị khóa; Token còn hạn 30 phút, chưa dùng; Mật khẩu hiện tại đúng; tài khoản hoạt động

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Không tái sử dụng phiên bị thu hồi; không nâng quyền từ client; Claim token + hash + thu hồi phiên + audit cùng transaction; CAS hash cũ; hash và thu hồi phiên/audit atomic

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC02-U — UI/API/DB và trạng thái**

Given: Email hoặc số điện thoại và mật khẩu hợp lệ; tài khoản chưa bị khóa; Token còn hạn 30 phút, chưa dùng; Mật khẩu hiện tại đúng; tài khoản hoạt động

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Anonymous ↔ Authenticated; UNUSED → USED; Authenticated → Reauthentication required

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC03 — Quản lý thông tin cá nhân

Email đăng nhập không đổi qua form hồ sơ; sửa tên/SĐT và địa chỉ riêng, địa chỉ mặc định, mật khẩu, ngôn ngữ/tiền tệ. Không sửa snapshot địa chỉ đơn cũ.

**UC03-M — Luồng chính**

Given: Đăng nhập; địa chỉ thuộc userId; Giá trị form/config/rate hợp lệ

When: Xem/sửa hồ sơ; thêm/sửa/xóa địa chỉ; Lưu form atomic; preference SSR/cookie/DB thống nhất

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC03-A — Luồng phụ áp dụng**

Given: Đăng nhập; địa chỉ thuộc userId; Giá trị form/config/rate hợp lệ

When: Chưa có địa chỉ; nhiều địa chỉ; Guest→login adopt; English/Vietnamese; currency tham khảo

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC03-E — Ngoại lệ**

Given: Đăng nhập; địa chỉ thuộc userId; Giá trị form/config/rate hợp lệ

When: Truy cập ID người khác; điện thoại/địa chỉ sai; phiên hết hạn; Email/url/phone/sizeGuide sai; role tài chính bị giới hạn

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC03-P — Quyền**

Given: Đăng nhập; địa chỉ thuộc userId; Giá trị form/config/rate hợp lệ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Khách sở hữu hồ sơ; content.manage; user sở hữu preference

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC03-I — Toàn vẹn và hậu điều kiện**

Given: Đăng nhập; địa chỉ thuộc userId; Giá trị form/config/rate hợp lệ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Không thay chủ sở hữu; không ghi địa chỉ người khác; Không đổi tiền VND của checkout/ledger; validate toàn bộ trước ghi

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC03-U — UI/API/DB và trạng thái**

Given: Đăng nhập; địa chỉ thuộc userId; Giá trị form/config/rate hợp lệ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Existing → Updated / Deleted; Existing→Updated

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC04 — Xem danh sách sản phẩm

Preview local có ảnh tham chiếu, không coi là hàng/ảnh đã xác minh thương mại. Chế độ commercial vẫn kiểm publication/readiness.

**UC04-M — Luồng chính**

Given: Sản phẩm/danh mục hoạt động; mode bán kiểm readiness; Ảnh raster local an toàn và được phép dùng

When: Tìm không dấu → lọc kết hợp → xem màu/size/giá; Decode/reencode → lưu file; metadata → liên kết ảnh

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC04-A — Luồng phụ áp dụng**

Given: Sản phẩm/danh mục hoạt động; mode bán kiểm readiness; Ảnh raster local an toàn và được phép dùng

When: Không kết quả; phân trang; hết hàng; Ảnh development/reference tách ảnh sản phẩm

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC04-E — Ngoại lệ**

Given: Sản phẩm/danh mục hoạt động; mode bán kiểm readiness; Ảnh raster local an toàn và được phép dùng

When: Slug không tồn tại, query không hợp lệ, ảnh thiếu; SVG/file giả, traversal, quá dung lượng; xóa ảnh còn tham chiếu

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC04-P — Quyền**

Given: Sản phẩm/danh mục hoạt động; mode bán kiểm readiness; Ảnh raster local an toàn và được phép dùng

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Guest, Customer; media.upload / products.update

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC04-I — Toàn vẹn và hậu điều kiện**

Given: Sản phẩm/danh mục hoạt động; mode bán kiểm readiness; Ảnh raster local an toàn và được phép dùng

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Không lộ sản phẩm ẩn; giá hiển thị theo variant/sale/base; Không xóa ảnh snapshot đơn; quyền kiểm tra trước parse; metadata audited

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC04-U — UI/API/DB và trạng thái**

Given: Sản phẩm/danh mục hoạt động; mode bán kiểm readiness; Ảnh raster local an toàn và được phép dùng

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Active visible / Archived hidden; PENDING → APPROVED / REJECTED

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC05 — Tìm kiếm và lọc sản phẩm

Áp dụng các luồng hợp lệ trong module hiện hữu, theo PROJECT_SPEC và RBAC hiện tại.

**UC05-M — Luồng chính**

Given: Sản phẩm/danh mục hoạt động; mode bán kiểm readiness

When: Tìm không dấu → lọc kết hợp → xem màu/size/giá

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC05-A — Luồng phụ áp dụng**

Given: Sản phẩm/danh mục hoạt động; mode bán kiểm readiness

When: Không kết quả; phân trang; hết hàng

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC05-E — Ngoại lệ**

Given: Sản phẩm/danh mục hoạt động; mode bán kiểm readiness

When: Slug không tồn tại, query không hợp lệ, ảnh thiếu

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC05-P — Quyền**

Given: Sản phẩm/danh mục hoạt động; mode bán kiểm readiness

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Guest, Customer

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC05-I — Toàn vẹn và hậu điều kiện**

Given: Sản phẩm/danh mục hoạt động; mode bán kiểm readiness

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Không lộ sản phẩm ẩn; giá hiển thị theo variant/sale/base

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC05-U — UI/API/DB và trạng thái**

Given: Sản phẩm/danh mục hoạt động; mode bán kiểm readiness

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Active visible / Archived hidden

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC06 — Xem chi tiết sản phẩm

Áp dụng các luồng hợp lệ trong module hiện hữu, theo PROJECT_SPEC và RBAC hiện tại.

**UC06-M — Luồng chính**

Given: SKU duy nhất; size/màu thuộc sản phẩm; Ảnh local hợp lệ; màu và target cùng catalog hợp lệ; Ma trận đo hợp lệ; READY cần ảnh/hàng/tồn được xác minh

When: Tạo/sửa SKU, override giá, ghi movement khi đổi tồn; Lưu màu/ảnh/position hoặc outfit → invalidate publication; Cấu hình bảng riêng/kế thừa; duyệt readiness và publication

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC06-A — Luồng phụ áp dụng**

Given: SKU duy nhất; size/màu thuộc sản phẩm; Ảnh local hợp lệ; màu và target cùng catalog hợp lệ; Ma trận đo hợp lệ; READY cần ảnh/hàng/tồn được xác minh

When: Giá override rỗng dùng sale/base; thêm size; Đổi tên màu cập nhật variant; xóa outfit hợp lệ; Bảng category; bản nháp giữ được thiếu dữ liệu

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC06-E — Ngoại lệ**

Given: SKU duy nhất; size/màu thuộc sản phẩm; Ảnh local hợp lệ; màu và target cùng catalog hợp lệ; Ma trận đo hợp lệ; READY cần ảnh/hàng/tồn được xác minh

When: SKU trùng, stock âm/quá giới hạn, chuyển variant sang sản phẩm khác; Màu khác sản phẩm, file sai, outfit tự trỏ hoặc hàng hết; Dữ liệu JSON sai, ảnh tham chiếu/chưa xác minh, tồn chưa rõ nguồn

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC06-P — Quyền**

Given: SKU duy nhất; size/màu thuộc sản phẩm; Ảnh local hợp lệ; màu và target cùng catalog hợp lệ; Ma trận đo hợp lệ; READY cần ảnh/hàng/tồn được xác minh

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: products.update; inventory.adjust khi đổi tồn; products.update; products.update / products.publish

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC06-I — Toàn vẹn và hậu điều kiện**

Given: SKU duy nhất; size/màu thuộc sản phẩm; Ảnh local hợp lệ; màu và target cùng catalog hợp lệ; Ma trận đo hợp lệ; READY cần ảnh/hàng/tồn được xác minh

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Variant + movement + audit atomic; historical SKU snapshot không đổi; Ghi cấu hình + invalidation + audit atomic; Không tự giả bằng chứng hàng thật; audit trong transaction

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC06-U — UI/API/DB và trạng thái**

Given: SKU duy nhất; size/màu thuộc sản phẩm; Ảnh local hợp lệ; màu và target cùng catalog hợp lệ; Ma trận đo hợp lệ; READY cần ảnh/hàng/tồn được xác minh

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: New → Configured → Updated; PENDING_ASSETS after catalogue change; DRAFT ↔ PENDING_ASSETS → READY

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC07 — Thêm sản phẩm vào giỏ hàng

Áp dụng các luồng hợp lệ trong module hiện hữu, theo PROJECT_SPEC và RBAC hiện tại.

**UC07-M — Luồng chính**

Given: Sản phẩm/màu/danh mục hoạt động; tồn đủ

When: Thêm hoặc increment → sửa lượng → xóa

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC07-A — Luồng phụ áp dụng**

Given: Sản phẩm/màu/danh mục hoạt động; tồn đủ

When: Xóa hàng đã ẩn; tắt analytics; retry sau lỗi

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC07-E — Ngoại lệ**

Given: Sản phẩm/màu/danh mục hoạt động; tồn đủ

When: Lượng >99, thiếu tồn, key khác payload, guest/hết phiên

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC07-P — Quyền**

Given: Sản phẩm/màu/danh mục hoạt động; tồn đủ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Khách đăng nhập, giỏ riêng

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC07-I — Toàn vẹn và hậu điều kiện**

Given: Sản phẩm/màu/danh mục hoạt động; tồn đủ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Receipt độc lập analytics; mutation atomic; không thay tồn khi chỉ thêm giỏ

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC07-U — UI/API/DB và trạng thái**

Given: Sản phẩm/màu/danh mục hoạt động; tồn đủ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Empty ↔ Populated

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC08 — Quản lý giỏ hàng

Áp dụng các luồng hợp lệ trong module hiện hữu, theo PROJECT_SPEC và RBAC hiện tại.

**UC08-M — Luồng chính**

Given: Sản phẩm/màu/danh mục hoạt động; tồn đủ; Sản phẩm tồn tại/được hoạt động khi thêm

When: Thêm hoặc increment → sửa lượng → xóa; Lưu wishlist → đăng nhập → merge; xóa mục

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC08-A — Luồng phụ áp dụng**

Given: Sản phẩm/màu/danh mục hoạt động; tồn đủ; Sản phẩm tồn tại/được hoạt động khi thêm

When: Xóa hàng đã ẩn; tắt analytics; retry sau lỗi; Thêm lặp là no-op; xóa sản phẩm đã ẩn

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC08-E — Ngoại lệ**

Given: Sản phẩm/màu/danh mục hoạt động; tồn đủ; Sản phẩm tồn tại/được hoạt động khi thêm

When: Lượng >99, thiếu tồn, key khác payload, guest/hết phiên; ID không tồn tại; người khác không sửa được wishlist

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC08-P — Quyền**

Given: Sản phẩm/màu/danh mục hoạt động; tồn đủ; Sản phẩm tồn tại/được hoạt động khi thêm

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Khách đăng nhập, giỏ riêng; Guest local; khách sở hữu wishlist

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC08-I — Toàn vẹn và hậu điều kiện**

Given: Sản phẩm/màu/danh mục hoạt động; tồn đủ; Sản phẩm tồn tại/được hoạt động khi thêm

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Receipt độc lập analytics; mutation atomic; không thay tồn khi chỉ thêm giỏ; Unique wishlist/product; không đổi giỏ của tài khoản khác

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC08-U — UI/API/DB và trạng thái**

Given: Sản phẩm/màu/danh mục hoạt động; tồn đủ; Sản phẩm tồn tại/được hoạt động khi thêm

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Empty ↔ Populated; Local → Account wishlist

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC09 — Đặt hàng

Chỉ COD nội bộ theo PROJECT_SPEC; phương thức khác không được trình bày như thanh toán thật. Địa chỉ VN, tiền giao dịch VND.

**UC09-M — Luồng chính**

Given: Giỏ không rỗng; địa chỉ vùng VN; giá/tồn hợp lệ; Quote hợp lệ; key UUID; tồn và lượt voucher còn đủ tại commit; Key đã gắn với cart và payload chuẩn hóa

When: Server tính subtotal-discount+shipping; CAS tồn/lượt → order/items/payment/history/audit → xóa giỏ; Retry cùng key → cùng order

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC09-A — Luồng phụ áp dụng**

Given: Giỏ không rỗng; địa chỉ vùng VN; giá/tồn hợp lệ; Quote hợp lệ; key UUID; tồn và lượt voucher còn đủ tại commit; Key đã gắn với cart và payload chuẩn hóa

When: Không voucher; giảm phần trăm/tối đa; miễn ship theo net; Địa chỉ lưu sẵn; nhiều dòng; đơn không giảm giá; Mất response sau commit; gọi đồng thời

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC09-E — Ngoại lệ**

Given: Giỏ không rỗng; địa chỉ vùng VN; giá/tồn hợp lệ; Quote hợp lệ; key UUID; tồn và lượt voucher còn đủ tại commit; Key đã gắn với cart và payload chuẩn hóa

When: Voucher sai/hết hạn/chưa bắt đầu/cạn lượt; giá 0; vùng ngoài VN; Tranh mua đơn vị cuối; tranh lượt voucher; lỗi giữa giao dịch; Key của cart khác; đổi địa chỉ/voucher khi dùng lại key

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC09-P — Quyền**

Given: Giỏ không rỗng; địa chỉ vùng VN; giá/tồn hợp lệ; Quote hợp lệ; key UUID; tồn và lượt voucher còn đủ tại commit; Key đã gắn với cart và payload chuẩn hóa

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Khách đăng nhập; Chủ cart tạo yêu cầu

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC09-I — Toàn vẹn và hậu điều kiện**

Given: Giỏ không rỗng; địa chỉ vùng VN; giá/tồn hợp lệ; Quote hợp lệ; key UUID; tồn và lượt voucher còn đủ tại commit; Key đã gắn với cart và payload chuẩn hóa

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: VND integer; không nhận giá client; quote không trừ tồn/lượt; Tất cả transaction; không âm tồn; payment UNPAID; snapshot lịch sử; Một order/payment/trừ tồn; không xóa giỏ mới khi replay

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC09-U — UI/API/DB và trạng thái**

Given: Giỏ không rỗng; địa chỉ vùng VN; giá/tồn hợp lệ; Quote hợp lệ; key UUID; tồn và lượt voucher còn đủ tại commit; Key đã gắn với cart và payload chuẩn hóa

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Cart → Quote; Cart → PENDING / UNPAID; Committed → Same result

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC10 — Thanh toán và COD

Thu COD, chuyển tiền về và đối soát mô phỏng độc lập; không kết nối cổng thanh toán hoặc xác thực tiền thật.

**UC10-M — Luồng chính**

Given: Đã giao; payment COD đúng tổng; chứng từ và nguồn thu; Có collection; chứng từ hợp lệ; Collected/remitted/expected và fees khớp hoặc có tranh chấp; Chứng từ gốc tồn tại; correction link + evidence

When: Thêm collection ledger → tính collected → payment PAID khi đủ; Ghi remittance → outstanding thay đổi; Đối chiếu ledger → reconcile hoặc dispute có ghi chú; Thêm bút toán bù có tham chiếu → tính lại

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC10-A — Luồng phụ áp dụng**

Given: Đã giao; payment COD đúng tổng; chứng từ và nguồn thu; Có collection; chứng từ hợp lệ; Collected/remitted/expected và fees khớp hoặc có tranh chấp; Chứng từ gốc tồn tại; correction link + evidence

When: Thu từng phần; thiếu/thừa tiền hiển thị lệch; Chuyển từng phần, chưa đủ tiền; Thiếu/thừa; tiếp tục bổ sung chứng từ; Chứng từ sai được bù; ledger gốc giữ nguyên

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC10-E — Ngoại lệ**

Given: Đã giao; payment COD đúng tổng; chứng từ và nguồn thu; Có collection; chứng từ hợp lệ; Collected/remitted/expected và fees khớp hoặc có tranh chấp; Chứng từ gốc tồn tại; correction link + evidence

When: Sai provider/amount/date; trùng key khác payload; thu trước giao; Chưa thu, số âm không phải correction, ngày tương lai; Đối soát khi còn lệch, không quyền, thao tác đồng thời; Bù quá giới hạn, key khác nội dung, số thu dưới khoản refund đã giữ

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC10-P — Quyền**

Given: Đã giao; payment COD đúng tổng; chứng từ và nguồn thu; Có collection; chứng từ hợp lệ; Collected/remitted/expected và fees khớp hoặc có tranh chấp; Chứng từ gốc tồn tại; correction link + evidence

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: cod.collection.confirm; cod.remittance.record; cod.reconcile; Quyền collection/remittance tương ứng

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC10-I — Toàn vẹn và hậu điều kiện**

Given: Đã giao; payment COD đúng tổng; chứng từ và nguồn thu; Có collection; chứng từ hợp lệ; Collected/remitted/expected và fees khớp hoặc có tranh chấp; Chứng từ gốc tồn tại; correction link + evidence

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Append-only; không nhân đôi từ retry; không ghi PAID từ delivery; Không cộng lại doanh thu từ tiền chuyển về; Một settlement hợp lệ; audit; outstanding không bị xóa để che lệch; Không sửa/xóa ledger; không hoàn vượt thực thu

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC10-U — UI/API/DB và trạng thái**

Given: Đã giao; payment COD đúng tổng; chứng từ và nguồn thu; Có collection; chứng từ hợp lệ; Collected/remitted/expected và fees khớp hoặc có tranh chấp; Chứng từ gốc tồn tại; correction link + evidence

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: UNPAID→PAID when actual recorded collected sufficient; OUTSTANDING→PARTIAL→READY; PENDING/PARTIAL/DISPUTED→RECONCILED; Settlement recomputed / disputed

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC11 — Theo dõi đơn hàng

Áp dụng các luồng hợp lệ trong module hiện hữu, theo PROJECT_SPEC và RBAC hiện tại.

**UC11-M — Luồng chính**

Given: Đơn tồn tại; đúng ownership/quyền

When: Tìm mã → xem snapshot/timeline thực

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC11-A — Luồng phụ áp dụng**

Given: Đơn tồn tại; đúng ownership/quyền

When: Tra cứu mã+phone chỉ dữ liệu tối thiểu

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC11-E — Ngoại lệ**

Given: Đơn tồn tại; đúng ownership/quyền

When: ID/code khác khách; token sai; không lộ address/email/token

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC11-P — Quyền**

Given: Đơn tồn tại; đúng ownership/quyền

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: orders.read; khách sở hữu; guest capability tối thiểu

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC11-I — Toàn vẹn và hậu điều kiện**

Given: Đơn tồn tại; đúng ownership/quyền

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: UI/API/DB khớp tổng tiền/trạng thái; public allowlist

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC11-U — UI/API/DB và trạng thái**

Given: Đơn tồn tại; đúng ownership/quyền

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Read only

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC12 — Hủy đơn hàng

Hủy toàn bộ theo quy tắc hiện hành; hủy một phần bị khóa chờ duyệt chính sách. Đơn đang giao đi theo shipment/return, không hoàn tồn tùy tiện.

**UC12-M — Luồng chính**

Given: UNPAID; chưa giao hoặc hàng chuyển hoàn đã về

When: Cancel → hoàn lượng còn lại → release voucher một lần

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC12-A — Luồng phụ áp dụng**

Given: UNPAID; chưa giao hoặc hàng chuyển hoàn đã về

When: Retry CANCELLED no-op; trả về rồi hủy

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC12-E — Ngoại lệ**

Given: UNPAID; chưa giao hoặc hàng chuyển hoàn đã về

When: Đã PAID; đang giao/chưa hoàn về; khách hủy muộn

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC12-P — Quyền**

Given: UNPAID; chưa giao hoặc hàng chuyển hoàn đã về

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: orders.cancel hoặc owner trước chuẩn bị

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC12-I — Toàn vẹn và hậu điều kiện**

Given: UNPAID; chưa giao hoặc hàng chuyển hoàn đã về

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Hoàn tồn/coupon/history/audit atomic; paid dùng refund flow

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC12-U — UI/API/DB và trạng thái**

Given: UNPAID; chưa giao hoặc hàng chuyển hoàn đã về

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: PENDING/CONFIRMED/PROCESSING/RETURNED→CANCELLED

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC13 — Xem và tiếp nhận đơn mới

Dùng danh sách trạng thái, lọc ngày, tìm mã, ưu tiên và phân công trong module hiện tại; không thêm hệ thống nhân sự hoặc chấm công.

**UC13-M — Luồng chính**

Given: Đơn tồn tại; đúng ownership/quyền; Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: Tìm mã → xem snapshot/timeline thực; PENDING→CONFIRMED→PROCESSING; từ chối dùng CANCELLED

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC13-A — Luồng phụ áp dụng**

Given: Đơn tồn tại; đúng ownership/quyền; Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: Tra cứu mã+phone chỉ dữ liệu tối thiểu; Đường giao nhận thủ công trước có shipment

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC13-E — Ngoại lệ**

Given: Đơn tồn tại; đúng ownership/quyền; Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: ID/code khác khách; token sai; không lộ address/email/token; Nhảy bước, lùi trạng thái, khách tự đóng gói

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC13-P — Quyền**

Given: Đơn tồn tại; đúng ownership/quyền; Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: orders.read; khách sở hữu; guest capability tối thiểu; orders.manage; orders.cancel cho hủy

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC13-I — Toàn vẹn và hậu điều kiện**

Given: Đơn tồn tại; đúng ownership/quyền; Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: UI/API/DB khớp tổng tiền/trạng thái; public allowlist; CAS + history + audit; không tự ghi PAID từ status

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC13-U — UI/API/DB và trạng thái**

Given: Đơn tồn tại; đúng ownership/quyền; Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Read only; Theo order-state-machine.md

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC14 — Xác nhận đơn hàng

Checkout đã trừ tồn và giữ snapshot; xác nhận không trừ lại. Không dùng tồn còn lại sau khi đã xuất để kết luận đơn mua đơn vị cuối là thiếu hàng.

**UC14-M — Luồng chính**

Given: Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: PENDING→CONFIRMED→PROCESSING; từ chối dùng CANCELLED

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC14-A — Luồng phụ áp dụng**

Given: Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: Đường giao nhận thủ công trước có shipment

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC14-E — Ngoại lệ**

Given: Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: Nhảy bước, lùi trạng thái, khách tự đóng gói

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC14-P — Quyền**

Given: Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: orders.manage; orders.cancel cho hủy

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC14-I — Toàn vẹn và hậu điều kiện**

Given: Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: CAS + history + audit; không tự ghi PAID từ status

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC14-U — UI/API/DB và trạng thái**

Given: Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Theo order-state-machine.md

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC15 — Đóng gói sản phẩm

Giữ enum PROCESSING và ghi packedAt/packedBy cùng checklist SKU/màu/size/lượng. Tạo shipment hoặc chuyển SHIPPING phải đã kiểm tra đóng gói; không thêm enum phá lịch sử cũ.

**UC15-M — Luồng chính**

Given: Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: PENDING→CONFIRMED→PROCESSING; từ chối dùng CANCELLED

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC15-A — Luồng phụ áp dụng**

Given: Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: Đường giao nhận thủ công trước có shipment

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC15-E — Ngoại lệ**

Given: Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: Nhảy bước, lùi trạng thái, khách tự đóng gói

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC15-P — Quyền**

Given: Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: orders.manage; orders.cancel cho hủy

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC15-I — Toàn vẹn và hậu điều kiện**

Given: Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: CAS + history + audit; không tự ghi PAID từ status

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC15-U — UI/API/DB và trạng thái**

Given: Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Theo order-state-machine.md

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC16 — Cập nhật giao hàng

Mã HN-SHIP-* là hồ sơ giao nhận local, không phải mã hãng. Không gọi logistics bên ngoài.

**UC16-M — Luồng chính**

Given: PROCESSING, UNPAID, COD payment khớp; chưa có shipment; Trạng thái shipment đầu hợp lệ; Kiện đang giao; lý do và trạng thái hợp lệ

When: Tạo HN-SHIP-* và snapshot nhận hàng; PENDING→READY_FOR_PICKUP→PICKED_UP→IN_TRANSIT→DELIVERED; Failure→retry hoặc returning→returned

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC16-A — Luồng phụ áp dụng**

Given: PROCESSING, UNPAID, COD payment khớp; chưa có shipment; Trạng thái shipment đầu hợp lệ; Kiện đang giao; lý do và trạng thái hợp lệ

When: Thông số kiện hợp lệ; thông tin tùy chọn; Retry trạng thái đã ghi không tạo side effect; Hủy trước pickup; retry event

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC16-E — Ngoại lệ**

Given: PROCESSING, UNPAID, COD payment khớp; chưa có shipment; Trạng thái shipment đầu hợp lệ; Kiện đang giao; lý do và trạng thái hợp lệ

When: Đơn sai trạng thái/đã có kiện; input parcel sai; carrier thật bị chặn; Nhảy bước; thiếu lý do; sửa order trực tiếp khi đã có kiện; Đánh delivered từ returned; hoàn tồn trước hàng về

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC16-P — Quyền**

Given: PROCESSING, UNPAID, COD payment khớp; chưa có shipment; Trạng thái shipment đầu hợp lệ; Kiện đang giao; lý do và trạng thái hợp lệ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: shipping.create; shipping.update; shipping.failures.manage + shipping.update

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC16-I — Toàn vẹn và hậu điều kiện**

Given: PROCESSING, UNPAID, COD payment khớp; chưa có shipment; Trạng thái shipment đầu hợp lệ; Kiện đang giao; lý do và trạng thái hợp lệ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Một shipment/order; không trừ tồn lần hai; Order/shipment/event khớp; giao thành công vẫn UNPAID; Không hoàn tồn tại cả RETURNED và CANCELLED; timeline thật

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC16-U — UI/API/DB và trạng thái**

Given: PROCESSING, UNPAID, COD payment khớp; chưa có shipment; Trạng thái shipment đầu hợp lệ; Kiện đang giao; lý do và trạng thái hợp lệ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: None→PENDING; Theo shipping-state-machine.md; DELIVERY_FAILED / RETURNING / RETURNED

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC17 — Kiểm tra, nhập và xuất kho

Áp dụng các luồng hợp lệ trong module hiện hữu, theo PROJECT_SPEC và RBAC hiện tại.

**UC17-M — Luồng chính**

Given: SKU tồn tại; quantity nguyên dương; lý do/ngày/nhà cung cấp hợp lệ; SKU tồn tại; số tồn nguyên không âm

When: Form IN/OUT → CAS stock → movement + audit; Điều chỉnh số kiểm đếm có lý do; xem movement theo SKU

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC17-A — Luồng phụ áp dụng**

Given: SKU tồn tại; quantity nguyên dương; lý do/ngày/nhà cung cấp hợp lệ; SKU tồn tại; số tồn nguyên không âm

When: Retry cùng key cùng nội dung trả lại kết quả; Tồn 0; phân trang; không có lịch sử

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC17-E — Ngoại lệ**

Given: SKU tồn tại; quantity nguyên dương; lý do/ngày/nhà cung cấp hợp lệ; SKU tồn tại; số tồn nguyên không âm

When: OUT quá tồn; date tương lai; key khác nội dung; Mất quyền, số âm, tranh chấp ghi, lỗi giữa transaction

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC17-P — Quyền**

Given: SKU tồn tại; quantity nguyên dương; lý do/ngày/nhà cung cấp hợp lệ; SKU tồn tại; số tồn nguyên không âm

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: inventory.adjust; inventory.adjust / inventory.movements.read

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC17-I — Toàn vẹn và hậu điều kiện**

Given: SKU tồn tại; quantity nguyên dương; lý do/ngày/nhà cung cấp hợp lệ; SKU tồn tại; số tồn nguyên không âm

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Không âm tồn; delta đúng; chỉ một movement mỗi eventKey; Movement delta=after-before; ghi actor/time/reason; không sửa ledger cũ

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC17-U — UI/API/DB và trạng thái**

Given: SKU tồn tại; quantity nguyên dương; lý do/ngày/nhà cung cấp hợp lệ; SKU tồn tại; số tồn nguyên không âm

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: stock N → N ± quantity; Current stock → Counted stock

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC18 — Đánh giá và hỗ trợ khách hàng

Đánh giá xác minh mua sau giao; SELLER có quyền hỗ trợ phi tài chính, trả lời và ẩn/hiện có lý do. Hỗ trợ dùng inquiry + replies nội bộ, không xây chat thời gian thực ngoài phạm vi.

**UC18-M — Luồng chính**

Given: Thông tin liên hệ/lý do hợp lệ

When: Gửi → inquiry NEW; đọc và giải quyết

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC18-A — Luồng phụ áp dụng**

Given: Thông tin liên hệ/lý do hợp lệ

When: Guest không gán userId; email liên hệ khác tài khoản vẫn gán tác giả đăng nhập

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC18-E — Ngoại lệ**

Given: Thông tin liên hệ/lý do hợp lệ

When: Nội dung ngắn, ID/email giả không được ghép vào lịch sử người khác

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC18-P — Quyền**

Given: Thông tin liên hệ/lý do hợp lệ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Guest hoặc user gửi; inquiries.read/manage xử lý

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC18-I — Toàn vẹn và hậu điều kiện**

Given: Thông tin liên hệ/lý do hợp lệ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Không backfill userId bằng email; ghi thay đổi status có audit

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC18-U — UI/API/DB và trạng thái**

Given: Thông tin liên hệ/lý do hợp lệ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: NEW→READ→RESOLVED

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC19 — Quản lý người dùng

Áp dụng các luồng hợp lệ trong module hiện hữu, theo PROJECT_SPEC và RBAC hiện tại.

**UC19-M — Luồng chính**

Given: Đúng CUSTOMER; phân trang; CUSTOMER; không phải chính tài khoản thao tác; Không tự nâng quyền; actor có grant phù hợp

When: Danh sách → hồ sơ → đơn và số đã thu → yêu cầu hỗ trợ; Khóa→thu hồi phiên; mở cho đăng nhập mới; Tạo ADMIN/SELLER/CUSTOMER (chỉ ba vai trò chuẩn); sửa, khóa/mở

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC19-A — Luồng phụ áp dụng**

Given: Đúng CUSTOMER; phân trang; CUSTOMER; không phải chính tài khoản thao tác; Không tự nâng quyền; actor có grant phù hợp

When: Khách chưa mua/chưa hỗ trợ; quyền chỉ đọc; Retry trạng thái cùng kết quả; lịch sử mua vẫn giữ; Chỉ chấp nhận CUSTOMER, SELLER, ADMIN; vai trò khác bị từ chối

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC19-E — Ngoại lệ**

Given: Đúng CUSTOMER; phân trang; CUSTOMER; không phải chính tài khoản thao tác; Không tự nâng quyền; actor có grant phù hợp

When: ID nhân viên, ID không tồn tại, Seller không customers.read; Khóa staff qua endpoint khách, không quyền, lỗi audit; Email trùng, role client không cho phép, khóa chính mình, loại ADMIN cuối

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC19-P — Quyền**

Given: Đúng CUSTOMER; phân trang; CUSTOMER; không phải chính tài khoản thao tác; Không tự nâng quyền; actor có grant phù hợp

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: customers.read; quyền riêng để mở đơn/returns/support; customers.manage; staff.* / accounts.manage

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC19-I — Toàn vẹn và hậu điều kiện**

Given: Đúng CUSTOMER; phân trang; CUSTOMER; không phải chính tài khoản thao tác; Không tự nâng quyền; actor có grant phù hợp

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Select allowlist, không password/token; support theo userId thật; Status/version/sessions/audit atomic; mở không hồi sinh token cũ; Role/status/version/session/audit atomic; mật khẩu không log

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC19-U — UI/API/DB và trạng thái**

Given: Đúng CUSTOMER; phân trang; CUSTOMER; không phải chính tài khoản thao tác; Không tự nâng quyền; actor có grant phù hợp

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Read only; Active↔Disabled; Active↔Disabled; Role assigned

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC20 — Quản lý nhân viên và phân quyền

Áp dụng các luồng hợp lệ trong module hiện hữu, theo PROJECT_SPEC và RBAC hiện tại.

**UC20-M — Luồng chính**

Given: Không tự nâng quyền; actor có grant phù hợp; Phiên active/version đúng; quyền tại backend/service; Nhân viên có quyền đọc nhật ký

When: Tạo ADMIN/SELLER/CUSTOMER (chỉ ba vai trò chuẩn); sửa, khóa/mở; Menu/form theo quyền; API/service xác minh riêng; Lọc/xem audit theo actor/resource/result

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC20-A — Luồng phụ áp dụng**

Given: Không tự nâng quyền; actor có grant phù hợp; Phiên active/version đúng; quyền tại backend/service; Nhân viên có quyền đọc nhật ký

When: Chỉ chấp nhận CUSTOMER, SELLER, ADMIN; vai trò khác bị từ chối; Vai trò chuyên biệt chỉ được nhóm việc tương ứng; Bản ghi cũ thiếu actor được giữ

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC20-E — Ngoại lệ**

Given: Không tự nâng quyền; actor có grant phù hợp; Phiên active/version đúng; quyền tại backend/service; Nhân viên có quyền đọc nhật ký

When: Email trùng, role client không cho phép, khóa chính mình, loại ADMIN cuối; Ẩn UI nhưng gọi API trực tiếp; role giả; hết phiên; sửa ID ngoài scope; Không có API sửa/xóa audit; token/password/PII nhạy cảm phải loại

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC20-P — Quyền**

Given: Không tự nâng quyền; actor có grant phù hợp; Phiên active/version đúng; quyền tại backend/service; Nhân viên có quyền đọc nhật ký

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: staff.* / accounts.manage; Mọi role; default deny; audit.read

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC20-I — Toàn vẹn và hậu điều kiện**

Given: Không tự nâng quyền; actor có grant phù hợp; Phiên active/version đúng; quyền tại backend/service; Nhân viên có quyền đọc nhật ký

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Role/status/version/session/audit atomic; mật khẩu không log; Không thay dữ liệu khi denied; denial audit không chứa bí mật; Read only; financial ledger không bị viết lại

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC20-U — UI/API/DB và trạng thái**

Given: Không tự nâng quyền; actor có grant phù hợp; Phiên active/version đúng; quyền tại backend/service; Nhân viên có quyền đọc nhật ký

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Active↔Disabled; Role assigned; Authorized / Denied; Append-only

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC21 — Quản lý sản phẩm

Ưu tiên lưu nháp/readiness, ẩn sản phẩm/màu và giữ SKU/ảnh đã có ledger; không cung cấp hard delete làm mất snapshot. Không suy ra quyền sử dụng thương mại từ ảnh tham chiếu.

**UC21-M — Luồng chính**

Given: Danh mục hợp lệ; SKU/slug duy nhất; ảnh local có thật; Sản phẩm tồn tại; SKU duy nhất; size/màu thuộc sản phẩm; Ảnh local hợp lệ; màu và target cùng catalog hợp lệ; Ma trận đo hợp lệ; READY cần ảnh/hàng/tồn được xác minh; Ảnh raster local an toàn và được phép dùng

When: Gửi form → validate → ghi sản phẩm/ảnh → audit → đọc lại; Đặt active=false; ẩn mua mới; Tạo/sửa SKU, override giá, ghi movement khi đổi tồn; Lưu màu/ảnh/position hoặc outfit → invalidate publication; Cấu hình bảng riêng/kế thừa; duyệt readiness và publication; Decode/reencode → lưu file; metadata → liên kết ảnh

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC21-A — Luồng phụ áp dụng**

Given: Danh mục hợp lệ; SKU/slug duy nhất; ảnh local có thật; Sản phẩm tồn tại; SKU duy nhất; size/màu thuộc sản phẩm; Ảnh local hợp lệ; màu và target cùng catalog hợp lệ; Ma trận đo hợp lệ; READY cần ảnh/hàng/tồn được xác minh; Ảnh raster local an toàn và được phép dùng

When: Giá thường/giá sale; gallery nhiều ảnh; Giữ trang quản trị/lịch sử đơn; giỏ cũ có thể xóa; Giá override rỗng dùng sale/base; thêm size; Đổi tên màu cập nhật variant; xóa outfit hợp lệ; Bảng category; bản nháp giữ được thiếu dữ liệu; Ảnh development/reference tách ảnh sản phẩm

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC21-E — Ngoại lệ**

Given: Danh mục hợp lệ; SKU/slug duy nhất; ảnh local có thật; Sản phẩm tồn tại; SKU duy nhất; size/màu thuộc sản phẩm; Ảnh local hợp lệ; màu và target cùng catalog hợp lệ; Ma trận đo hợp lệ; READY cần ảnh/hàng/tồn được xác minh; Ảnh raster local an toàn và được phép dùng

When: Giá không dương, sale ≥ base, SKU trùng, danh mục sai, audit thất bại; Vai trò không có archive; mua sản phẩm đã ẩn; SKU trùng, stock âm/quá giới hạn, chuyển variant sang sản phẩm khác; Màu khác sản phẩm, file sai, outfit tự trỏ hoặc hàng hết; Dữ liệu JSON sai, ảnh tham chiếu/chưa xác minh, tồn chưa rõ nguồn; SVG/file giả, traversal, quá dung lượng; xóa ảnh còn tham chiếu

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC21-P — Quyền**

Given: Danh mục hợp lệ; SKU/slug duy nhất; ảnh local có thật; Sản phẩm tồn tại; SKU duy nhất; size/màu thuộc sản phẩm; Ảnh local hợp lệ; màu và target cùng catalog hợp lệ; Ma trận đo hợp lệ; READY cần ảnh/hàng/tồn được xác minh; Ảnh raster local an toàn và được phép dùng

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: products.create / products.update; products.archive; products.update; inventory.adjust khi đổi tồn; products.update; products.update / products.publish; media.upload / products.update

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC21-I — Toàn vẹn và hậu điều kiện**

Given: Danh mục hợp lệ; SKU/slug duy nhất; ảnh local có thật; Sản phẩm tồn tại; SKU duy nhất; size/màu thuộc sản phẩm; Ảnh local hợp lệ; màu và target cùng catalog hợp lệ; Ma trận đo hợp lệ; READY cần ảnh/hàng/tồn được xác minh; Ảnh raster local an toàn và được phép dùng

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Product + ảnh + audit atomic; đơn cũ không đổi; Không xóa OrderItem/ledger; trả hàng cũ vẫn đối chiếu được; Variant + movement + audit atomic; historical SKU snapshot không đổi; Ghi cấu hình + invalidation + audit atomic; Không tự giả bằng chứng hàng thật; audit trong transaction; Không xóa ảnh snapshot đơn; quyền kiểm tra trước parse; metadata audited

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC21-U — UI/API/DB và trạng thái**

Given: Danh mục hợp lệ; SKU/slug duy nhất; ảnh local có thật; Sản phẩm tồn tại; SKU duy nhất; size/màu thuộc sản phẩm; Ảnh local hợp lệ; màu và target cùng catalog hợp lệ; Ma trận đo hợp lệ; READY cần ảnh/hàng/tồn được xác minh; Ảnh raster local an toàn và được phép dùng

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: New → Active; Active → Updated; Active → Archived → Active; New → Configured → Updated; PENDING_ASSETS after catalogue change; DRAFT ↔ PENDING_ASSETS → READY; PENDING → APPROVED / REJECTED

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC22 — Quản lý danh mục

Áp dụng các luồng hợp lệ trong module hiện hữu, theo PROJECT_SPEC và RBAC hiện tại.

**UC22-M — Luồng chính**

Given: Slug duy nhất; cấu trúc cha/con hợp lệ

When: Thêm/sửa và gán sản phẩm → refresh tìm kiếm

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC22-A — Luồng phụ áp dụng**

Given: Slug duy nhất; cấu trúc cha/con hợp lệ

When: Danh mục con; collection nhiều sản phẩm

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC22-E — Ngoại lệ**

Given: Slug duy nhất; cấu trúc cha/con hợp lệ

When: Vòng/self-parent; chuyển cha sai; FK sản phẩm không tồn tại

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC22-P — Quyền**

Given: Slug duy nhất; cấu trúc cha/con hợp lệ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: products.update

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC22-I — Toàn vẹn và hậu điều kiện**

Given: Slug duy nhất; cấu trúc cha/con hợp lệ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Danh mục/collection + liên kết + audit atomic

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC22-U — UI/API/DB và trạng thái**

Given: Slug duy nhất; cấu trúc cha/con hợp lệ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: New → Active → Hidden

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC23 — Quản lý khuyến mãi

Hai loại voucher hiện hành FIXED/PERCENT; một mã mỗi đơn. Phí ship chuẩn 30.000đ và miễn ship theo ngưỡng net hiện hành. Không tự sáng tạo chính sách chồng mã, đối tượng riêng hay đổi mức phí ngoài cấu hình đã duyệt.

**UC23-M — Luồng chính**

Given: Code chuẩn hóa/duy nhất; số/range hợp lệ; Mã hoạt động trong thời gian, min đạt, used<limit

When: Lưu rule, thời điểm bắt đầu/hết, quota, active; Quote kiểm rule; checkout CAS used trong cùng transaction

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC23-A — Luồng phụ áp dụng**

Given: Code chuẩn hóa/duy nhất; số/range hợp lệ; Mã hoạt động trong thời gian, min đạt, used<limit

When: FIXED/PERCENT/cap; ngày đơn chỉ áp dụng đến hết ngày VN; Hủy toàn bộ release đúng một lượt; hủy phần giữ redemption

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC23-E — Ngoại lệ**

Given: Code chuẩn hóa/duy nhất; số/range hợp lệ; Mã hoạt động trong thời gian, min đạt, used<limit

When: PERCENT>100, start>end, ngày không tồn tại, usageLimit<used; Mã sai/hết/chưa mở/cạn; hai khách tranh lượt cuối

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC23-P — Quyền**

Given: Code chuẩn hóa/duy nhất; số/range hợp lệ; Mã hoạt động trong thời gian, min đạt, used<limit

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: promotions.manage; Khách checkout

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC23-I — Toàn vẹn và hậu điều kiện**

Given: Code chuẩn hóa/duy nhất; số/range hợp lệ; Mã hoạt động trong thời gian, min đạt, used<limit

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Audit atomic; không sửa snapshot đơn đã đặt; Không tăng used khi order thất bại; không tăng quá quota

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC23-U — UI/API/DB và trạng thái**

Given: Code chuẩn hóa/duy nhất; số/range hợp lệ; Mã hoạt động trong thời gian, min đạt, used<limit

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Active↔Inactive; Scheduled→Effective→Expired; used N→N+1 or rollback

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC24 — Quản lý đơn hàng

Áp dụng các luồng hợp lệ trong module hiện hữu, theo PROJECT_SPEC và RBAC hiện tại.

**UC24-M — Luồng chính**

Given: Đơn tồn tại; đúng ownership/quyền; Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận; UNPAID; chưa giao hoặc hàng chuyển hoàn đã về

When: Tìm mã → xem snapshot/timeline thực; PENDING→CONFIRMED→PROCESSING; từ chối dùng CANCELLED; Cancel → hoàn lượng còn lại → release voucher một lần

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC24-A — Luồng phụ áp dụng**

Given: Đơn tồn tại; đúng ownership/quyền; Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận; UNPAID; chưa giao hoặc hàng chuyển hoàn đã về

When: Tra cứu mã+phone chỉ dữ liệu tối thiểu; Đường giao nhận thủ công trước có shipment; Retry CANCELLED no-op; trả về rồi hủy

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC24-E — Ngoại lệ**

Given: Đơn tồn tại; đúng ownership/quyền; Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận; UNPAID; chưa giao hoặc hàng chuyển hoàn đã về

When: ID/code khác khách; token sai; không lộ address/email/token; Nhảy bước, lùi trạng thái, khách tự đóng gói; Đã PAID; đang giao/chưa hoàn về; khách hủy muộn

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC24-P — Quyền**

Given: Đơn tồn tại; đúng ownership/quyền; Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận; UNPAID; chưa giao hoặc hàng chuyển hoàn đã về

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: orders.read; khách sở hữu; guest capability tối thiểu; orders.manage; orders.cancel cho hủy; orders.cancel hoặc owner trước chuẩn bị

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC24-I — Toàn vẹn và hậu điều kiện**

Given: Đơn tồn tại; đúng ownership/quyền; Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận; UNPAID; chưa giao hoặc hàng chuyển hoàn đã về

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: UI/API/DB khớp tổng tiền/trạng thái; public allowlist; CAS + history + audit; không tự ghi PAID từ status; Hoàn tồn/coupon/history/audit atomic; paid dùng refund flow

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC24-U — UI/API/DB và trạng thái**

Given: Đơn tồn tại; đúng ownership/quyền; Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận; UNPAID; chưa giao hoặc hàng chuyển hoàn đã về

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Read only; Theo order-state-machine.md; PENDING/CONFIRMED/PROCESSING/RETURNED→CANCELLED

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC25 — Báo cáo thống kê

Áp dụng các luồng hợp lệ trong module hiện hữu, theo PROJECT_SPEC và RBAC hiện tại.

**UC25-M — Luồng chính**

Given: Khoảng ngày VN hợp lệ; dữ liệu đơn thật local; Bộ lọc hợp lệ; snapshot dòng; Nguồn tồn/giá vốn xác minh; cost effective date; First-party visitor consent/session; event type hợp lệ; Dữ liệu payment/shipment/refund hiện có; Bộ lọc hợp lệ; giữ scope quyền

When: Tổng quan → chart doanh thu và trạng thái theo ngày; Ranking sản phẩm/màu/size và cohort mua lần đầu/quay lại; Xem tồn SKU; nhập giá vốn có audit; tính COGS từ snapshot; Ghi attempt/success theo thực tế → cohort/order attribution; Tách bán hàng/thực thu/chuyển về/refund; phát hiện lệch; Chọn report/time → UI/API cùng tập → stream CSV hoặc .xlsx

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC25-A — Luồng phụ áp dụng**

Given: Khoảng ngày VN hợp lệ; dữ liệu đơn thật local; Bộ lọc hợp lệ; snapshot dòng; Nguồn tồn/giá vốn xác minh; cost effective date; First-party visitor consent/session; event type hợp lệ; Dữ liệu payment/shipment/refund hiện có; Bộ lọc hợp lệ; giữ scope quyền

When: Ngày rỗng=0, daily/monthly; cửa sổ mặc định; mobile; Partial cancellation dùng remaining units, ordered/canceled từ originalQuantity; Thiếu cost để NULL và nêu độ phủ; không hồi gán tùy tiện; Opt-out; phiên mới; không có lịch sử; Chưa đối soát, pending refund, legacy thiếu nguồn; Không dữ liệu; nhiều trang; Unicode/formula-like text

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC25-E — Ngoại lệ**

Given: Khoảng ngày VN hợp lệ; dữ liệu đơn thật local; Bộ lọc hợp lệ; snapshot dòng; Nguồn tồn/giá vốn xác minh; cost effective date; First-party visitor consent/session; event type hợp lệ; Dữ liệu payment/shipment/refund hiện có; Bộ lọc hợp lệ; giữ scope quyền

When: Khoảng đảo/ngày sai/>366; section vượt quyền; Không giả khách hoặc dữ liệu lịch sử; Role thiếu quyền, giá vốn âm, chi phí lịch sử thiếu nguồn; Event key khác nội dung; campaign chứa PII; bộ lọc không hỗ trợ; Không tự sửa ledger để report khớp; Format lạ, ngày sai, role không export hoặc không section

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC25-P — Quyền**

Given: Khoảng ngày VN hợp lệ; dữ liệu đơn thật local; Bộ lọc hợp lệ; snapshot dòng; Nguồn tồn/giá vốn xác minh; cost effective date; First-party visitor consent/session; event type hợp lệ; Dữ liệu payment/shipment/refund hiện có; Bộ lọc hợp lệ; giữ scope quyền

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: analytics.read và quyền section; analytics.products.read / analytics.customers.read; analytics.inventory.read / analytics.profit.read / analytics.costs.manage; analytics.funnel.read / analytics.marketing.read; analytics.finance.read; Quyền section + analytics.export

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC25-I — Toàn vẹn và hậu điều kiện**

Given: Khoảng ngày VN hợp lệ; dữ liệu đơn thật local; Bộ lọc hợp lệ; snapshot dòng; Nguồn tồn/giá vốn xác minh; cost effective date; First-party visitor consent/session; event type hợp lệ; Dữ liệu payment/shipment/refund hiện có; Bộ lọc hợp lệ; giữ scope quyền

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: VND chính xác; unpaid COD không coi đã thu; giữ layout Tổng quan đã duyệt; Tổng hàng/giảm/refund nhất quán; tài chính khách theo quyền; Đọc report không thay tồn; không tự tạo lãi khi thiếu cost; Không hồi dựng giả; không lưu raw search/PII; giỏ đã mua loại bỏ; Không đếm COD remittance hai lần; refund pending chưa realized; CSV injection escaped; XLSX string literal, kiểu số/ngày; private no-store; bounded pages

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC25-U — UI/API/DB và trạng thái**

Given: Khoảng ngày VN hợp lệ; dữ liệu đơn thật local; Bộ lọc hợp lệ; snapshot dòng; Nguồn tồn/giá vốn xác minh; cost effective date; First-party visitor consent/session; event type hợp lệ; Dữ liệu payment/shipment/refund hiện có; Bộ lọc hợp lệ; giữ scope quyền

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Read only; Known / Unknown costs; Session→Cart→Checkout→Order; Read only / discrepancy flagged; Read only + export audit

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC26 — Đổi trả sản phẩm

Chỉ lỗi được xác minh trong đủ 72 giờ từ mốc nhận; ảnh không bắt buộc theo chính sách hiện hành. Đổi SKU chỉ cùng đơn giá lịch sử; khác giá bị từ chối chờ chính sách.

**UC26-M — Luồng chính**

Given: DELIVERED/COMPLETED; mốc nhận thật; trong đủ 72h; Hồ sơ hiện hữu và cạnh chuyển hợp lệ; Hồ sơ APPROVED→RECEIVED; kết luận từng dòng; Lỗi đã xác minh; hàng thay thế giá lịch sử bằng nhau; tồn đủ; Đúng quyền; ảnh JPEG/PNG/WebP ≤2MB

When: Chọn dòng/lượng, lý do lỗi, REFUND/EXCHANGE → REQUESTED; REQUESTED→UNDER_REVIEW→APPROVED/REJECTED; Nhận không cộng tồn; kiểm SELLABLE cộng đúng lượng một lần; Allocate SKU → trừ tồn → giao kiện đổi nội bộ; Xem timeline và ảnh lỗi qua endpoint riêng

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC26-A — Luồng phụ áp dụng**

Given: DELIVERED/COMPLETED; mốc nhận thật; trong đủ 72h; Hồ sơ hiện hữu và cạnh chuyển hợp lệ; Hồ sơ APPROVED→RECEIVED; kết luận từng dòng; Lỗi đã xác minh; hàng thay thế giá lịch sử bằng nhau; tồn đủ; Đúng quyền; ảnh JPEG/PNG/WebP ≤2MB

When: Đúng mốc 72h; nhiều hồ sơ cho lượng còn lại; ảnh không bắt buộc; Từ chối trước nhận giải phóng lượng claim; REVIEW kiểm thêm; DAMAGED cách ly; REJECTED không hoàn; SKU khác size/màu là khắc phục lỗi đã thống nhất; thiếu hàng chuyển refund; Không ảnh vẫn có thể gửi claim

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC26-E — Ngoại lệ**

Given: DELIVERED/COMPLETED; mốc nhận thật; trong đủ 72h; Hồ sơ hiện hữu và cạnh chuyển hợp lệ; Hồ sơ APPROVED→RECEIVED; kết luận từng dòng; Lỗi đã xác minh; hàng thay thế giá lịch sử bằng nhau; tồn đủ; Đúng quyền; ảnh JPEG/PNG/WebP ≤2MB

When: Quá 72h/thiếu mốc, sai chủ, vượt lượng/claim đồng thời, key khác payload; Nhảy bước; tự duyệt bởi khách; thiếu lý do; Ghi đè kết luận cuối, thiếu quyền tồn, hai inspect đồng thời; Hết tồn, SKU sai/giá lệch, hai allocate tranh đơn vị cuối; Chủ khác, ảnh giả/SVG/quá pixel, public access

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC26-P — Quyền**

Given: DELIVERED/COMPLETED; mốc nhận thật; trong đủ 72h; Hồ sơ hiện hữu và cạnh chuyển hợp lệ; Hồ sơ APPROVED→RECEIVED; kết luận từng dòng; Lỗi đã xác minh; hàng thay thế giá lịch sử bằng nhau; tồn đủ; Đúng quyền; ảnh JPEG/PNG/WebP ≤2MB

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: CUSTOMER sở hữu đơn; returns.review; returns.inspect; inventory.adjust khi SELLABLE; returns.exchange; shipping.update; Chủ hồ sơ; returns.read/inspect

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC26-I — Toàn vẹn và hậu điều kiện**

Given: DELIVERED/COMPLETED; mốc nhận thật; trong đủ 72h; Hồ sơ hiện hữu và cạnh chuyển hợp lệ; Hồ sơ APPROVED→RECEIVED; kết luận từng dòng; Lỗi đã xác minh; hàng thay thế giá lịch sử bằng nhau; tồn đủ; Đúng quyền; ảnh JPEG/PNG/WebP ≤2MB

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Claim lượng/amount snapshot; không sửa shipment gốc; History/audit; không tự hoàn tiền khi duyệt; Inspection+movement+audit atomic; không trùng hoàn tồn; Không sửa item/shipment gốc; atomic và audit; Reencode bỏ metadata; không public evidence hoặc ghi chú nội bộ

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC26-U — UI/API/DB và trạng thái**

Given: DELIVERED/COMPLETED; mốc nhận thật; trong đủ 72h; Hồ sơ hiện hữu và cạnh chuyển hợp lệ; Hồ sơ APPROVED→RECEIVED; kết luận từng dòng; Lỗi đã xác minh; hàng thay thế giá lịch sử bằng nhau; tồn đủ; Đúng quyền; ảnh JPEG/PNG/WebP ≤2MB

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: None→REQUESTED; Theo returns-state-machine.md; RECEIVED→INSPECTED/INSPECTION_FAILED; INSPECTED→EXCHANGE_PENDING→COMPLETED/CLOSED; Read only / private evidence

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC27 — Hoàn tiền

SIMULATED REFUND, không chuyển tiền thật; duyệt và thực thi theo quyền riêng, giữ trần khoản thực thu và số lượng được phép.

**UC27-M — Luồng chính**

Given: Hàng đã kiểm hợp lệ; payment có tiền đã thu còn có thể hoàn

When: Prepare → APPROVED → SIMULATED_COMPLETED

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC27-A — Luồng phụ áp dụng**

Given: Hàng đã kiểm hợp lệ; payment có tiền đã thu còn có thể hoàn

When: Hoàn một số lượng; phí ship theo quyết định hợp lệ; reject/cancel khoản chưa hoàn

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC27-E — Ngoại lệ**

Given: Hàng đã kiểm hợp lệ; payment có tiền đã thu còn có thể hoàn

When: Số client chèn, vượt paid/refund cap, hai xác nhận đồng thời

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC27-P — Quyền**

Given: Hàng đã kiểm hợp lệ; payment có tiền đã thu còn có thể hoàn

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: refunds.approve / refunds.execute

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC27-I — Toàn vẹn và hậu điều kiện**

Given: Hàng đã kiểm hợp lệ; payment có tiền đã thu còn có thể hoàn

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Tổng giữ/hoàn ≤ thực thu; không xóa COD; số hàng net đúng snapshot/rounding

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC27-U — UI/API/DB và trạng thái**

Given: Hàng đã kiểm hợp lệ; payment có tiền đã thu còn có thể hoàn

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: PENDING→APPROVED→SIMULATED_COMPLETED

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC28 — Đối soát COD

Áp dụng các luồng hợp lệ trong module hiện hữu, theo PROJECT_SPEC và RBAC hiện tại.

**UC28-M — Luồng chính**

Given: Đã giao; payment COD đúng tổng; chứng từ và nguồn thu; Có collection; chứng từ hợp lệ; Collected/remitted/expected và fees khớp hoặc có tranh chấp; Chứng từ gốc tồn tại; correction link + evidence

When: Thêm collection ledger → tính collected → payment PAID khi đủ; Ghi remittance → outstanding thay đổi; Đối chiếu ledger → reconcile hoặc dispute có ghi chú; Thêm bút toán bù có tham chiếu → tính lại

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC28-A — Luồng phụ áp dụng**

Given: Đã giao; payment COD đúng tổng; chứng từ và nguồn thu; Có collection; chứng từ hợp lệ; Collected/remitted/expected và fees khớp hoặc có tranh chấp; Chứng từ gốc tồn tại; correction link + evidence

When: Thu từng phần; thiếu/thừa tiền hiển thị lệch; Chuyển từng phần, chưa đủ tiền; Thiếu/thừa; tiếp tục bổ sung chứng từ; Chứng từ sai được bù; ledger gốc giữ nguyên

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC28-E — Ngoại lệ**

Given: Đã giao; payment COD đúng tổng; chứng từ và nguồn thu; Có collection; chứng từ hợp lệ; Collected/remitted/expected và fees khớp hoặc có tranh chấp; Chứng từ gốc tồn tại; correction link + evidence

When: Sai provider/amount/date; trùng key khác payload; thu trước giao; Chưa thu, số âm không phải correction, ngày tương lai; Đối soát khi còn lệch, không quyền, thao tác đồng thời; Bù quá giới hạn, key khác nội dung, số thu dưới khoản refund đã giữ

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC28-P — Quyền**

Given: Đã giao; payment COD đúng tổng; chứng từ và nguồn thu; Có collection; chứng từ hợp lệ; Collected/remitted/expected và fees khớp hoặc có tranh chấp; Chứng từ gốc tồn tại; correction link + evidence

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: cod.collection.confirm; cod.remittance.record; cod.reconcile; Quyền collection/remittance tương ứng

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC28-I — Toàn vẹn và hậu điều kiện**

Given: Đã giao; payment COD đúng tổng; chứng từ và nguồn thu; Có collection; chứng từ hợp lệ; Collected/remitted/expected và fees khớp hoặc có tranh chấp; Chứng từ gốc tồn tại; correction link + evidence

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Append-only; không nhân đôi từ retry; không ghi PAID từ delivery; Không cộng lại doanh thu từ tiền chuyển về; Một settlement hợp lệ; audit; outstanding không bị xóa để che lệch; Không sửa/xóa ledger; không hoàn vượt thực thu

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC28-U — UI/API/DB và trạng thái**

Given: Đã giao; payment COD đúng tổng; chứng từ và nguồn thu; Có collection; chứng từ hợp lệ; Collected/remitted/expected và fees khớp hoặc có tranh chấp; Chứng từ gốc tồn tại; correction link + evidence

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: UNPAID→PAID when actual recorded collected sufficient; OUTSTANDING→PARTIAL→READY; PENDING/PARTIAL/DISPUTED→RECONCILED; Settlement recomputed / disputed

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC29 — Kiểm kê và xử lý chênh lệch kho

Phiếu DRAFT→SUBMITTED→APPROVED/CANCELLED; countedStock chỉ hàng bán được, damagedStock cách ly. Tồn sổ thay đổi trong thời gian chờ thì phải kiểm đếm lại, không ghi đè giao dịch.

**UC29-M — Luồng chính**

Given: SKU tồn tại; quantity nguyên dương; lý do/ngày/nhà cung cấp hợp lệ; SKU tồn tại; số tồn nguyên không âm

When: Form IN/OUT → CAS stock → movement + audit; Điều chỉnh số kiểm đếm có lý do; xem movement theo SKU

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC29-A — Luồng phụ áp dụng**

Given: SKU tồn tại; quantity nguyên dương; lý do/ngày/nhà cung cấp hợp lệ; SKU tồn tại; số tồn nguyên không âm

When: Retry cùng key cùng nội dung trả lại kết quả; Tồn 0; phân trang; không có lịch sử

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC29-E — Ngoại lệ**

Given: SKU tồn tại; quantity nguyên dương; lý do/ngày/nhà cung cấp hợp lệ; SKU tồn tại; số tồn nguyên không âm

When: OUT quá tồn; date tương lai; key khác nội dung; Mất quyền, số âm, tranh chấp ghi, lỗi giữa transaction

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC29-P — Quyền**

Given: SKU tồn tại; quantity nguyên dương; lý do/ngày/nhà cung cấp hợp lệ; SKU tồn tại; số tồn nguyên không âm

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: inventory.adjust; inventory.adjust / inventory.movements.read

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC29-I — Toàn vẹn và hậu điều kiện**

Given: SKU tồn tại; quantity nguyên dương; lý do/ngày/nhà cung cấp hợp lệ; SKU tồn tại; số tồn nguyên không âm

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Không âm tồn; delta đúng; chỉ một movement mỗi eventKey; Movement delta=after-before; ghi actor/time/reason; không sửa ledger cũ

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC29-U — UI/API/DB và trạng thái**

Given: SKU tồn tại; quantity nguyên dương; lý do/ngày/nhà cung cấp hợp lệ; SKU tồn tại; số tồn nguyên không âm

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: stock N → N ± quantity; Current stock → Counted stock

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC30 — Ngôn ngữ, khu vực và tiền tệ

VI/EN, vùng/tiền tệ hiển thị được cấu hình; tỷ giá tham khảo local. Checkout/ledger luôn VND; vùng khác VN không giao hàng.

**UC30-M — Luồng chính**

Given: Giá trị form/config/rate hợp lệ

When: Lưu form atomic; preference SSR/cookie/DB thống nhất

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC30-A — Luồng phụ áp dụng**

Given: Giá trị form/config/rate hợp lệ

When: Guest→login adopt; English/Vietnamese; currency tham khảo

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC30-E — Ngoại lệ**

Given: Giá trị form/config/rate hợp lệ

When: Email/url/phone/sizeGuide sai; role tài chính bị giới hạn

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC30-P — Quyền**

Given: Giá trị form/config/rate hợp lệ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: content.manage; user sở hữu preference

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC30-I — Toàn vẹn và hậu điều kiện**

Given: Giá trị form/config/rate hợp lệ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Không đổi tiền VND của checkout/ledger; validate toàn bộ trước ghi

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC30-U — UI/API/DB và trạng thái**

Given: Giá trị form/config/rate hợp lệ

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Existing→Updated

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

### UC31 — Nhật ký và kiểm soát vận hành

Audit quan trọng atomic với dữ liệu DB; upload file được xác minh trước khi đưa vào catalog. Log từ chối chỉ chứa mã an toàn, không raw token/password/SQL.

**UC31-M — Luồng chính**

Given: Nhân viên có quyền đọc nhật ký; Database local có bản sao; không ghi vào main khi test

When: Lọc/xem audit theo actor/resource/result; Lỗi trước commit rollback; sau commit retry receipt; backup→restore kiểm chứng

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC31-A — Luồng phụ áp dụng**

Given: Nhân viên có quyền đọc nhật ký; Database local có bản sao; không ghi vào main khi test

When: Bản ghi cũ thiếu actor được giữ; SQLite contention retry tối đa 3; thông báo lỗi có requestId

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC31-E — Ngoại lệ**

Given: Nhân viên có quyền đọc nhật ký; Database local có bản sao; không ghi vào main khi test

When: Không có API sửa/xóa audit; token/password/PII nhạy cảm phải loại; Audit fail, duplicate request, timeout, FK/unique violation

Then: Đúng hậu điều kiện của module; luồng hợp lệ thành công, luồng sai bị từ chối và không để lại thay đổi nghiệp vụ dở dang.

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC31-P — Quyền**

Given: Nhân viên có quyền đọc nhật ký; Database local có bản sao; không ghi vào main khi test

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: audit.read; Người dùng đúng quyền; vận hành local

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC31-I — Toàn vẹn và hậu điều kiện**

Given: Nhân viên có quyền đọc nhật ký; Database local có bản sao; không ghi vào main khi test

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Read only; financial ledger không bị viết lại; Không tồn/tiền/ledger dở dang; main history giữ nguyên

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

**UC31-U — UI/API/DB và trạng thái**

Given: Nhân viên có quyền đọc nhật ký; Database local có bản sao; không ghi vào main khi test

When: Thực thi thao tác tương ứng qua UI/API, thử actor khác quyền/chủ sở hữu và đọc snapshot DB sau commit/rollback.

Then: Append-only; Failure→Rollback→Retry→Committed

PASS khi mọi assertion liên kết đạt; FAIL khi có sai lệch hoặc thiếu bằng chứng.

Bằng chứng cần có: kết quả thực thi mới theo các tiêu chí trên; xem báo cáo nghiệm thu hợp nhất.

## Nhánh còn BLOCKED

- **POLICY-PARTIAL-CANCEL:** Chưa có chính sách tài chính hủy một phần được chủ cửa hàng phê duyệt. Database chính không có approval, API từ chối và UI ẩn. Ca positive chỉ dùng policy fixture trong DB thử nghiệm.
- **POLICY-EXCHANGE-PRICE-DIFFERENCE:** Chưa có quy tắc bù chênh lệch giá khi đổi SKU. Engine chỉ chấp nhận cùng đơn giá lịch sử; không tự thu/hoàn phần chênh.
- **LIVE-PAYMENT-CARRIER:** Ngoài phạm vi: PROJECT_SPEC cấm kết nối tiền/hãng vận chuyển thật. Kết quả kiểm thử là local, không chứng nhận giao dịch production.
- **MERCHANDISE-COMMERCIAL-VERIFICATION:** Ảnh hàng thật, quyền sử dụng, nguồn tồn và giá vốn cần chủ cửa hàng xác minh; không dùng dữ liệu demo để tự xác nhận.
