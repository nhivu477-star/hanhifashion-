# Tiêu chuẩn nghiệm thu nghiệp vụ thương mại điện tử

Ngày lập: 19/10/2026, điều chỉnh ngày 20/10/2026. Mốc nghiệm thu hiện hành là `business-acceptance-31.md` (31 Use Case phù hợp HÀ NHI). Mở rộng phạm vi phân hệ Chương 1–2 trong `admin-functional-scope.md` và đặc tả hiện tại. Thực thi trong ứng dụng hiện hữu, không tạo dự án khác.

## Phạm vi và chuẩn quyết định

- Môi trường LOCAL E-COMMERCE DEMO theo PROJECT_SPEC: giao nhận, COD, đối soát và hoàn tiền là ghi nhận/mô phỏng nội bộ. Không phải nghiệm thu vận chuyển hoặc thanh toán thật.
- Giữ bố cục Tổng quan đã duyệt: doanh thu + số đơn; KPI nghiệp vụ tại trang tương ứng. Danh sách chức năng là baseline nghiệp vụ, không tự đảo thay đổi giao diện đã duyệt.
- PASS chỉ khi các nhóm main/alternative/exception/permission/data-integrity của use case có bằng chứng thực thi đạt. FAIL nếu sai kết quả hoặc thiếu bằng chứng bắt buộc. BLOCKED khi cần dữ liệu/bằng chứng/hệ thống ngoài phạm vi local; phải ghi nguyên nhân, không tính PASS.
- Không dùng kết quả lần chạy cũ làm bằng chứng cho phiên bản sửa mới. Đối chiếu tên database và timestamp các tệp kết quả.
- Mỗi tiêu chí dùng ID `<use-case>-M/A/E/P/I/U` theo hợp đồng chung dưới đây; phần chi tiết từng use case cung cấp actors, tiền điều kiện, thao tác, nhánh và hậu điều kiện.

## Hợp đồng đo lường áp dụng cho từng use case

| ID hậu tố | Given–When–Then và tiêu chí PASS |
|---|---|
| M — Main | Given actors/tiền điều kiện của use case; When chạy toàn bộ main flow qua UI hoặc API; Then kết quả đọc lại từ API/DB đúng hậu điều kiện, UI hiển thị trạng thái đã commit. Mutation thành công trả 2xx. |
| A — Alternative | Given từng nhánh hợp lệ được liệt kê; When chạy nhánh; Then cho kết quả được mô tả và giữ mọi bất biến. Empty state phải là dữ liệu rỗng thật. |
| E — Exception | Given từng input/lỗi/trạng thái cấm; When gọi trực tiếp API; Then 4xx cho yêu cầu sai, không thay đổi dữ liệu nghiệp vụ. Lỗi hệ thống không được báo thành công; không rò token/SQL/mật khẩu. |
| P — Permission | Given actor thiếu quyền, khác chủ sở hữu, khóa/hết phiên/phiên version cũ; When gọi UI/API/service bảo vệ; Then dữ liệu riêng bị từ chối và không ghi nghiệp vụ. API quản trị 401/403, trang quyền có thông báo từ chối (Next HTML có thể HTTP 200). |
| I — Integrity | Given snapshot trước; When mutation, retry trùng và cạnh tranh; Then một side effect cho một key; CAS/unique/FK giữ đúng; audit/movement/financial changes cùng transaction; lỗi audit rollback dữ liệu; không âm tồn/hoàn vượt thực thu. |
| U — UI/API/DB | Given dữ liệu thử nghiệm riêng; When thao tác form và đọc lại sau reload; Then UI/API/DB cùng trạng thái, số tiền, lượng; không pageerror hoặc tràn ngang ở kích thước đã kiểm. |

Mọi thao tác tài chính dùng VND nguyên không âm, trong phạm vi cột Int; server tính giá. `subtotal = Σ(unitPrice × remaining quantity)`, `total = subtotal − discount + shipping`; COD Payment.amount = Order.total. Report bán hàng chỉ dùng phần đã giao; tiền thu/chuyển/refund là khái niệm riêng. Giá vốn thiếu là NULL, không giả lợi nhuận.

## Quy tắc bổ sung

1. Chống lặp giỏ độc lập analytics consent. Cùng key + actor + payload chuẩn hóa = cùng hiệu ứng; đổi payload phải bị chặn. Checkout key ràng buộc cart và địa chỉ/voucher đã commit.
2. **Hủy một phần chưa được duyệt, đang BLOCKED trên database chính.** Phần dưới là đề xuất kỹ thuật chỉ kiểm bằng policy fixture, không phải chính sách đã áp dụng. Nếu được duyệt, hủy một phần chỉ trước chuẩn bị, chưa tạo shipment, chưa thanh toán và còn ít nhất một đơn vị. Giữ đơn giá/phí ship đã chốt, phân bổ giảm giá hiện có theo net snapshot; dư làm tròn nằm ở đơn vị cuối. Không áp lại mức tối thiểu/free shipping để thu thêm tiền ngoài thỏa thuận. Voucher giữ lượt đến khi hủy cả đơn. Muốn bỏ hết dùng hủy toàn bộ.
3. Hủy một phần giữ originalQuantity và audit before/after; lượng hiện tại dùng cho đóng gói/tồn/return. Đã đóng gói/bàn giao phải theo quy trình chuyển hoàn/đổi trả; không sửa khoản phải thu của kiện đang giao.
4. Trả/hoàn một phần giữ đúng số lượng chưa được claim. Refund giữ/chấp thuận/hoàn không vượt tiền đã thu; final remainder không mất VND. Kiểm SELLABLE mới hoàn tồn; DAMAGED/REVIEW/REJECTED không tự cộng tồn.
5. Voucher có start/end giờ VN, bao gồm đúng mốc cuối; date-only hết hiệu lực cuối ngày VN. Start ≤ end; limit ≥ used; tranh lượt cuối chỉ một commit. Sửa voucher không sửa đơn cũ.
6. Sửa sản phẩm/variant/category/collection/media/publication/settings/customer phải có audit cùng giao dịch DB. Upload file không nằm trong SQLite transaction: file thất bại không được ghi thành ảnh sản phẩm thành công; không xóa ảnh còn tham chiếu lịch sử.
7. Cài đặt validate toàn form trước ghi. Nội dung chính sách bổ sung là text, không HTML; không tự sửa điều kiện lỗi 72 giờ trong engine hoặc hồ sơ cũ.
8. Khôi phục mật khẩu dùng mail local file mode 0600 cả khi chạy production build ở preview localhost. Token chỉ trong mail riêng/hash DB; token một lần, có hạn; đổi/reset thu hồi phiên cùng giao dịch.
9. Retry SQLite chỉ cho transaction đã rollback, có giới hạn. Không retry tác vụ tiền/stock ngoài transaction. Khôi phục backup phải integrity_check=ok, foreign_key_check=0 và nội dung nghiệp vụ khớp.
10. Hỗ trợ liên kết theo userId được server xác định khi gửi, không ghép bằng email người dùng nhập. Hồ sơ khách chỉ cho staff có quyền; đơn/returns/support có quyền riêng.
11. Export CSV và Excel có cùng scope/filter/permission; `.xlsx` thật, số/ngày có kiểu và text bắt đầu '=' không được trở thành formula. Dữ liệu tải về private/no-store; ghi audit export.

