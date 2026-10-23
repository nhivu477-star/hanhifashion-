# Danh mục business rules

Đọc cùng [BRD](business-requirements.md), [use cases](use-cases.md) và [test scenarios](test-scenarios.md). Đây là chỉ mục bất biến/chính sách hiện hành; tài liệu chuyên đề và source ở cột cuối cung cấp chi tiết. ID `BR-*` không thay các mã chức năng hoặc assertion đã có. Rule không phải kết quả kiểm thử.

## Quyền, tài khoản và dữ liệu

| ID | Quy tắc | Yêu cầu | Nguồn chi tiết |
|---|---|---|---|
| BR-001 | Chỉ CUSTOMER, SELLER, ADMIN. Role lạ không có quyền; public registration luôn CUSTOMER; không lấy role/actor từ client làm thẩm quyền | FR-001, FR-013; NFR-001 | [RBAC](rbac-role-permission-matrix.md), [service guards](../src/lib/authorization.ts) |
| BR-002 | Phiên phải khớp hash/hạn dùng/user active/permissionVersion; tạo phiên CAS theo hash/version đã kiểm mật khẩu. Actor mutation giữ version đã xác thực và so lại trong transaction sau async, không lấy version mới để hợp thức hóa phiên cũ. Đổi/reset mật khẩu thu hồi phiên và mọi recovery token; đổi quyền/khóa thu hồi phiên. Chặn tự đổi role/tự khóa và mất ADMIN cuối | FR-001, FR-013 | [tài khoản](account-management.md), [staff](staff-management-business-rules.md) |
| BR-003 | Đơn gắn tài khoản cần phiên chủ sở hữu hoặc staff đúng quyền; hn_order/accessToken không thay phiên dù cookie còn. Capability chỉ cho đúng đơn guest cũ userId=null, không quyền đổi trả. Tra cứu mã + điện thoại chỉ trả tối thiểu theo allowlist | FR-002, FR-007, FR-018; NFR-003 | [đơn](order-business-rules.md), [returns](returns-business-rules.md) |
| BR-004 | SELLER không quản trị tài khoản/nhân viên/quyền, tài chính/COD/refund, giá vốn/lợi nhuận; đổi trả chỉ đọc. ADMIN thực hiện quyết định/kiểm hàng/đổi và tài chính | FR-010, FR-013, FR-018, FR-019 | [ma trận quyền](rbac-role-permission-matrix.md), [analytics RBAC](analytics-rbac-matrix.md) |
| BR-005 | Sửa hồ sơ/địa chỉ hoặc catalog không sửa snapshot tên, địa chỉ, SKU/màu/size/ảnh/giá của đơn cũ. Form hồ sơ khách không đổi email đăng nhập | FR-002, FR-006, FR-014 | [spec](../PROJECT_SPEC.md), [schema](../prisma/schema.prisma) |
| BR-006 | Audit thay đổi quan trọng cùng transaction; không có API sửa/xóa audit. Log kỹ thuật dùng allowlist, không body/password/token/PII/SQL thô; actorId lịch sử có thể là snapshot string, không suy diễn FK | FR-022; NFR-002, NFR-003 | [kiểm soát vận hành](admin-operational-controls.md), [audit](../src/lib/admin-audit.ts) |

## Catalog và mua hàng

