# HÀ NHI FASHION — Đặc tả hiện hành

## Phạm vi và kiến trúc

Ứng dụng bán thời trang nữ và phụ kiện chạy local tại `http://localhost:3000`, dùng Next.js App Router, React, TypeScript, Prisma và SQLite. `src/app` chứa route/API; `src/components` chứa giao diện; `src/lib` chứa nghiệp vụ, xác thực và truy vấn; `prisma` chứa schema/migration; `scripts` và `tests` phục vụ vận hành, kiểm thử trên dữ liệu riêng.

Đây là **LOCAL E-COMMERCE DEMO**, không phải hệ thống giao dịch thương mại đã được chứng nhận. Không deploy, push/sync remote, cấu hình hosting/domain, yêu cầu cloud trả phí hoặc kết nối thanh toán, ngân hàng, hãng vận chuyển thật (kể cả sandbox). Giao nhận, COD, đối soát và hoàn tiền chỉ là bản ghi/mô phỏng nội bộ. Không yêu cầu token/Shop ID hãng. Mã `HN-SHIP-*` là mã hồ sơ nội bộ, không phải vận đơn hãng; không dựng tracking hoặc timeline giả.

## Ba vai trò duy nhất

| Vai trò lưu trữ và hiển thị | Phạm vi |
|---|---|
| CUSTOMER | Mua hàng, hồ sơ/địa chỉ, đơn, đánh giá, hỗ trợ và đổi trả của chính mình |
| SELLER | Vận hành sản phẩm/ảnh/biến thể, tồn kho, đơn hàng, giao nhận và hỗ trợ khách; chỉ các báo cáo vận hành được cấp |
| ADMIN | Toàn bộ quyền, gồm tài khoản/nhân viên, phân quyền, nhật ký, cấu hình, tài chính/COD/hoàn tiền, giá vốn và lợi nhuận |

Không có vai trò chuyên biệt hoặc lớp ánh xạ tên vai trò thứ hai. SELLER không quản trị tài khoản/nhân viên, không thu/đối soát COD, duyệt/thực hiện hoàn tiền, quản trị tài chính, giá vốn hoặc lợi nhuận. Xem [ma trận quyền](docs/rbac-role-permission-matrix.md) và [quản lý tài khoản](docs/account-management.md).

Mọi route, API và service phải kiểm quyền độc lập, mặc định từ chối; không tin actor/role/userId do client cung cấp. CUSTOMER bị giới hạn quyền sở hữu. Phiên HttpOnly được kiểm token hash, hạn dùng, active và permissionVersion với DB hiện tại. Đổi quyền/trạng thái phải thu hồi phiên; bảo vệ ADMIN hoạt động cuối và chặn tự khóa/tự đổi quyền. Đăng ký công khai luôn tạo CUSTOMER. Không trả hash/token/chứng từ nội bộ trong API khách.

## Nhận diện, giao diện và điều hướng

- Thương hiệu HÀ NHI FASHION: thanh lịch, nữ tính, hiện đại, tối giản; giữ logo PNG gốc, không gõ lại chữ, đổi màu hoặc bóp méo. Font Lora cho biên tập và Be Vietnam Pro cho chức năng, đủ glyph tiếng Việt, bảo đảm dễ đọc/contrast AA; thông tin mua hàng nổi bật hơn nội dung phụ.
- Header trắng một hàng: menu/logo trái, tìm kiếm giữa, liên hệ/tài khoản/giỏ/yêu thích phải; danh mục trong drawer hỗ trợ bàn phím. Không thêm hàng menu danh mục chen chúc.
- Trang chủ gồm campaign ngang, 12 sản phẩm mới (4 cột desktop/2 cột mobile), lookbook ngang, danh mục, giới thiệu ngắn, bốn dịch vụ, newsletter/footer. Giữ dòng campaign `office Hung Yen`.
- Thẻ sản phẩm có vùng tên đủ chỗ xuống dòng để giá thẳng hàng; toàn ảnh chính dẫn đúng chi tiết. Có trạng thái trống/lỗi/hết hàng và fallback ảnh trung thực.
- Tổng quan quản trị giữ hai KPI doanh thu và số đơn, không thêm dải tab/bộ lọc/xuất dữ liệu tại đó; KPI nghiệp vụ nằm ở trang tương ứng. Bảng dài cuộn trong khung, menu mobile dùng được bằng bàn phím. Biểu đồ đi qua dữ liệu thật, tooltip ngày/tiền đúng định dạng, không bịa số liệu.
- Tiếng Việt mặc định, hỗ trợ VI/EN và tùy chọn tiền tệ hiển thị; checkout/ledger luôn VND nguyên. Tỷ giá local là tham khảo, ngoài Việt Nam không giao hàng. `returnTo` chỉ nhận đường dẫn local được phép, giữ ngữ cảnh sản phẩm/màu/size/giỏ khi đăng nhập.

## Danh mục và nội dung sản phẩm