## Danh mục use case và kịch bản nghiệm thu

### AUTH-01 — Đăng ký

- **Actors & RBAC:** Guest → CUSTOMER.
- **Given / tiền điều kiện:** Không có tài khoản cùng email.
- **When / main:** Nhập hồ sơ và mật khẩu hợp lệ → tạo tài khoản → đăng nhập.
- **Alternative:** Email khác chữ hoa/thường được chuẩn hóa; wishlist được hợp nhất.
- **Exception:** Email trùng, điện thoại sai, mật khẩu ngắn/không khớp; chèn role không được nâng quyền.
- **Then / hậu điều kiện & integrity:** User duy nhất; passwordHash bcrypt; phiên HttpOnly; không lộ mật khẩu.
- **State transitions:** Guest → CUSTOMER.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-AUTH-02`, `browser:customer login`.

### AUTH-02 — Đăng nhập / đăng xuất

- **Actors & RBAC:** Mọi tài khoản hoạt động.
- **Given / tiền điều kiện:** Thông tin đăng nhập hợp lệ; tài khoản chưa bị khóa.
- **When / main:** Đăng nhập → cookie → đúng trang theo quyền; đăng xuất → xóa phiên.
- **Alternative:** returnTo nội bộ hợp lệ; ADMIN/SELLER/BUYER có điểm đến riêng.
- **Exception:** Sai mật khẩu, khóa, returnTo bên ngoài, phiên cũ/hết hạn.
- **Then / hậu điều kiện & integrity:** Không tái sử dụng phiên bị thu hồi; không nâng quyền từ client.
- **State transitions:** Anonymous ↔ Authenticated.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-AUTH-02`, `rbac:13 `, `rbac:24 `, `browser:login destination`.

### AUTH-03 — Quên / đặt lại mật khẩu

- **Actors & RBAC:** Guest với token bí mật một lần.
- **Given / tiền điều kiện:** Token còn hạn 30 phút, chưa dùng.
- **When / main:** Tạo mail local → dùng token → đổi hash → thu hồi phiên.
- **Alternative:** Email không tồn tại nhận cùng thông báo; retry sau rollback.
- **Exception:** Token hết hạn, đã dùng; hai yêu cầu đồng thời chỉ một thành công.
- **Then / hậu điều kiện & integrity:** Claim token + hash + thu hồi phiên + audit cùng transaction.
- **State transitions:** UNUSED → USED.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-AUTH-03`, `business:BA-AUTH-04`, `business:BA-AUTH-06`.

### AUTH-04 — Đổi mật khẩu

- **Actors & RBAC:** Tài khoản đăng nhập.
- **Given / tiền điều kiện:** Mật khẩu hiện tại đúng; tài khoản hoạt động.
- **When / main:** Kiểm tra mật khẩu → đổi → thu hồi tất cả phiên.
- **Alternative:** Đăng nhập lại bằng mật khẩu mới.
- **Exception:** Sai mật khẩu cũ, phiên hết hạn, lỗi audit, hai lần đổi tranh chấp.
- **Then / hậu điều kiện & integrity:** CAS hash cũ; hash và thu hồi phiên/audit atomic.
- **State transitions:** Authenticated → Reauthentication required.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-AUTH-05`.

### AUTH-05 — Hồ sơ / địa chỉ

- **Actors & RBAC:** Khách sở hữu hồ sơ.
- **Given / tiền điều kiện:** Đăng nhập; địa chỉ thuộc userId.
- **When / main:** Xem/sửa hồ sơ; thêm/sửa/xóa địa chỉ.
- **Alternative:** Chưa có địa chỉ; nhiều địa chỉ.
- **Exception:** Truy cập ID người khác; điện thoại/địa chỉ sai; phiên hết hạn.
- **Then / hậu điều kiện & integrity:** Không thay chủ sở hữu; không ghi địa chỉ người khác.
- **State transitions:** Existing → Updated / Deleted.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-AUTH-02`, `business:BA-CUSTOMER-03`.

### CAT-01 — Tìm kiếm / xem / lọc sản phẩm

- **Actors & RBAC:** Guest, Customer.
- **Given / tiền điều kiện:** Sản phẩm/danh mục hoạt động; mode bán kiểm readiness.
- **When / main:** Tìm không dấu → lọc kết hợp → xem màu/size/giá.
- **Alternative:** Không kết quả; phân trang; hết hàng.
- **Exception:** Slug không tồn tại, query không hợp lệ, ảnh thiếu.
- **Then / hậu điều kiện & integrity:** Không lộ sản phẩm ẩn; giá hiển thị theo variant/sale/base.
- **State transitions:** Active visible / Archived hidden.
- **Bằng chứng kiểm thử cần đối chiếu:** `phase5:26 `, `browser:responsive`.

### CAT-02 — Thêm / sửa sản phẩm

- **Actors & RBAC:** products.create / products.update.
- **Given / tiền điều kiện:** Danh mục hợp lệ; SKU/slug duy nhất; ảnh local có thật.
- **When / main:** Gửi form → validate → ghi sản phẩm/ảnh → audit → đọc lại.
- **Alternative:** Giá thường/giá sale; gallery nhiều ảnh.
- **Exception:** Giá không dương, sale ≥ base, SKU trùng, danh mục sai, audit thất bại.
- **Then / hậu điều kiện & integrity:** Product + ảnh + audit atomic; đơn cũ không đổi.
- **State transitions:** New → Active; Active → Updated.
- **Bằng chứng kiểm thử cần đối chiếu:** `phase5:03 `, `business:BA-PRODUCT-01`, `order:12 `, `browser:SELLER:`.

### CAT-03 — Ẩn / xóa mềm sản phẩm

- **Actors & RBAC:** products.archive.
- **Given / tiền điều kiện:** Sản phẩm tồn tại.
- **When / main:** Đặt active=false; ẩn mua mới.
- **Alternative:** Giữ trang quản trị/lịch sử đơn; giỏ cũ có thể xóa.
- **Exception:** Vai trò không có archive; mua sản phẩm đã ẩn.
- **Then / hậu điều kiện & integrity:** Không xóa OrderItem/ledger; trả hàng cũ vẫn đối chiếu được.
- **State transitions:** Active → Archived → Active.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-PRODUCT-02`, `browser:Retired products`.

