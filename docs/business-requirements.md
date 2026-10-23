# BRD — HÀ NHI FASHION

## 1. Mục đích và cách đọc

Hồ sơ phân tích nghiệp vụ cho ứng dụng thương mại điện tử **preview local** hiện hữu. Baseline này mô tả phạm vi được triển khai và điều kiện cần nghiệm thu, không phải chứng nhận production hoặc kết quả test. [Đặc tả sản phẩm](../PROJECT_SPEC.md) quyết định phạm vi; [schema](../prisma/schema.prisma), service và test trong repository là nguồn đối chiếu kỹ thuật. Không lấy số lượng sản phẩm, tài khoản hay doanh thu từ database cá nhân làm bằng chứng portfolio.

| Tài liệu | Câu hỏi trả lời |
|---|---|
| [BRD — tài liệu này](business-requirements.md) | Vì sao làm, cho ai, phạm vi và yêu cầu nào? |
| [Use cases](use-cases.md) | Ai thực hiện, điều kiện, luồng chính/phụ, kết quả? |
| [Quy trình nghiệp vụ](business-processes.md) | Các bước và quyết định liên thông thế nào? |
| [Danh mục business rules](business-rules.md) | Bất biến và chính sách áp dụng ở đâu? |
| [Mô hình dữ liệu / ERD](data-model.md) | Thực thể, quan hệ, ràng buộc và snapshot nào? |
| [Test scenarios / traceability](test-scenarios.md) | Kiểm yêu cầu/rule/use case bằng tình huống nào? |
| [31 nghiệp vụ chi tiết](business-acceptance-31.md), [tiêu chuẩn chi tiết](business-acceptance-standards.md) | Tiêu chí nghiệm thu mở rộng và mã chức năng hiện hữu |

ID `BG-*`, `FR-*`, `NFR-*`, `BR-*`, `UC01`–`UC31`, `TS-*` là định danh ổn định; không tái dùng ID đã bỏ cho ý nghĩa mới. Các ID chức năng cũ như `AUTH-01`, `STAFF-01` được giữ để đối chiếu test, **không phải tên vai trò**. Khi thay chính sách, cập nhật rule, use case, scenario và test liên quan trong cùng thay đổi.

## 2. Vấn đề kinh doanh và mục tiêu

Ứng dụng giải quyết các rủi ro điển hình của cửa hàng nhỏ: lựa chọn màu/size không nhất quán; đơn, tồn và giao nhận rời rạc; nhầm giao thành công với đã thu tiền; đổi trả thiếu mốc/chứng từ; quyền nhân viên quá rộng; báo cáo không giải thích nguồn và giá vốn. Đây là bối cảnh thiết kế, không phải khảo sát định lượng hay khẳng định tổn thất thực tế của cửa hàng.

| ID | Mục tiêu | Tiêu chí đánh giá trong local |
|---|---|---|
| BG-01 | Mua đúng biến thể, giá minh bạch | Màu/size/ảnh khớp giỏ và snapshot; server chốt VND; không oversell khi tranh đơn vị cuối |
| BG-02 | Theo dõi trọn vòng đời hàng và tiền | Đơn, kiện, thu/chuyển/đối soát COD, trả hàng và hoàn mô phỏng có trạng thái riêng, lịch sử không ghi đè |
| BG-03 | Hạn chế sai quyền và lộ dữ liệu | Ba vai trò chuẩn; kiểm server và chủ sở hữu; thay quyền thu hồi phiên; dữ liệu khách có allowlist |
| BG-04 | Quyết định dựa trên dữ liệu có giải thích | Chỉ số có công thức, phạm vi và độ phủ giá vốn; dữ liệu tổng hợp có provenance |
| BG-05 | Bàn giao có thể tái hiện an toàn | Cài trên clone bằng dữ liệu demo riêng; test cô lập; sơ đồ không cần database riêng tư; không công bố credential/backup |

## 3. Stakeholders và trách nhiệm