Nhóm hàng hiện hành gồm Trang phục, Giày, Túi xách và Phụ kiện. Trang phục hỗ trợ phân cấp do quản trị chỉnh: sơ mi, áo kiểu, vest/blazer, quần công sở, chân váy, đầm, set, áo khoác/len. Hỗ trợ danh mục con, bộ sưu tập, tìm kiếm và lọc danh mục/màu/size/giá/trạng thái còn hàng, sắp xếp và phân trang. SKU/slug duy nhất; sản phẩm có mô tả, chất liệu, phom, chi tiết, hướng dẫn chăm sóc, giá, biến thể màu-size, tồn, ảnh/alt/thứ tự và trạng thái công bố/readiness riêng.

Ảnh chọn đúng màu; thiếu ảnh không mượn màu khác. Giá/ảnh snapshot đơn cũ bất biến. Gợi ý phối phải liên kết sản phẩm/màu hoạt động, có ảnh và còn hàng; món bổ sung bán riêng. Không coi ảnh minh họa hoặc nội dung mẫu là chứng minh hàng thật. Tư vấn size xác định bằng bảng/ma trận, không AI hay suy diễn BMI; không cam kết vừa tuyệt đối. Số đo chỉ trong state trình duyệt, xóa khi đóng, không lưu tài khoản/storage/URL/analytics. Chi tiết tại [danh mục và size](CATALOG_AND_SIZING.md), [chất lượng dữ liệu](docs/product-data-quality.md), [ảnh](docs/product-image-management.md).

Ưu tiên nháp, ẩn/xóa mềm và reference guard; không hard delete làm mất đơn/ledger. Upload local phải kiểm quyền trước đọc, kiểm bytes/format/kích thước/pixel/realpath và chống traversal/symlink; không coi đuôi tệp/MIME là bằng chứng đủ. Không nâng READY hoặc đặt giá/tồn/giá vốn bằng suy đoán. Attribution và giới hạn giấy phép tại [THIRD_PARTY_IMAGES.md](THIRD_PARTY_IMAGES.md) phải được bảo toàn.

## Mua hàng, đơn và tồn kho

- Giỏ gắn đúng người dùng, giữ đúng biến thể/màu/size/lượng; giá/tồn/voucher/phí tính server. Receipt chống lặp độc lập analytics: cùng actor/key/payload chỉ một hiệu ứng, payload khác bị chặn.
- Checkout COD chốt địa chỉ, dòng hàng, đơn giá, giảm giá và phí ship thành snapshot; một voucher FIXED hoặc PERCENT mỗi đơn, kiểm giờ bắt đầu/kết thúc Việt Nam và giới hạn lượt. Phí chuẩn 30.000 VND, ngưỡng miễn ship theo cấu hình hiện hành; không tự thêm chồng mã/chính sách mới.
- Transaction/CAS bảo vệ tạo đơn, trừ tồn, hủy/hoàn tồn và thao tác đồng thời; không âm tồn/oversell. Không dùng thanh toán hoặc chuyển hàng để lách máy trạng thái. Hủy một phần **bị tắt** khi chưa có chính sách tài chính được phê duyệt; fixture thử nghiệm không phải chính sách áp dụng.
- Xử lý đơn gồm tìm mã/chi tiết, xác nhận/từ chối, phân công/ưu tiên, đóng gói, checklist SKU/màu/size/lượng và packedAt/packedBy trước bàn giao. Có tạm dừng khi sai hàng.
- Kho có nhập/xuất theo SKU, số lượng, ngày, nhà cung cấp, lý do; movement và audit atomic. Phiếu kiểm kê nháp/gửi/duyệt/hủy so tồn trước–sau và từ chối snapshot cũ ghi đè giao dịch mới; hàng hỏng cách ly khỏi tồn bán.
- Tra cứu công khai yêu cầu mã + SĐT phù hợp; khách đăng nhập chỉ tra đơn mình. Dữ liệu công khai dùng allowlist, không lộ địa chỉ đầy đủ/chứng từ/actor tài chính/token.

Chi tiết: [quy tắc đơn](docs/order-business-rules.md), [máy trạng thái đơn](docs/order-state-machine.md), [giao nhận](docs/shipping-business-rules.md), [trạng thái giao nhận](docs/shipping-state-machine.md), [COD](docs/cod-reconciliation.md).

## Giao nhận, tiền và đổi trả

Giao nhận thủ công có lịch sử thật trong DB, lý do thất bại/giao lại/chuyển hoàn và kiểm chuyển trạng thái. Giao thành công không tự đánh dấu đã trả tiền; hàng chuyển hoàn không tự hoàn tồn trước kiểm hàng. COD tách số kỳ vọng, thu khách, chuyển về và đối soát; sai lệch giữ DISPUTED, correction có chứng từ và liên kết bản gốc, không sửa/xóa ledger.