### CAT-04 — Biến thể / SKU / giá

- **Actors & RBAC:** products.update; inventory.adjust khi đổi tồn.
- **Given / tiền điều kiện:** SKU duy nhất; size/màu thuộc sản phẩm.
- **When / main:** Tạo/sửa SKU, override giá, ghi movement khi đổi tồn.
- **Alternative:** Giá override rỗng dùng sale/base; thêm size.
- **Exception:** SKU trùng, stock âm/quá giới hạn, chuyển variant sang sản phẩm khác.
- **Then / hậu điều kiện & integrity:** Variant + movement + audit atomic; historical SKU snapshot không đổi.
- **State transitions:** New → Configured → Updated.
- **Bằng chứng kiểm thử cần đối chiếu:** `phase5:02 `, `rbac:02 `, `browser:SELLER:`.

### CAT-05 — Màu / gallery / gợi ý phối

- **Actors & RBAC:** products.update.
- **Given / tiền điều kiện:** Ảnh local hợp lệ; màu và target cùng catalog hợp lệ.
- **When / main:** Lưu màu/ảnh/position hoặc outfit → invalidate publication.
- **Alternative:** Đổi tên màu cập nhật variant; xóa outfit hợp lệ.
- **Exception:** Màu khác sản phẩm, file sai, outfit tự trỏ hoặc hàng hết.
- **Then / hậu điều kiện & integrity:** Ghi cấu hình + invalidation + audit atomic.
- **State transitions:** PENDING_ASSETS after catalogue change.
- **Bằng chứng kiểm thử cần đối chiếu:** `phase5:04 `, `phase5:media traversal`.

### CAT-06 — Danh mục / bộ sưu tập

- **Actors & RBAC:** products.update.
- **Given / tiền điều kiện:** Slug duy nhất; cấu trúc cha/con hợp lệ.
- **When / main:** Thêm/sửa và gán sản phẩm → refresh tìm kiếm.
- **Alternative:** Danh mục con; collection nhiều sản phẩm.
- **Exception:** Vòng/self-parent; chuyển cha sai; FK sản phẩm không tồn tại.
- **Then / hậu điều kiện & integrity:** Danh mục/collection + liên kết + audit atomic.
- **State transitions:** New → Active → Hidden.
- **Bằng chứng kiểm thử cần đối chiếu:** `browser:Admin consistency`.

### CAT-07 — Bảng size / xuất bản

- **Actors & RBAC:** products.update / products.publish.
- **Given / tiền điều kiện:** Ma trận đo hợp lệ; READY cần ảnh/hàng/tồn được xác minh.
- **When / main:** Cấu hình bảng riêng/kế thừa; duyệt readiness và publication.
- **Alternative:** Bảng category; bản nháp giữ được thiếu dữ liệu.
- **Exception:** Dữ liệu JSON sai, ảnh tham chiếu/chưa xác minh, tồn chưa rõ nguồn.
- **Then / hậu điều kiện & integrity:** Không tự giả bằng chứng hàng thật; audit trong transaction.
- **State transitions:** DRAFT ↔ PENDING_ASSETS → READY.
- **Bằng chứng kiểm thử cần đối chiếu:** `phase5:01 `, `phase5:04 `.

### CAT-08 — Upload / thư viện ảnh

- **Actors & RBAC:** media.upload / products.update.
- **Given / tiền điều kiện:** Ảnh raster local an toàn và được phép dùng.
- **When / main:** Decode/reencode → lưu file; metadata → liên kết ảnh.
- **Alternative:** Ảnh development/reference tách ảnh sản phẩm.
- **Exception:** SVG/file giả, traversal, quá dung lượng; xóa ảnh còn tham chiếu.
- **Then / hậu điều kiện & integrity:** Không xóa ảnh snapshot đơn; quyền kiểm tra trước parse; metadata audited.
- **State transitions:** PENDING → APPROVED / REJECTED.
- **Bằng chứng kiểm thử cần đối chiếu:** `phase5:06 `, `phase5:07 `, `phase5:08 `, `phase5:valid raster`.

### INV-01 — Nhập / xuất kho

- **Actors & RBAC:** inventory.adjust.
- **Given / tiền điều kiện:** SKU tồn tại; quantity nguyên dương; lý do/ngày/nhà cung cấp hợp lệ.
- **When / main:** Form IN/OUT → CAS stock → movement + audit.
- **Alternative:** Retry cùng key cùng nội dung trả lại kết quả.
- **Exception:** OUT quá tồn; date tương lai; key khác nội dung.
- **Then / hậu điều kiện & integrity:** Không âm tồn; delta đúng; chỉ một movement mỗi eventKey.
- **State transitions:** stock N → N ± quantity.
- **Bằng chứng kiểm thử cần đối chiếu:** `browser:stock forms`, `business:BA-DATA-01`.

### INV-02 — Điều chỉnh / lịch sử tồn

- **Actors & RBAC:** inventory.adjust / inventory.movements.read.
- **Given / tiền điều kiện:** SKU tồn tại; số tồn nguyên không âm.
- **When / main:** Điều chỉnh số kiểm đếm có lý do; xem movement theo SKU.
- **Alternative:** Tồn 0; phân trang; không có lịch sử.
- **Exception:** Mất quyền, số âm, tranh chấp ghi, lỗi giữa transaction.
- **Then / hậu điều kiện & integrity:** Movement delta=after-before; ghi actor/time/reason; không sửa ledger cũ.
- **State transitions:** Current stock → Counted stock.
- **Bằng chứng kiểm thử cần đối chiếu:** `rbac:03 `, `browser:SELLER:`, `browser:stock forms`.

### CART-01 — Thêm / sửa / xóa giỏ