| Bên liên quan / actor | Nhu cầu | Quyền / trách nhiệm |
|---|---|---|
| Chủ cửa hàng / ADMIN | Kiểm soát kinh doanh và chính sách | Toàn quyền web; duyệt tài chính/đổi trả, quản lý tài khoản; xác minh hàng, ảnh, tồn và giá vốn trước bán thật |
| Nhân viên bán hàng / SELLER | Vận hành hàng và đơn | Sản phẩm/ảnh/size, kho, đơn, đóng gói, giao nhận, hỗ trợ; chỉ đọc đổi trả và báo cáo sản phẩm/tồn được cấp; không quyền tiền/tài khoản |
| Khách / CUSTOMER | Mua, theo dõi và được hỗ trợ | Chỉ hồ sơ/địa chỉ/giỏ/đơn/đánh giá/hỗ trợ/đổi trả của mình |
| Khách vãng lai | Khám phá và mua không đăng nhập theo flow được phép | Nội dung công khai/giỏ guest; capability chỉ đúng đơn guest cũ userId=null, không thay phiên cho đơn tài khoản. Mã + điện thoại chỉ tra cứu tối thiểu; không gửi đổi trả tự phục vụ |
| BA / QA / maintainer | Đặc tả truy vết và tái hiện lỗi | Duy trì hợp đồng, migration, test và tài liệu; không tự duyệt chính sách kinh doanh hoặc sửa dữ liệu để làm đẹp kết quả |
| Hãng giao hàng / ngân hàng | Chỉ là bên liên quan trong bối cảnh | **Không phải actor tích hợp** ở phiên bản local; dữ liệu giao/thu/chuyển là người vận hành nhập |

[Ma trận quyền đầy đủ](rbac-role-permission-matrix.md) và [quản lý tài khoản](account-management.md) là phần của baseline này. Quyền truy cập SQLite của chủ máy nằm ngoài RBAC web.

## 4. Phạm vi và ranh giới

**Trong phạm vi:** storefront VI/EN, danh mục/biến thể/màu/ảnh/size/phối đồ; wishlist/giỏ guest và tài khoản; checkout COD VN; voucher/phí ship; đơn/đóng gói/giao nhận thủ công; kho/kiểm kê; hỗ trợ/đánh giá; tài khoản ba vai trò; đổi trả lỗi 72 giờ, đổi cùng giá và hoàn mô phỏng; COD ledger; phân tích/export; audit và backup local.

**Ngoài phạm vi:** deploy/hosting/domain; cổng thanh toán, ngân hàng hoặc carrier thật kể cả sandbox; vận đơn hãng/tracking giả; ERP/kế toán thuế/HR/chấm công; giao quốc tế; AI tư vấn size; split shipment; dịch vụ realtime ngoài hệ thống; cam kết tải nhiều instance, WCAG đầy đủ, an toàn production hoặc quyền thương mại ảnh.

**Bị chặn bởi chính sách, không coi là tính năng đang mở:** hủy một phần đơn và đổi SKU khác giá. Fixture kiểm thử đường kỹ thuật không phải sự phê duyệt. Chưa có giá/giá vốn/tồn/ảnh xác minh thì giữ tình trạng thiếu dữ liệu, không suy đoán hoặc tự nâng READY.

## 5. Yêu cầu chức năng

Trạng thái **Local** = có đường thực thi trong ứng dụng, cần nghiệm thu lại khi đổi code; **Giới hạn** = có chức năng nhưng chỉ theo ranh giới nêu; **Chặn chính sách** = cố ý từ chối. Không trạng thái nào đồng nghĩa PASS. Cột UC liên kết [use cases](use-cases.md); đối chiếu thực thi ở [test scenarios](test-scenarios.md).