| ID | Quy tắc | Yêu cầu | Nguồn chi tiết |
|---|---|---|---|
| BR-007 | SKU/slug duy nhất, biến thể theo product/size/color; mã mới theo `HN-{TP\|G\|T\|PK}-0001…9999`, đúng nhóm danh mục; các danh mục trang phục hiện có như sơ mi, blazer, quần tây và áo khoác/len cùng thuộc TP. Sửa thông tin/giá giữ nguyên SKU và danh mục chính hiện có, không tự đánh lại mã lịch sử; tạo hoặc đổi SKU/danh mục chính phải kiểm định dạng mới. Nháp/readiness tách active. Không tự nâng READY, giả giá/stock/cost hoặc hard-delete hồ sơ đã có reference | FR-003, FR-014, FR-015 | [data quality](product-data-quality.md), [publication](../src/lib/publication.ts), [SKU](../src/lib/product-sku.ts) |
| BR-008 | Ảnh đúng màu, không mượn màu khác khi thiếu. Phối đồ chỉ liên kết sản phẩm/danh mục/màu hoạt động, có ảnh và còn hàng; món phụ bán riêng | FR-004, FR-014 | [catalog/size](../CATALOG_AND_SIZING.md), [ảnh](product-image-management.md) |
| BR-009 | Size theo bảng/ma trận xác định, không AI/BMI hoặc ngoại suy thiếu căn cứ; size hết hàng không tự thay. Số đo chỉ state trình duyệt và xóa khi đóng, không lưu/analytics | FR-004; NFR-003 | [sizing](../src/lib/sizing.ts), [catalog/size](../CATALOG_AND_SIZING.md) |
| BR-010 | Upload kiểm quyền trước đọc và kiểm lại phiên/quyền sau multipart/decode trước ghi; xác minh format/bytes/pixel/kích thước/realpath, không tin tên/MIME hoặc chấp nhận traversal/symlink. Ghi file/audit lỗi phải dọn chỉ artifact do request tạo, không xóa ảnh có sẵn. Ảnh lỗi return riêng tư, không bắt buộc | FR-014, FR-018; NFR-004 | [ảnh](product-image-management.md), [returns](returns-business-rules.md) |
| BR-011 | VND nguyên, server tính giá. Checkout chỉ VN/COD; total = subtotal − discount + shipping. Tỷ giá/ngôn ngữ chỉ đổi cách hiển thị, không đổi ledger | FR-006, FR-021 | [đơn](order-business-rules.md), [localization](localization-and-currency.md) |
| BR-012 | Một voucher FIXED hoặc PERCENT/đơn; kiểm active, minimum, start/end giờ VN (gồm đúng mốc cuối), limit bằng thao tác atomic; chuẩn ship 30.000 VND và ngưỡng miễn theo cấu hình | FR-006, FR-016 | [promotions](../src/lib/promotions.ts), [tiêu chuẩn](business-acceptance-standards.md) |
| BR-013 | Checkout trừ tồn ngay, không reservation timeout. Stock ≥ quantity được kiểm khi ghi; order/items/payment/redemption/movement/history/audit và xóa giỏ cùng transaction; xác nhận không trừ lại | FR-005, FR-006, FR-007; NFR-002 | [quy tắc đơn](order-business-rules.md) |
| BR-014 | Retry cùng actor/key/payload chuẩn hóa chỉ một hiệu ứng; khác payload bị chặn. Checkout key gắn cart và dữ liệu commit; mutation receipt độc lập analytics consent | FR-005, FR-006; NFR-002 | [receipt](../src/lib/mutation-receipt.ts), [tiêu chuẩn](business-acceptance-standards.md) |

## Đơn, giao nhận và COD