- **Actors & RBAC:** Khách đăng nhập, giỏ riêng.
- **Given / tiền điều kiện:** Sản phẩm/màu/danh mục hoạt động; tồn đủ.
- **When / main:** Thêm hoặc increment → sửa lượng → xóa.
- **Alternative:** Xóa hàng đã ẩn; tắt analytics; retry sau lỗi.
- **Exception:** Lượng >99, thiếu tồn, key khác payload, guest/hết phiên.
- **Then / hậu điều kiện & integrity:** Receipt độc lập analytics; mutation atomic; không thay tồn khi chỉ thêm giỏ.
- **State transitions:** Empty ↔ Populated.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-CART-01`, `business:BA-CART-02`, `business:BA-CART-03`, `business:BA-CART-04`, `business:BA-CART-05`, `business:BA-CART-06`.

### CART-02 — Wishlist / hợp nhất sau login

- **Actors & RBAC:** Guest local; khách sở hữu wishlist.
- **Given / tiền điều kiện:** Sản phẩm tồn tại/được hoạt động khi thêm.
- **When / main:** Lưu wishlist → đăng nhập → merge; xóa mục.
- **Alternative:** Thêm lặp là no-op; xóa sản phẩm đã ẩn.
- **Exception:** ID không tồn tại; người khác không sửa được wishlist.
- **Then / hậu điều kiện & integrity:** Unique wishlist/product; không đổi giỏ của tài khoản khác.
- **State transitions:** Local → Account wishlist.
- **Bằng chứng kiểm thử cần đối chiếu:** `browser:Retired products`, `order:11 `.

### CHECKOUT-01 — Báo giá

- **Actors & RBAC:** Khách đăng nhập.
- **Given / tiền điều kiện:** Giỏ không rỗng; địa chỉ vùng VN; giá/tồn hợp lệ.
- **When / main:** Server tính subtotal-discount+shipping.
- **Alternative:** Không voucher; giảm phần trăm/tối đa; miễn ship theo net.
- **Exception:** Voucher sai/hết hạn/chưa bắt đầu/cạn lượt; giá 0; vùng ngoài VN.
- **Then / hậu điều kiện & integrity:** VND integer; không nhận giá client; quote không trừ tồn/lượt.
- **State transitions:** Cart → Quote.
- **Bằng chứng kiểm thử cần đối chiếu:** `order:01 `, `business:BA-PROMO-01`, `business:BA-PROMO-02`, `browser:unsupported shipping`.

### CHECKOUT-02 — Đặt COD

- **Actors & RBAC:** Khách đăng nhập.
- **Given / tiền điều kiện:** Quote hợp lệ; key UUID; tồn và lượt voucher còn đủ tại commit.
- **When / main:** CAS tồn/lượt → order/items/payment/history/audit → xóa giỏ.
- **Alternative:** Địa chỉ lưu sẵn; nhiều dòng; đơn không giảm giá.
- **Exception:** Tranh mua đơn vị cuối; tranh lượt voucher; lỗi giữa giao dịch.
- **Then / hậu điều kiện & integrity:** Tất cả transaction; không âm tồn; payment UNPAID; snapshot lịch sử.
- **State transitions:** Cart → PENDING / UNPAID.
- **Bằng chứng kiểm thử cần đối chiếu:** `order:03 `, `order:05 `, `business:BA-PROMO-03`, `browser:customer login`.

### CHECKOUT-03 — Retry checkout

- **Actors & RBAC:** Chủ cart tạo yêu cầu.
- **Given / tiền điều kiện:** Key đã gắn với cart và payload chuẩn hóa.
- **When / main:** Retry cùng key → cùng order.
- **Alternative:** Mất response sau commit; gọi đồng thời.
- **Exception:** Key của cart khác; đổi địa chỉ/voucher khi dùng lại key.
- **Then / hậu điều kiện & integrity:** Một order/payment/trừ tồn; không xóa giỏ mới khi replay.
- **State transitions:** Committed → Same result.
- **Bằng chứng kiểm thử cần đối chiếu:** `order:04 `, `order:17 `, `business:BA-CHECKOUT-01`.

### ORDER-01 — Danh sách / chi tiết / tra cứu

- **Actors & RBAC:** orders.read; khách sở hữu; guest capability tối thiểu.
- **Given / tiền điều kiện:** Đơn tồn tại; đúng ownership/quyền.
- **When / main:** Tìm mã → xem snapshot/timeline thực.
- **Alternative:** Tra cứu mã+phone chỉ dữ liệu tối thiểu.
- **Exception:** ID/code khác khách; token sai; không lộ address/email/token.
- **Then / hậu điều kiện & integrity:** UI/API/DB khớp tổng tiền/trạng thái; public allowlist.
- **State transitions:** Read only.
- **Bằng chứng kiểm thử cần đối chiếu:** `order:11 `, `order:14 `, `shipping:14 `, `browser:customer login`.

### ORDER-02 — Xác nhận / từ chối / đóng gói

- **Actors & RBAC:** orders.manage; orders.cancel cho hủy.
- **Given / tiền điều kiện:** Trạng thái đầu hợp lệ; lý do khi hủy/giao nhận.
- **When / main:** PENDING→CONFIRMED→PROCESSING; từ chối dùng CANCELLED.
- **Alternative:** Đường giao nhận thủ công trước có shipment.
- **Exception:** Nhảy bước, lùi trạng thái, khách tự đóng gói.
- **Then / hậu điều kiện & integrity:** CAS + history + audit; không tự ghi PAID từ status.
- **State transitions:** Theo order-state-machine.md.
- **Bằng chứng kiểm thử cần đối chiếu:** `order:09 `, `rbac:05 `, `browser:customer login`.

### ORDER-03 — Hủy toàn bộ

- **Actors & RBAC:** orders.cancel hoặc owner trước chuẩn bị.
- **Given / tiền điều kiện:** UNPAID; chưa giao hoặc hàng chuyển hoàn đã về.
- **When / main:** Cancel → hoàn lượng còn lại → release voucher một lần.
- **Alternative:** Retry CANCELLED no-op; trả về rồi hủy.
- **Exception:** Đã PAID; đang giao/chưa hoàn về; khách hủy muộn.
- **Then / hậu điều kiện & integrity:** Hoàn tồn/coupon/history/audit atomic; paid dùng refund flow.
- **State transitions:** PENDING/CONFIRMED/PROCESSING/RETURNED→CANCELLED.
- **Bằng chứng kiểm thử cần đối chiếu:** `order:06 `, `order:07 `, `order:16 `, `business:BA-PARTIAL-07`.

### ORDER-04 — Hủy một phần

- **Actors & RBAC:** orders.cancel hoặc CUSTOMER sở hữu.
- **Given / tiền điều kiện:** Chưa được mở ở database chính; cần quyết định phê duyệt chính sách. Đề xuất thử nghiệm: PENDING/CONFIRMED, UNPAID, chưa tạo shipment; còn ít nhất 1 đơn vị.
- **When / main:** Chọn dòng/lượng → phân bổ net đã chốt → hoàn tồn → cập nhật COD.
- **Alternative:** Nhiều lần hủy, retry/cạnh tranh, sau đó hủy toàn bộ.
- **Exception:** Lặp dòng, vượt lượng, full removal, paid/prepared/shipment, ID không thuộc đơn.
- **Then / hậu điều kiện & integrity:** Giữ originalQuantity/unitPrice; giảm discount đúng VND; payment=order.total; audit atomic.
- **State transitions:** Order status unchanged; remaining quantity decreases.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-PARTIAL-01`, `business:BA-PARTIAL-02`, `business:BA-PARTIAL-03`, `business:BA-PARTIAL-04`, `business:BA-PARTIAL-05`, `business:BA-PARTIAL-06`, `business:BA-PARTIAL-07`, `business:BA-PARTIAL-08`, `business:BA-PARTIAL-09`, `browser:Business acceptance UI: customer partial`, `browser:Business acceptance UI: admin customer`.