| ID | Yêu cầu / kết quả nghiệp vụ | UC | Trạng thái và nguồn |
|---|---|---|---|
| FR-001 | Đăng ký CUSTOMER, đăng nhập email/điện thoại, đăng xuất, đổi/reset mật khẩu và thu hồi phiên | 01, 02 | Local; [auth](../src/lib/auth.ts), [tài khoản](account-management.md); reset qua mail local, không dịch vụ email thật |
| FR-002 | Sửa hồ sơ và địa chỉ/default, giữ nguyên snapshot đơn | 03 | Local; [địa chỉ](../src/lib/customer-addresses.ts) |
| FR-003 | Xem/tìm/lọc/sắp xếp/phân trang sản phẩm hoạt động | 04, 05 | Local; [queries](../src/lib/queries.ts), [catalog](../src/lib/catalog.ts) |
| FR-004 | Chi tiết đúng màu/size/ảnh, phối đồ có điều kiện, wishlist và tư vấn size xác định | 06 | Giới hạn; [catalog/size](../CATALOG_AND_SIZING.md), ảnh tham khảo không chứng minh hàng thật |
| FR-005 | Giỏ đúng actor/biến thể, đổi lượng/xóa và chống lặp độc lập analytics | 07, 08 | Local; [mutation receipt](../src/lib/mutation-receipt.ts) |
| FR-006 | Checkout VN COD: server tính giá/tồn/voucher/phí, snapshot và trừ tồn atomic | 09 | Local; [quy tắc đơn](order-business-rules.md) |
| FR-007 | Tra cứu, tiếp nhận, xác nhận, phân công/ưu tiên, chuyển trạng thái và hủy toàn đơn hợp lệ; kiểm từng dòng bán được/hỏng trước hủy chuyển hoàn, chỉ hoàn tồn phần bán được | 11–14, 24 | Local; [lifecycle](../src/lib/order-lifecycle.ts); hủy một phần: Chặn chính sách |
| FR-008 | Checklist từng SKU/màu/size/lượng, packedAt/packedBy, giữ đơn khi sai trước bàn giao | 15 | Local; [operations](../src/lib/order-operations.ts) |
| FR-009 | Một hồ sơ giao nhận gốc/đơn; sự kiện thật, lý do thất bại/giao lại/chuyển hoàn | 16 | Giới hạn LOCAL_MANUAL; [shipping](../src/lib/shipping.ts); không kết nối hãng |
| FR-010 | Thu/chuyển/đối soát COD tách biệt, correction append-only, cảnh báo lệch | 10, 28 | Giới hạn mô phỏng; [COD](cod-reconciliation.md) |
| FR-011 | Nhập/xuất/điều chỉnh tồn theo SKU cùng movement, actor và lý do | 17 | Local; [inventory](../src/lib/inventory-operations.ts) |
| FR-012 | Đánh giá đã mua sau giao, phản hồi/kiểm duyệt có lý do, inquiry gắn user server | 18 | Local; [feedback](../src/lib/customer-feedback.ts), [support](../src/lib/support-chat.ts) |
| FR-013 | Quản lý CUSTOMER/SELLER/ADMIN, khóa/mở, bảo vệ ADMIN cuối và chống tự đổi/khóa | 19, 20 | Local; [managed accounts](../src/lib/managed-accounts.ts), [RBAC](../src/lib/rbac.ts) |
| FR-014 | CRUD có guard cho sản phẩm/màu/ảnh/biến thể/size, nháp/readiness và ẩn thay mất lịch sử | 21 | Local; [product management](../src/lib/product-management.ts), [ảnh](product-image-management.md) |
| FR-015 | Quản lý cây danh mục, bộ sưu tập và liên kết hàng có reference guard | 22 | Local; [catalog admin](../src/lib/catalog-admin.ts) |
| FR-016 | Voucher FIXED/PERCENT, cấu hình phí/ngưỡng, banner/nội dung theo quyền | 23 | Local; [promotions](../src/lib/promotions.ts), [settings](../src/lib/store-settings.ts) |
| FR-017 | KPI, báo cáo/filter/export cùng phạm vi và quyền; giải thích nguồn/cost coverage | 25 | Giới hạn dữ liệu first-party; [analytics](analytics-business-rules.md); không phải sổ dòng tiền |
| FR-018 | Yêu cầu lỗi trong 72 giờ, duyệt/nhận/kiểm, hoàn tồn đúng một lần, đổi cùng giá | 26 | Local; [returns](../src/lib/returns.ts); đổi khác giá: Chặn chính sách |
| FR-019 | Tính trần hoàn từ snapshot và thực thu, duyệt/thực hiện hoàn độc lập | 27 | Giới hạn SIMULATED REFUND, không chuyển tiền; [ledger](mock-refund-ledger.md) |
| FR-020 | Phiếu kiểm kê nháp/gửi/duyệt/hủy, chặn snapshot tồn cũ, cách ly hàng hỏng | 29 | Local; [stocktakes](../src/lib/stocktakes.ts) |
| FR-021 | VI/EN, vùng/tiền hiển thị tham khảo; giao dịch luôn VND và VN | 30 | Local; [localization](localization-and-currency.md) |
| FR-022 | Audit thay đổi quan trọng và export; backup/restore vào file riêng | 31 | Local; [audit](../src/lib/admin-audit.ts), [backup](local-backup-restore.md); không sửa/xóa audit qua API |