| ID | Quy tắc | Yêu cầu | Nguồn chi tiết |
|---|---|---|---|
| BR-015 | Chỉ chuyển trạng thái theo máy trạng thái. Khách hủy PENDING/CONFIRMED khi UNPAID và có reason; vận hành được thêm PROCESSING/RETURNED theo guard. Không hủy PAID; hủy lặp không hoàn tồn/voucher lần hai | FR-007 | [order states](order-state-machine.md), [lifecycle](../src/lib/order-lifecycle.ts) |
| BR-016 | Hủy một phần bị khóa khi chưa duyệt chính sách; không đổi nghĩa từ fixture kỹ thuật. Hàng đang giao/chưa quay về không được hoàn tồn bằng hủy | FR-007 | [order states](order-state-machine.md), [partial cancellation](../src/lib/partial-cancellation.ts) |
| BR-017 | Trước tạo shipment/bàn giao phải có checklist SKU/màu/size/lượng và packedAt/packedBy, không packing hold; vẫn giữ trạng thái PROCESSING, không thêm PACKED giả | FR-008, FR-009 | [operations](../src/lib/order-operations.ts), [order states](order-state-machine.md) |
| BR-018 | Shipment gốc duy nhất theo orderId/paymentId, provider local; HN-SHIP-* là mã hồ sơ không phải vận đơn hãng. Kiện và đơn đồng bộ atomic; có Shipment thì không lách endpoint đơn cũ | FR-009 | [shipping rules](shipping-business-rules.md), [shipping states](shipping-state-machine.md) |
| BR-019 | Giao thất bại/giao lại/chuyển hoàn có sự kiện/lý do thật; RETURNED không tự hoàn tồn. Trước hủy UNPAID phải kiểm đủ mọi dòng một lần qua returnedItems: lượng bán được/hỏng nguyên không âm, tổng bằng quantity dòng. Chỉ lượng bán được hoàn tồn một lần; hàng hỏng không vào tồn bán; phân loại giữ trong audit/history vận hành, không phải ReturnInspection hậu mãi | FR-007, FR-009, FR-011 | [shipping states](shipping-state-machine.md), [order rules](order-business-rules.md) |
| BR-020 | DELIVERED/COMPLETED không tự PAID. expectedCOD từ Payment.amount/order.total; collection là thu khách, remittance là chuyển về, reconciliation là kết luận riêng | FR-010 | [COD](cod-reconciliation.md) |
| BR-021 | outstanding = max(collected − remitted, 0); thu lệch kỳ vọng/chuyển vượt thu giữ DISPUTED. Chỉ RECONCILED khi DELIVERED và expected = collected = remitted; không tự khấu trừ phí | FR-010 | [COD](cod-reconciliation.md) |
| BR-022 | Ledger tiền append-only; eventKey/reference chống trùng, correction có dấu liên kết gốc/cùng kiện và bằng chứng; tổng không âm. Sau RECONCILED phải mở dispute trước ghi tiếp | FR-010; NFR-002 | [COD](cod-reconciliation.md), [shipping](../src/lib/shipping.ts) |

## Hậu mãi và kho

| ID | Quy tắc | Yêu cầu | Nguồn chi tiết |
|---|---|---|---|
| BR-023 | Chỉ lỗi được xác minh, trong đủ 72 giờ từ mốc DELIVERED đầu tiên kiện gốc (fallback history cho đơn cũ), gồm đúng deadline. Snapshot mốc/policy; thiếu mốc hoặc quá hạn tự phục vụ bị chặn | FR-018 | [return rules](returns-business-rules.md), [returns rules engine](../src/lib/returns-rules.ts) |
| BR-024 | CUSTOMER đúng chủ đơn, lượng nguyên dương không quá lượng chưa claim, dòng không lặp, lý do lỗi hợp lệ; không đổi do sở thích. Reject trước nhận giải phóng lượng, đã nhận không claim lại | FR-018 | [return rules](returns-business-rules.md) |
| BR-025 | RECEIVED không cộng tồn. Inspection REVIEW chờ thêm; SELLABLE hoàn đúng lượng một lần; DAMAGED cách ly; REJECTED không tự đổi/hoàn. Kết luận cuối không ghi đè | FR-011, FR-018 | [returns states](returns-state-machine.md), [returns](../src/lib/returns.ts) |
| BR-026 | Đổi chỉ bằng đơn giá lịch sử; khác giá bị chặn. Kiểm/trừ tồn SKU thay thế atomic, giữ đơn/kiện gốc và theo dõi ExchangeItem riêng; hoàn tất khi mọi hàng thay thế giao xong | FR-018 | [workflow](returns-exchange-workflow.md), [returns states](returns-state-machine.md) |
| BR-027 | Refund chỉ mô phỏng, server phân bổ snapshot sau giảm giá, không vượt tiền đã thu còn được hoàn/số lượng hợp lệ. Tách duyệt/thực hiện; hoàn không sửa/xóa COD ledger hoặc hủy đơn PAID | FR-019 | [mock refund ledger](mock-refund-ledger.md), [returns](../src/lib/returns.ts) |
| BR-028 | Nhập/xuất theo SKU, delta/lý do/ngày/nhà cung cấp phù hợp; stock, movement và audit atomic; không xuất vượt tồn hoặc retry tạo movement hai lần | FR-011 | [inventory operations](../src/lib/inventory-operations.ts) |
| BR-029 | Stocktake DRAFT→SUBMITTED→APPROVED/CANCELLED; countedStock chỉ hàng bán được, damagedStock tách riêng. Tồn sổ thay đổi sau snapshot thì từ chối duyệt, cần kiểm đếm lại | FR-020 | [stocktakes](../src/lib/stocktakes.ts) |
| BR-030 | Đánh giá xác minh sau giao; phản hồi/ẩn/hiện có lý do/lịch sử. Inquiry gắn userId server, không nhận sở hữu từ email nhập | FR-012 | [feedback](../src/lib/customer-feedback.ts), [support](../src/lib/support-chat.ts) |