### SHIP-01 — Tạo hồ sơ giao nhận nội bộ

- **Actors & RBAC:** shipping.create.
- **Given / tiền điều kiện:** PROCESSING, UNPAID, COD payment khớp; chưa có shipment.
- **When / main:** Tạo HN-SHIP-* và snapshot nhận hàng.
- **Alternative:** Thông số kiện hợp lệ; thông tin tùy chọn.
- **Exception:** Đơn sai trạng thái/đã có kiện; input parcel sai; carrier thật bị chặn.
- **Then / hậu điều kiện & integrity:** Một shipment/order; không trừ tồn lần hai.
- **State transitions:** None→PENDING.
- **Bằng chứng kiểm thử cần đối chiếu:** `shipping:01 `, `shipping:02 `, `browser:customer login`.

### SHIP-02 — Bàn giao / giao thành công

- **Actors & RBAC:** shipping.update.
- **Given / tiền điều kiện:** Trạng thái shipment đầu hợp lệ.
- **When / main:** PENDING→READY_FOR_PICKUP→PICKED_UP→IN_TRANSIT→DELIVERED.
- **Alternative:** Retry trạng thái đã ghi không tạo side effect.
- **Exception:** Nhảy bước; thiếu lý do; sửa order trực tiếp khi đã có kiện.
- **Then / hậu điều kiện & integrity:** Order/shipment/event khớp; giao thành công vẫn UNPAID.
- **State transitions:** Theo shipping-state-machine.md.
- **Bằng chứng kiểm thử cần đối chiếu:** `shipping:03 `, `shipping:04 `, `shipping:05 `, `browser:customer login`.

### SHIP-03 — Giao thất bại / giao lại / chuyển hoàn

- **Actors & RBAC:** shipping.failures.manage + shipping.update.
- **Given / tiền điều kiện:** Kiện đang giao; lý do và trạng thái hợp lệ.
- **When / main:** Failure→retry hoặc returning→returned.
- **Alternative:** Hủy trước pickup; retry event.
- **Exception:** Đánh delivered từ returned; hoàn tồn trước hàng về.
- **Then / hậu điều kiện & integrity:** Không hoàn tồn tại cả RETURNED và CANCELLED; timeline thật.
- **State transitions:** DELIVERY_FAILED / RETURNING / RETURNED.
- **Bằng chứng kiểm thử cần đối chiếu:** `shipping:06 `, `shipping:07 `, `shipping:18 `.

### COD-01 — Ghi nhận thu COD

- **Actors & RBAC:** cod.collection.confirm.
- **Given / tiền điều kiện:** Đã giao; payment COD đúng tổng; chứng từ và nguồn thu.
- **When / main:** Thêm collection ledger → tính collected → payment PAID khi đủ.
- **Alternative:** Thu từng phần; thiếu/thừa tiền hiển thị lệch.
- **Exception:** Sai provider/amount/date; trùng key khác payload; thu trước giao.
- **Then / hậu điều kiện & integrity:** Append-only; không nhân đôi từ retry; không ghi PAID từ delivery.
- **State transitions:** UNPAID→PAID when actual recorded collected sufficient.
- **Bằng chứng kiểm thử cần đối chiếu:** `shipping:08 `, `order:08 `, `browser:customer login`.

### COD-02 — Chuyển tiền COD

- **Actors & RBAC:** cod.remittance.record.
- **Given / tiền điều kiện:** Có collection; chứng từ hợp lệ.
- **When / main:** Ghi remittance → outstanding thay đổi.
- **Alternative:** Chuyển từng phần, chưa đủ tiền.
- **Exception:** Chưa thu, số âm không phải correction, ngày tương lai.
- **Then / hậu điều kiện & integrity:** Không cộng lại doanh thu từ tiền chuyển về.
- **State transitions:** OUTSTANDING→PARTIAL→READY.
- **Bằng chứng kiểm thử cần đối chiếu:** `shipping:09 `, `shipping:10 `.

### COD-03 — Đối soát / sai lệch

- **Actors & RBAC:** cod.reconcile.
- **Given / tiền điều kiện:** Collected/remitted/expected và fees khớp hoặc có tranh chấp.
- **When / main:** Đối chiếu ledger → reconcile hoặc dispute có ghi chú.
- **Alternative:** Thiếu/thừa; tiếp tục bổ sung chứng từ.
- **Exception:** Đối soát khi còn lệch, không quyền, thao tác đồng thời.
- **Then / hậu điều kiện & integrity:** Một settlement hợp lệ; audit; outstanding không bị xóa để che lệch.
- **State transitions:** PENDING/PARTIAL/DISPUTED→RECONCILED.
- **Bằng chứng kiểm thử cần đối chiếu:** `shipping:11 `, `shipping:12 `, `shipping:16 `, `analytics:22 `.

### COD-04 — Điều chỉnh chứng từ

- **Actors & RBAC:** Quyền collection/remittance tương ứng.
- **Given / tiền điều kiện:** Chứng từ gốc tồn tại; correction link + evidence.
- **When / main:** Thêm bút toán bù có tham chiếu → tính lại.
- **Alternative:** Chứng từ sai được bù; ledger gốc giữ nguyên.
- **Exception:** Bù quá giới hạn, key khác nội dung, số thu dưới khoản refund đã giữ.
- **Then / hậu điều kiện & integrity:** Không sửa/xóa ledger; không hoàn vượt thực thu.
- **State transitions:** Settlement recomputed / disputed.
- **Bằng chứng kiểm thử cần đối chiếu:** `shipping:13 `, `returns:21 `.

### RETURN-01 — Gửi yêu cầu lỗi / trả một phần

- **Actors & RBAC:** CUSTOMER sở hữu đơn.
- **Given / tiền điều kiện:** DELIVERED/COMPLETED; mốc nhận thật; trong đủ 72h.
- **When / main:** Chọn dòng/lượng, lý do lỗi, REFUND/EXCHANGE → REQUESTED.
- **Alternative:** Đúng mốc 72h; nhiều hồ sơ cho lượng còn lại; ảnh không bắt buộc.
- **Exception:** Quá 72h/thiếu mốc, sai chủ, vượt lượng/claim đồng thời, key khác payload.
- **Then / hậu điều kiện & integrity:** Claim lượng/amount snapshot; không sửa shipment gốc.
- **State transitions:** None→REQUESTED.
- **Bằng chứng kiểm thử cần đối chiếu:** `returns:01 `, `returns:02 `, `returns:03 `, `returns:04 `, `returns:05 `, `returns:26 `.