Chỉ tiếp nhận **hàng lỗi trong đủ 72 giờ từ thời điểm nhận hàng**, gồm đúng hạn cuối; không dùng hết ngày lịch. Snapshot mốc giao đầu tiên, không bịa mốc thiếu. CUSTOMER sở hữu đơn gửi từng dòng/lượng/lý do; ảnh lỗi không bắt buộc và phải riêng tư. ADMIN xác minh lỗi trước duyệt, nhận/kiểm hàng; chỉ SELLABLE hoàn tồn đúng một lần, DAMAGED cách ly. Không mở chính sách đổi size/màu/mẫu vì sở thích.

Đổi SKU chỉ cùng đơn giá lịch sử, kiểm tồn trong transaction; **khác giá bị chặn** khi chưa có chính sách bù chênh lệch. Giữ đơn/kiện gốc, theo dõi hàng thay thế riêng. Hoàn tiền mô phỏng tính server từ snapshot sau giảm giá và tiền đã thu còn có thể hoàn; tách duyệt/thực hiện, không chuyển tiền thật hoặc ghi đè COD. Xem [đổi trả](docs/returns-business-rules.md), [workflow](docs/returns-exchange-workflow.md), [trạng thái](docs/returns-state-machine.md), [sổ hoàn tiền](docs/mock-refund-ledger.md).

## Khách hàng, hỗ trợ và quản trị

Đăng ký/đăng nhập/đăng xuất/quên mật khẩu local, đổi mật khẩu và thu hồi phiên; lỗi xác thực không tiết lộ tài khoản. Đăng nhập bằng email hoặc số điện thoại; đăng ký yêu cầu ít nhất một trong hai. Hồ sơ cho sửa tên/SĐT, địa chỉ/default address, ngôn ngữ/tiền tệ; email không đổi qua form khách. Không sửa snapshot địa chỉ đơn cũ.

Đánh giá xác minh sau giao; phản hồi và ẩn/hiện phải có lịch sử/lý do. Inquiry/replies gắn userId server, không ghép bằng email nhập. Hỗ trợ nội bộ, không cam kết chat realtime ngoài hệ thống. Hồ sơ khách liên kết đơn, đổi trả và hỗ trợ thật.

ADMIN quản lý ba loại tài khoản, khóa/mở, cấu hình, voucher, banner, danh mục/bộ sưu tập và nhật ký. Tài khoản, vai trò, mật khẩu, phiên và dữ liệu kinh doanh phải được bảo toàn ngoài thay đổi phân quyền đã phê duyệt. Không reset/seed database chính.

Liên hệ chính thức: `hanhifashion@gmail.com`, `0961982102`, [Facebook](https://www.facebook.com/share/19MKdV11Hu/?mibextid=wwXIfr), [Instagram](https://www.instagram.com/ha_nhi.05?mdxt=MWh4MHhzOHkxNjhrOA==). Hiển thị footer, `/lien-he`, hỗ trợ đơn; dùng mailto/tel và mở social an toàn. Không bịa địa chỉ, đăng ký kinh doanh hoặc giờ mở cửa. Thông tin có thể chỉnh trong cấu hình ADMIN.

## Báo cáo, an toàn và vận hành

Báo cáo đơn/sản phẩm/tồn/khách/funnel/attribution/COD/lợi nhuận lấy dữ liệu first-party SQLite; không tracker ngoài. Báo cáo đơn nhóm theo ngày tạo và trạng thái/hoàn tiền hiện tại, không phải sổ dòng tiền ngày thu. Tồn là số dư hiện tại. Không suy đoán giá vốn thiếu; hiển thị độ phủ và giới hạn lợi nhuận. CSV/Excel cùng filter/scope/quyền, `.xlsx` thật, chống formula injection, private/no-store và audit export. Xem [quy tắc phân tích](docs/analytics-business-rules.md), [định nghĩa chỉ số](docs/analytics-metric-definitions.md), [phân quyền](docs/analytics-rbac-matrix.md).

Ghi nghiệp vụ và audit atomic; không có API sửa/xóa audit. Log kỹ thuật chỉ allowlist/requestId/code, không raw body/password/token/PII/SQL. Rate limit bộ nhớ và CSP dev không phải chứng nhận production. Backup SQLite online, restore kiểm tra ở file riêng, integrity/FK/count/hash mọi bảng, không đè DB đang dùng. Xem [backup](docs/local-backup-restore.md) và [an toàn](docs/security-hardening-report.md).

## Nghiệm thu và giới hạn

[Tiêu chuẩn nghiệp vụ](docs/business-acceptance-standards.md) và [31 use case](docs/business-acceptance-31.md) là yêu cầu, không tự chứng minh PASS. [Báo cáo hợp nhất](docs/business-acceptance-report.md) tách bằng chứng lịch sử khỏi kiểm tra phiên bản ba vai trò chưa chạy. Chỉ ghi kết quả đã thực thi; dùng DB thử riêng, không sửa dữ liệu chính để làm đẹp kết quả.

Dữ liệu tổng hợp phải giữ provenance, ảnh tham khảo phải giữ attribution. Chưa xác minh hàng thật, tồn, bản quyền ảnh, giá vốn, WCAG đầy đủ, tải nhiều instance hoặc bảo mật production; không tuyên bố sẵn sàng bán thật.