## 6. Yêu cầu phi chức năng và tiêu chí chấp nhận

| ID | Yêu cầu | Điều kiện đánh giá / giới hạn thực tế |
|---|---|---|
| NFR-001 | Phân quyền nhất quán và mặc định từ chối | Route/service kiểm actor hiện tại và giữ đúng version của phiên đã xác thực để so trong transaction sau async; CUSTOMER kiểm sở hữu; cookie đơn không thay phiên cho đơn có userId; SELLER không thấy/ghi tiền hoặc tài khoản |
| NFR-002 | Toàn vẹn và tính lặp lại an toàn | Transaction/CAS/unique giữ không âm tồn, không double movement/refund/voucher; fault audit phải rollback; cùng key khác payload bị chặn |
| NFR-003 | Tối thiểu hóa dữ liệu cá nhân | Không trả token/hash/chứng từ nội bộ; size không lưu/thu thập; test/demo không dùng DB riêng tư; log không raw PII; dữ liệu tổng hợp có provenance |
| NFR-004 | An toàn input, media và export | Origin/validation server; file kiểm nội dung/realpath/giới hạn; upload kiểm lại phiên/quyền sau multipart/decode, dọn chỉ artifact request khi ghi/audit lỗi; CSV/XLSX chống formula injection; export private/no-store và audit |
| NFR-005 | Khả dụng giao diện | Tiếng Việt đọc được, keyboard/focus, dialog/empty/error/loading, bảng/mobile không tràn tại kích thước kiểm; mục tiêu contrast AA, chưa chứng nhận WCAG đầy đủ |
| NFR-006 | Hiệu quả truy vấn và khả năng giải thích | Lọc/phân trang server, aggregate phù hợp, không dữ liệu biểu đồ bịa; đo trên dữ liệu thử; không công bố SLA hay benchmark production chưa đo |
| NFR-007 | Khả năng bảo trì, tái hiện và phục hồi | Schema/migration được version; test DB cô lập; ERD tái tạo không DB riêng; backup online và kiểm integrity/FK/nội dung ở file restore riêng |

## 7. Giả định, phụ thuộc và quyết định

- SQLite và filesystem local thuộc máy người vận hành; không coi là hạ tầng đa tenant/đa instance. Rate limit bộ nhớ và CSP dev có giới hạn, không thay hardening production.
- Mốc giao hàng đầu tiên, giá snapshot và chứng từ thủ công phải có thật trong hồ sơ. Thiếu mốc không tự suy ra từ updatedAt; thiếu cost không đặt bằng 0.
- ADMIN chịu trách nhiệm xác minh lỗi hàng và chứng từ. Hai quyền duyệt/thực hiện hoàn tách biệt về thao tác; không khẳng định yêu cầu hai người khác nhau khi engine không bắt buộc.
- Tài khoản/credential hiện hữu không được reset để demo. Bàn giao public dùng dữ liệu tổng hợp và tài khoản tự tạo trên database riêng; không ghi email/điện thoại/mật khẩu riêng vào tài liệu.
- Thay điều kiện 72 giờ, hủy một phần, chênh giá, phương thức tiền hoặc carrier cần quyết định nghiệp vụ rõ ràng và migration/test tương ứng; không tự mở trong tài liệu.

## 8. Cách xác định hoàn thành

Mỗi yêu cầu cần đối chiếu UC, BR và TS; kiểm UI/API/DB trên dữ liệu cô lập, gồm nhánh hợp lệ, từ chối, sai quyền và rollback. [Tiêu chuẩn nghiệm thu](business-acceptance-standards.md) định nghĩa cách ghi kết quả. Các tài liệu có tên “report” hiện hữu là bằng chứng của lần chạy lịch sử, **không chứng minh trạng thái commit mới**. Baseline này không tạo kết quả PASS mới và không trỏ vào tệp verification bị ignore làm bằng chứng ổn định.