### RETURN-02 — Xem xét / duyệt / từ chối

- **Actors & RBAC:** returns.review.
- **Given / tiền điều kiện:** Hồ sơ hiện hữu và cạnh chuyển hợp lệ.
- **When / main:** REQUESTED→UNDER_REVIEW→APPROVED/REJECTED.
- **Alternative:** Từ chối trước nhận giải phóng lượng claim.
- **Exception:** Nhảy bước; tự duyệt bởi khách; thiếu lý do.
- **Then / hậu điều kiện & integrity:** History/audit; không tự hoàn tiền khi duyệt.
- **State transitions:** Theo returns-state-machine.md.
- **Bằng chứng kiểm thử cần đối chiếu:** `returns:08 `, `returns:09 `, `rbac:08 `.

### RETURN-03 — Nhận / kiểm hàng / hoàn tồn

- **Actors & RBAC:** returns.inspect; inventory.adjust khi SELLABLE.
- **Given / tiền điều kiện:** Hồ sơ APPROVED→RECEIVED; kết luận từng dòng.
- **When / main:** Nhận không cộng tồn; kiểm SELLABLE cộng đúng lượng một lần.
- **Alternative:** REVIEW kiểm thêm; DAMAGED cách ly; REJECTED không hoàn.
- **Exception:** Ghi đè kết luận cuối, thiếu quyền tồn, hai inspect đồng thời.
- **Then / hậu điều kiện & integrity:** Inspection+movement+audit atomic; không trùng hoàn tồn.
- **State transitions:** RECEIVED→INSPECTED/INSPECTION_FAILED.
- **Bằng chứng kiểm thử cần đối chiếu:** `returns:10 `, `returns:11 `, `returns:12 `, `returns:13 `, `returns:14 `, `returns:15 `.

### RETURN-04 — Đổi SKU và giao hàng thay thế

- **Actors & RBAC:** returns.exchange; shipping.update.
- **Given / tiền điều kiện:** Lỗi đã xác minh; hàng thay thế giá lịch sử bằng nhau; tồn đủ.
- **When / main:** Allocate SKU → trừ tồn → giao kiện đổi nội bộ.
- **Alternative:** SKU khác size/màu là khắc phục lỗi đã thống nhất; thiếu hàng chuyển refund.
- **Exception:** Hết tồn, SKU sai/giá lệch, hai allocate tranh đơn vị cuối.
- **Then / hậu điều kiện & integrity:** Không sửa item/shipment gốc; atomic và audit.
- **State transitions:** INSPECTED→EXCHANGE_PENDING→COMPLETED/CLOSED.
- **Bằng chứng kiểm thử cần đối chiếu:** `returns:16 `, `returns:17 `, `returns:18 `.

### RETURN-05 — Hoàn tiền một phần / nhiều hồ sơ

- **Actors & RBAC:** refunds.approve / refunds.execute.
- **Given / tiền điều kiện:** Hàng đã kiểm hợp lệ; payment có tiền đã thu còn có thể hoàn.
- **When / main:** Prepare → APPROVED → SIMULATED_COMPLETED.
- **Alternative:** Hoàn một số lượng; phí ship theo quyết định hợp lệ; reject/cancel khoản chưa hoàn.
- **Exception:** Số client chèn, vượt paid/refund cap, hai xác nhận đồng thời.
- **Then / hậu điều kiện & integrity:** Tổng giữ/hoàn ≤ thực thu; không xóa COD; số hàng net đúng snapshot/rounding.
- **State transitions:** PENDING→APPROVED→SIMULATED_COMPLETED.
- **Bằng chứng kiểm thử cần đối chiếu:** `returns:19 `, `returns:20 `, `returns:21 `, `analytics:05 `, `analytics:06 `, `analytics:23 `, `browser:customer login`.

### RETURN-06 — Ảnh lỗi / lịch sử riêng tư

- **Actors & RBAC:** Chủ hồ sơ; returns.read/inspect.
- **Given / tiền điều kiện:** Đúng quyền; ảnh JPEG/PNG/WebP ≤2MB.
- **When / main:** Xem timeline và ảnh lỗi qua endpoint riêng.
- **Alternative:** Không ảnh vẫn có thể gửi claim.
- **Exception:** Chủ khác, ảnh giả/SVG/quá pixel, public access.
- **Then / hậu điều kiện & integrity:** Reencode bỏ metadata; không public evidence hoặc ghi chú nội bộ.
- **State transitions:** Read only / private evidence.
- **Bằng chứng kiểm thử cần đối chiếu:** `returns:22 `, `returns:23 `, `returns:28 `, `rbac:12 `.

### CUSTOMER-01 — Hồ sơ khách / lịch sử mua

- **Actors & RBAC:** customers.read; quyền riêng để mở đơn/returns/support.
- **Given / tiền điều kiện:** Đúng CUSTOMER; phân trang.
- **When / main:** Danh sách → hồ sơ → đơn và số đã thu → yêu cầu hỗ trợ.
- **Alternative:** Khách chưa mua/chưa hỗ trợ; quyền chỉ đọc.
- **Exception:** ID nhân viên, ID không tồn tại, Seller không customers.read.
- **Then / hậu điều kiện & integrity:** Select allowlist, không password/token; support theo userId thật.
- **State transitions:** Read only.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-CUSTOMER-01`, `browser:Business acceptance UI: admin customer`.

### CUSTOMER-02 — Tiếp nhận hỗ trợ

- **Actors & RBAC:** Guest hoặc user gửi; inquiries.read/manage xử lý.
- **Given / tiền điều kiện:** Thông tin liên hệ/lý do hợp lệ.
- **When / main:** Gửi → inquiry NEW; đọc và giải quyết.
- **Alternative:** Guest không gán userId; email liên hệ khác tài khoản vẫn gán tác giả đăng nhập.
- **Exception:** Nội dung ngắn, ID/email giả không được ghép vào lịch sử người khác.
- **Then / hậu điều kiện & integrity:** Không backfill userId bằng email; ghi thay đổi status có audit.
- **State transitions:** NEW→READ→RESOLVED.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-CUSTOMER-01`, `browser:Admin consistency`.

### CUSTOMER-03 — Khóa / mở khách hàng