## Báo cáo và vận hành

| ID | Quy tắc | Yêu cầu | Nguồn chi tiết |
|---|---|---|---|
| BR-031 | Báo cáo theo ngày tạo đơn giờ VN và trạng thái hiện tại, không phải dòng tiền ngày thu. Tồn là số dư hiện tại; funnel chỉ event first-party đã ghi, không bịa lịch sử | FR-017 | [metric definitions](analytics-metric-definitions.md), [analytics rules](analytics-business-rules.md) |
| BR-032 | Giá vốn thiếu giữ NULL/độ phủ; không giả lợi nhuận. Doanh số, hàng ròng sau hoàn, đã thu và đối soát COD là các khái niệm khác; dùng công thức của từng báo cáo | FR-017 | [profit rules](profit-calculation-rules.md), [metrics](analytics-metric-definitions.md) |
| BR-033 | CSV/XLSX cùng scope/filter/quyền; XLSX thật, text không thực thi formula; export có audit, private/no-store; SELLER không lộ metric tài chính/giá vốn | FR-017; NFR-004 | [analytics RBAC](analytics-rbac-matrix.md), [analytics rules](analytics-business-rules.md) |
| BR-034 | Không reset/seed DB chính, không công bố credential/backup/PII. SyntheticRecord giữ nguồn gốc; ảnh tham khảo giữ attribution và không chứng minh hàng/giấy phép thương mại | FR-014, FR-022; NFR-003 | [product quality](product-data-quality.md), [attribution](../THIRD_PARTY_IMAGES.md) |
| BR-035 | Backup online, restore vào file riêng; integrity/FK/count/hash toàn bảng trước dùng. Không ghi đè DB đang chạy; kết quả test cũ không chứng minh commit mới | FR-022; NFR-007 | [backup](local-backup-restore.md), [acceptance standards](business-acceptance-standards.md) |

## Thứ tự giải quyết mâu thuẫn

Phạm vi hiện hành ở [PROJECT_SPEC](../PROJECT_SPEC.md) và chính sách cửa hàng được nêu rõ phải khớp [ma trận ba vai trò](rbac-role-permission-matrix.md), rule chuyên đề, code và test. Mâu thuẫn là lỗi cần sửa, không chọn nguồn có quyền rộng hơn để hợp thức hóa. Tài liệu/report cũ, tên cột provider tương lai hoặc test fixture không mở rộng phạm vi. Mọi kết quả thực thi mới phải có bằng chứng riêng; chỉ mục này không tự chứng minh bất biến đã được kiểm.