- **Actors & RBAC:** customers.manage.
- **Given / tiền điều kiện:** CUSTOMER; không phải chính tài khoản thao tác.
- **When / main:** Khóa→thu hồi phiên; mở cho đăng nhập mới.
- **Alternative:** Retry trạng thái cùng kết quả; lịch sử mua vẫn giữ.
- **Exception:** Khóa staff qua endpoint khách, không quyền, lỗi audit.
- **Then / hậu điều kiện & integrity:** Status/version/sessions/audit atomic; mở không hồi sinh token cũ.
- **State transitions:** Active↔Disabled.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-CUSTOMER-02`, `browser:BUYER:`.

### PROMO-01 — Thêm / sửa / vô hiệu voucher

- **Actors & RBAC:** promotions.manage.
- **Given / tiền điều kiện:** Code chuẩn hóa/duy nhất; số/range hợp lệ.
- **When / main:** Lưu rule, thời điểm bắt đầu/hết, quota, active.
- **Alternative:** FIXED/PERCENT/cap; ngày đơn chỉ áp dụng đến hết ngày VN.
- **Exception:** PERCENT>100, start>end, ngày không tồn tại, usageLimit<used.
- **Then / hậu điều kiện & integrity:** Audit atomic; không sửa snapshot đơn đã đặt.
- **State transitions:** Active↔Inactive; Scheduled→Effective→Expired.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-PROMO-01`, `business:BA-PROMO-02`, `business:BA-PROMO-04`, `browser:Business acceptance UI: scheduled`.

### PROMO-02 — Áp mã / tranh lượt

- **Actors & RBAC:** Khách checkout.
- **Given / tiền điều kiện:** Mã hoạt động trong thời gian, min đạt, used<limit.
- **When / main:** Quote kiểm rule; checkout CAS used trong cùng transaction.
- **Alternative:** Hủy toàn bộ release đúng một lượt; hủy phần giữ redemption.
- **Exception:** Mã sai/hết/chưa mở/cạn; hai khách tranh lượt cuối.
- **Then / hậu điều kiện & integrity:** Không tăng used khi order thất bại; không tăng quá quota.
- **State transitions:** used N→N+1 or rollback.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-PROMO-03`, `order:06 `, `order:07 `.

### STAFF-01 — Tạo / sửa / khóa tài khoản

- **Actors & RBAC:** staff.* / accounts.manage.
- **Given / tiền điều kiện:** Không tự nâng quyền; actor có grant phù hợp.
- **When / main:** Tạo ADMIN/SELLER/BUYER hoặc role được phép; sửa, khóa/mở.
- **Alternative:** Legacy roles giữ tương thích.
- **Exception:** Email trùng, role client không cho phép, khóa chính mình, loại SUPER_ADMIN cuối.
- **Then / hậu điều kiện & integrity:** Role/status/version/session/audit atomic; mật khẩu không log.
- **State transitions:** Active↔Disabled; Role assigned.
- **Bằng chứng kiểm thử cần đối chiếu:** `rbac:14 `, `rbac:15 `, `rbac:16 `, `rbac:17 `, `rbac:26 `, `browser:ADMIN account management`.

### STAFF-02 — RBAC / chống leo quyền

- **Actors & RBAC:** Mọi role; default deny.
- **Given / tiền điều kiện:** Phiên active/version đúng; quyền tại backend/service.
- **When / main:** Menu/form theo quyền; API/service xác minh riêng.
- **Alternative:** Vai trò chuyên biệt chỉ được nhóm việc tương ứng.
- **Exception:** Ẩn UI nhưng gọi API trực tiếp; role giả; hết phiên; sửa ID ngoài scope.
- **Then / hậu điều kiện & integrity:** Không thay dữ liệu khi denied; denial audit không chứa bí mật.
- **State transitions:** Authorized / Denied.
- **Bằng chứng kiểm thử cần đối chiếu:** `rbac:01 `, `rbac:04 `, `rbac:10 `, `rbac:11 `, `rbac:24 `, `browser:staff role`, `browser:SELLER:`.

### STAFF-03 — Nhật ký thao tác

- **Actors & RBAC:** audit.read.
- **Given / tiền điều kiện:** Nhân viên có quyền đọc nhật ký.
- **When / main:** Lọc/xem audit theo actor/resource/result.
- **Alternative:** Bản ghi cũ thiếu actor được giữ.
- **Exception:** Không có API sửa/xóa audit; token/password/PII nhạy cảm phải loại.
- **Then / hậu điều kiện & integrity:** Read only; financial ledger không bị viết lại.
- **State transitions:** Append-only.
- **Bằng chứng kiểm thử cần đối chiếu:** `rbac:20 `, `rbac:27 `, `phase5:25 `.

### ANALYTICS-01 — Doanh thu / số đơn / trạng thái

- **Actors & RBAC:** analytics.read và quyền section.
- **Given / tiền điều kiện:** Khoảng ngày VN hợp lệ; dữ liệu đơn thật local.
- **When / main:** Tổng quan → chart doanh thu và trạng thái theo ngày.
- **Alternative:** Ngày rỗng=0, daily/monthly; cửa sổ mặc định; mobile.
- **Exception:** Khoảng đảo/ngày sai/>366; section vượt quyền.
- **Then / hậu điều kiện & integrity:** VND chính xác; unpaid COD không coi đã thu; giữ layout Tổng quan đã duyệt.
- **State transitions:** Read only.
- **Bằng chứng kiểm thử cần đối chiếu:** `analytics:01 `, `analytics:02 `, `analytics:03 `, `analytics:04 `, `analytics:07 `, `analytics:08 `, `browser:Admin redesign: compact`.

### ANALYTICS-02 — Sản phẩm / khách / cohort

- **Actors & RBAC:** analytics.products.read / analytics.customers.read.
- **Given / tiền điều kiện:** Bộ lọc hợp lệ; snapshot dòng.
- **When / main:** Ranking sản phẩm/màu/size và cohort mua lần đầu/quay lại.
- **Alternative:** Partial cancellation dùng remaining units, ordered/canceled từ originalQuantity.
- **Exception:** Không giả khách hoặc dữ liệu lịch sử.
- **Then / hậu điều kiện & integrity:** Tổng hàng/giảm/refund nhất quán; tài chính khách theo quyền.
- **State transitions:** Read only.
- **Bằng chứng kiểm thử cần đối chiếu:** `analytics:09 `, `analytics:10 `, `analytics:11 `, `analytics:12 `, `analytics:25 `, `business:BA-DATA-01`.

### ANALYTICS-03 — Tồn / giá vốn / lợi nhuận

- **Actors & RBAC:** analytics.inventory.read / analytics.profit.read / analytics.costs.manage.
- **Given / tiền điều kiện:** Nguồn tồn/giá vốn xác minh; cost effective date.
- **When / main:** Xem tồn SKU; nhập giá vốn có audit; tính COGS từ snapshot.
- **Alternative:** Thiếu cost để NULL và nêu độ phủ; không hồi gán tùy tiện.
- **Exception:** Role thiếu quyền, giá vốn âm, chi phí lịch sử thiếu nguồn.
- **Then / hậu điều kiện & integrity:** Đọc report không thay tồn; không tự tạo lãi khi thiếu cost.
- **State transitions:** Known / Unknown costs.
- **Bằng chứng kiểm thử cần đối chiếu:** `analytics:20 `, `analytics:21 `, `analytics:24 `, `analytics:30 `.

### ANALYTICS-04 — Funnel / giỏ bỏ dở / attribution

- **Actors & RBAC:** analytics.funnel.read / analytics.marketing.read.
- **Given / tiền điều kiện:** First-party visitor consent/session; event type hợp lệ.
- **When / main:** Ghi attempt/success theo thực tế → cohort/order attribution.
- **Alternative:** Opt-out; phiên mới; không có lịch sử.
- **Exception:** Event key khác nội dung; campaign chứa PII; bộ lọc không hỗ trợ.
- **Then / hậu điều kiện & integrity:** Không hồi dựng giả; không lưu raw search/PII; giỏ đã mua loại bỏ.
- **State transitions:** Session→Cart→Checkout→Order.
- **Bằng chứng kiểm thử cần đối chiếu:** `analytics:13 `, `analytics:14 `, `analytics:15 `, `analytics:16 `, `analytics:17 `, `analytics:18 `, `analytics:19 `, `analytics:26 `.

### ANALYTICS-05 — COD / đối chiếu dữ liệu

- **Actors & RBAC:** analytics.finance.read.
- **Given / tiền điều kiện:** Dữ liệu payment/shipment/refund hiện có.
- **When / main:** Tách bán hàng/thực thu/chuyển về/refund; phát hiện lệch.
- **Alternative:** Chưa đối soát, pending refund, legacy thiếu nguồn.
- **Exception:** Không tự sửa ledger để report khớp.
- **Then / hậu điều kiện & integrity:** Không đếm COD remittance hai lần; refund pending chưa realized.
- **State transitions:** Read only / discrepancy flagged.
- **Bằng chứng kiểm thử cần đối chiếu:** `analytics:22 `, `analytics:23 `, `analytics:32 `.

### ANALYTICS-06 — Lọc / phân trang / xuất CSV-Excel

- **Actors & RBAC:** Quyền section + analytics.export.
- **Given / tiền điều kiện:** Bộ lọc hợp lệ; giữ scope quyền.
- **When / main:** Chọn report/time → UI/API cùng tập → stream CSV hoặc .xlsx.
- **Alternative:** Không dữ liệu; nhiều trang; Unicode/formula-like text.
- **Exception:** Format lạ, ngày sai, role không export hoặc không section.
- **Then / hậu điều kiện & integrity:** CSV injection escaped; XLSX string literal, kiểu số/ngày; private no-store; bounded pages.
- **State transitions:** Read only + export audit.
- **Bằng chứng kiểm thử cần đối chiếu:** `analytics:27 `, `analytics:28 `, `analytics:29 `, `analytics:31 `, `business:BA-REPORT-01`, `business:BA-REPORT-02`, `browser:Business acceptance UI: scheduled`.

### SETTINGS-01 — Thông tin cửa hàng / ngôn ngữ / tiền tệ

- **Actors & RBAC:** content.manage; user sở hữu preference.
- **Given / tiền điều kiện:** Giá trị form/config/rate hợp lệ.
- **When / main:** Lưu form atomic; preference SSR/cookie/DB thống nhất.
- **Alternative:** Guest→login adopt; English/Vietnamese; currency tham khảo.
- **Exception:** Email/url/phone/sizeGuide sai; role tài chính bị giới hạn.
- **Then / hậu điều kiện & integrity:** Không đổi tiền VND của checkout/ledger; validate toàn bộ trước ghi.
- **State transitions:** Existing→Updated.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-SETTINGS-01`, `business:BA-SETTINGS-02`, `browser:Localization:`.

### SETTINGS-02 — Thông tin chính sách bán / đổi trả

- **Actors & RBAC:** content.manage.
- **Given / tiền điều kiện:** Nội dung bổ sung không thay rule lỗi 72 giờ.
- **When / main:** Sửa hướng dẫn → lưu audit → trang công khai cập nhật.
- **Alternative:** Rỗng dùng nội dung nền; nhiều dòng.
- **Exception:** HTML/script chỉ là text; không dùng nội dung để đổi engine policy.
- **Then / hậu điều kiện & integrity:** Giữ phiên bản rule 72h và snapshot hồ sơ cũ; không tự sửa policy cốt lõi.
- **State transitions:** Existing instructions→Updated.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-SETTINGS-03`, `browser:Business acceptance UI: scheduled`.

### SYSTEM-01 — Lỗi / retry / recovery / backup

- **Actors & RBAC:** Người dùng đúng quyền; vận hành local.
- **Given / tiền điều kiện:** Database local có bản sao; không ghi vào main khi test.
- **When / main:** Lỗi trước commit rollback; sau commit retry receipt; backup→restore kiểm chứng.
- **Alternative:** SQLite contention retry tối đa 3; thông báo lỗi có requestId.
- **Exception:** Audit fail, duplicate request, timeout, FK/unique violation.
- **Then / hậu điều kiện & integrity:** Không tồn/tiền/ledger dở dang; main history giữ nguyên.
- **State transitions:** Failure→Rollback→Retry→Committed.
- **Bằng chứng kiểm thử cần đối chiếu:** `business:BA-CART-06`, `business:BA-PARTIAL-08`, `business:BA-SETTINGS-02`, `phase5:29 `, `browser:customer login`.

## Cách thực thi và lưu bằng chứng

- `npm test`: unit và biên tài chính/date/state/RBAC.
- `npm run test:business`: migration + fixture DB mới + build production + toàn bộ API/integration Phase 1–6 + kịch bản mới BA-* (bao gồm concurrency, fault injection, recovery).
- `npx tsx scripts/run-final-uat-browser.ts`: clone main vào DB thử riêng, thực thi mọi E2E UAT và backup/restore kiểm chứng; không reset main.
- `npm run lint` và `npx tsc --noEmit`: kiểm tra tĩnh.
- `verification/business-acceptance/`: kết quả hiện tại, ma trận status, nhật ký và ảnh; xem báo cáo kết quả để phân biệt PASS thực thi với BLOCKED ngoài phạm vi.

Dữ liệu hàng/ảnh/quyền sử dụng/tồn thật và giá vốn lịch sử cần chủ cửa hàng xác minh. Không biến dữ liệu demo hoặc ảnh tham chiếu thành bằng chứng thương mại. Kiểm thử local không chứng minh khả năng chịu tải nhiều instance/production.
