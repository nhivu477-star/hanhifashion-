# Phase 5 — bàn giao và QA

**COMPLETED — phạm vi kỹ thuật LOCAL E-COMMERCE DEMO, 19/10/2026.** Hàng hóa/ảnh/tồn thực tế **PARTIALLY COMPLETED — NEEDS REVIEW**, không được hiểu là đủ điều kiện bán thật. Phase6 **NOT STARTED**. Không push/sync/deploy/publish, carrier/payment thật hoặc cloud upload.

## 1. Audit hệ thống hiện hữu — COMPLETED

Đọc đặc tả và audit/QA Phase1–4; kiểm code/schema/migrations/test/auth/admin/media. Tái sử dụng Next15/React19/Prisma6/SQLite46 bảng, 11 migration, Phase1 order/CAS, Phase2A manual shipping/COD, Phase3 defect72h/exchange/mock refund, Phase4 RBAC/session/audit. Chi tiết phase-5-audit.md. Không xây lại các module.

## 2. Chức năng cải thiện — COMPLETED

Validator/report readiness, admin indicator + lý do; file/URL/bytes/path validation; deletion metadata có reference guard; size giày trong editor/API; phân trang admin products/orders/customer orders; catalog select trường cần; login/register giữ context; checkout link đúng returnTo; parser error an toàn, requestId/log allowlist/no-store; online backup + isolated restore và hướng dẫn local.

## 3. Vấn đề dữ liệu được xử lý — COMPLETED về phát hiện và ngăn dữ liệu sai mới

Giá/SKU trùng/configurations được kiểm bởi validator/API/SQLite unique. Gallery/màu không lấy setting override tùy ý, thiếu ảnh dùng fallback; URLs nested sửa được. Không tự đặt lại giá/hàng/copy/tồn lịch sử. Không thay OrderItem.unitPrice. Audit không ghi DB.

## 4. Sản phẩm còn cần rà soát — PARTIALLY COMPLETED

555 bản ghi: READY 0, NEEDS REVIEW 554, INCOMPLETE 0, INVALID 1. Main234 hoạt động / 321 lưu trữ, 16.252 biến thể. Bộ Buzz SKU HN-LS-BO-TRANG-PHUC-BUZZ-SET giá 0, không tồn bán, cần chủ shop xác nhận giá; giữ nguyên bản ghi. Ảnh, thông tin copy và tồn chưa xác minh không được nâng READY thương mại. Không bịa successful merchandise verification. Chi tiết JSON product-quality và docs/product-data-quality.md.

## 5. Quản lý ảnh — COMPLETED kỹ thuật, NEEDS REVIEW về hàng thật

1.423 URL độc nhất kiểm bytes/file/path;0 unavailable/invalid. Main/gallery ordering, previews, per-color, SafeImage/Next Image đã có và tái sử dụng. Validator nested path/realpath/symlink, bytes/formats/size/pixels; upload decode→resize→WebP exclusive0600. Upload có quyền trước đọc file. Asset metadata chỉ xóa khi không tham chiếu bởi gallery/color/order/banner/category/collection/settings; giữ file gốc để không phá snapshot. Test cả valid upload, giả MIME, không quyền và traversal. Không thêm merchandise photography mới. product-image-management.md.

## 6. UI/UX — COMPLETED trong phạm vi representative

CUA35 phép đo ở5 viewport (360/390/768/1024/1440), không document overflow.25 ảnh full-page đúng chiều rộng + fold crops để đọc. Price rows listing thẳng; table mobile scroll riêng. Menu/Escape/search/filter, size/cart/checkout/COD/cancel, color mapping/fallback, login context admin/customer và gửi return trong72h đã thao tác.26 route smoke PASS. Chỉnh có mục tiêu, không redesign. Chi tiết storefront-ux-qa.md; không nói mọi tổ hợp/nút hoặc screen reader đều đã test.

## 7. Bảo mật — COMPLETED trong phạm vi local

Giữ ownership/default-deny RBAC/session expiry/version/disabled rejection. Origin/validator cũ tiếp tục hoạt động. Thêm chặn external returnTo, giới hạn decode, kiểm path/file, no-store APIs, che JSON parser/Prisma lỗi, correlation ID và structured log không raw body/error message/password/token/PII. Mật khẩu owner cũ không tự đổi; rủi ro và thủ tục rotation được ghi trong security-hardening-report.md. Không chứng nhận production security hoặc load multi-instance.

## 8. Database — COMPLETED

Không migration/schema change Phase5, vẫn46 bảng và SQLite. Bản sao trước sửa có integrity ok/FK0; đối chiếu SHA256 toàn nội dung46 bảng main sau sửa **đều không đổi**, gồm user/hash/role/session/catalog/order/inventory/COD/returns/audit. verification/phase5-data-preservation.json. Toàn bộ QA mutations nằm DB timestamp riêng. Không reset/seed main.

## 9. Backup/restore — COMPLETED

Online SQLite backup, xử lý WAL qua backup API, file UTC timestamp exclusive0600 không overwrite. Backup integrity/FK; restore sang file độc lập, đối chiếu count+content hash tất cả bảng, kể cả order/inventory/COD. Thực thi trên main và DB test có ledger thật trong local: phase5-backup-restore.json và phase5-test-backup.json. Không restore đè active DB, không auto-delete retention. local-backup-restore.md.

## 10. Hiệu năng — COMPLETED về đo/tối ưu; giới hạn phép đo công khai

Baseline trước sửa và after cùng main local. Catalog default JSON114.496→95.667bytes (−16,4%); sort giá78.918→59.939bytes (−24,0%). HTTP category HTML275.824→254.326bytes; median132→120ms trong3 mẫu dev, không coi là chứng nhận speedup. Query default median4,02→3,54ms, một số query không nhanh hơn; đầy đủ performance-report.md. Không bịa Web Vitals/production metrics. Private baseline ban đầu là anonymous redirect, nên authenticated after chỉ báo số đo riêng, **không kết luận private speedup**. Cart/checkout baseline empty, browser populated dùng kiểm chức năng. Pagination hạn chế payload không đổi transaction.

## 11. Unit/integration/types/lint/build — COMPLETED

| Kiểm tra cuối | Kết quả thực thi |
|---|---|
| npm test |65/65 PASS, 9 file (52 cũ + 13 Phase 5) |
| npx tsc --noEmit |PASS |
| npm run lint |PASS,zero warnings |
| npm run test:phase5 |108/108 HTTP integration trên cùng DB riêng |
| Local production build trong runner |PASS compile/type/static generation; không deploy |
| Route smoke |26/26 PASS |
| Main data/FK preservation |46/46 unchanged; integrity ok/FK0 |

DB hồi quy cuối: xem database trong verification/phase5-results.json (cùng DB với4báo cáo regression khác). Build/log tại verification/phase5-regression.log; unit/type/lint logs cùng prefix. Runner dừng3101 sau hoàn tất; app chính giữ3000.

### Ma trận28 nhóm yêu cầu

| Test | Nhóm | Bằng chứng / kết quả |
|---|---|---|
|01|Completeness|unit+Phase5 HTTP01+catalog report PASS|
|02|Duplicate SKU|unit+HTTP02, transaction rollback PASS|
|03|Price|unit+HTTP03 và historical snapshot PASS|
|04|Color image|unit mismatched mapping, HTTP04, CUA Lotis đổi URL/alt PASS về quan hệ dữ liệu|
|05|Fallback|unit/HTTP05, CUA ảnh intentionally missing→awaiting-photo PASS|
|06|Unauthorized upload|HTTP06 PASS|
|07|Invalid bytes/type|HTTP07 +valid raster upload PASS|
|08|Reference integrity|HTTP08 referenced denied, unreferenced metadata deletion, traversal PASS|
|09|Responsive listing|CUA5width+price rows+24cards PASS|
|10|Responsive detail|CUA5width, gallery/size/color PASS|
|11|Cart/checkout|CUA5width, guest COD/cancel+DB stock/price PASS|
|12|Login redirect|HTTP12, external returnTo denied, CUA admin/customer exact context PASS|
|13|Price consistency|HTTP13 snapshot, Phase1 price/coupon, CUA540k+30k=570k PASS|
|14|Customer isolation|Phase1/3/4 HTTP mới chạy lại PASS|
|15|Staff permission|Phase4 28cases mới chạy lại PASS|
|16|Disabled session|Phase4 disabled/reactivation/version/expiry PASS|
|17|Backup creation|HTTP backup group+main script PASS|
|18|Integrity|same group integrity ok PASS|
|19|Isolated restore|same group different file/hash PASS|
|20|FK restore|same group foreign_key_check0 PASS|
|21|Order lifecycle|Phase1 17/17 PASS|
|22|Inventory integrity|Phase1 races/cancel +Phase3 restock/exchange PASS|
|23|Manual shipping|Phase2A18/18+Phase4 shipping PASS|
|24|COD|Phase2A ledger/reconcile/correction +Phase3 refund guard PASS|
|25|Returns/refunds|Phase3 28/28+Phase4 finance PASS, CUA request/tracking PASS|
|26|Catalog performance|HTTP26 bounded24 +direct query/HTTPbefore-after measured PASS; no private baseline claim|
|27|Safe logs|unit allowlist+HTTP27 correlation/no payload reflected PASS|
|28|Admin|HTTP28 pagination/indicator+Phase4+CUA representative PASS|

17 Phase5 HTTP scenarios gộp một số nhóm; không gọi đó là28 test tự động độc lập. Responsive/E2E dùng CUA. Không chạy toàn bộ legacy Playwright suite vì giả định catalog/menu cũ; **NOT RUN**, không tính PASS.

## 12. Browser E2E — COMPLETED

phase5-browser-results.json ghi rõ hai DB browser và đối chiếu: guestorder CANCELLED/UNPAID570k, inventory -1/+1 net0; customerreturn REQUESTED và deadline-delivery72h. Bản build cuối kiểm login context/admin quality, missing fallback, selected-color, populated cart/checkout. Viewport reset. Ảnh admin-quality.jpg, customer-return.jpg, fallback.jpg,25full-page và JSONresponsive. Không dùng ảnh Phase1–4 làm bằng chứng CUA mới.

## 13. Hồi quy cũ — COMPLETED

Phase1 **17/17**, Phase2A **18/18**, Phase3 **28/28**, Phase4 **28/28**, tổng91. Phase 5 **17/17**, tổng108. Cùng runner, cùng DB riêng, Next production build/start thật và DB assertions, không mock service để né transaction. Giữ policy72h; carrier bị retired, không phát sinh real transfers.

## 14. File thay đổi

Mới: lib/product-quality.ts, local-images.ts, safe-redirect.ts, observability.ts; components/admin-pagination.tsx; scripts/audit-phase5.ts, measure-phase5.ts, local-backup.py, test-phase5.ts, smoke-phase5.ts; tests/phase5.unit.test.ts;9docsPhase5.

Sửa: lib/media.ts,catalog-admin.ts,queries.ts,admin-authorization.ts,admin-audit.ts; components/admin.tsx,media-library.tsx,store.tsx,cart.tsx,catalog.tsx; app/api/[...action]/route.ts, app/[[...path]]/page.tsx; scripts/run-order-phase1.ts, package.json, PROJECT_SPEC.md, README.md. Backup directory đã ignore từ trước; không đổi schema hoặc dependencies. Evidence trong verification/phase5-*.

## 15. Giới hạn và diễn biến lỗi

- 554 NEEDS REVIEW +1 INVALID giá cần người có thông tin hàng thật quyết định; không làm giả xác minh để đóng việc.
- Ảnh URL/alt đúng mapping không chứng minh màu/thiết kế ngoài đời. Không ảnh mới, không gỡ watermark hay hợp thức quyền dùng ảnh tham khảo.
- Xóa metadata có guard; dọn file orphan vật lý chưa làm tự động (có chủ đích để giữ lịch sử). Bảng admin khác có limits/filter hiện hữu, chưa thay mọi list bằng cùng một pagination component.
- Không full WCAG/screenreader audit, exhaustive browser/device matrix, stress/Lighthouse hoặc private before baseline. Dashboard aggregate vẫn có thể tăng tải khi nhiều đơn. Local memory rate-limit/CSPdev/weak existing credential được ghi rõ.
- Taste lint thẩm mỹ24FAIL/8WARN còn giữ theo nhận diện đã duyệt; không đánh tráo thành ESLint fail, không tuyên bố taste inspector PASS.
- Lượt đầu Phase5 scenario28 đếm cả chuỗi serialized RSC nên báo48thay24. Kiểm DOM xác nhận24; sửa assertion chỉ đếm summary HTML, chạy lại toàn bộ đạt. Route smoke đầu dùng sai đường dẫn điều khoản, sửa theo footer rồi26/26; không tính lượt sai là PASS.
- Bộ fixture cũ có biến thể không colorId và dữ liệu cố ý sai phục vụ regression, nên admin QA có INVALID; không áp phân loại này cho catalog main. Các trường hợp ảnh thiếu có chủ đích chỉ ở DBtest và được ghi trong browser fixture.

## 16. Trạng thái và điểm dừng

**COMPLETED: triển khai và kiểm chứng kỹ thuật Phase5 local.**
**PARTIALLY COMPLETED: readiness hàng hóa thực tế**, cần xử lý giá Bộ Buzz và xác minh merchandise/media/inventory/copy bằng nguồn đáng tin; không thuộc dữ liệu được phép tự bịa.
**NOT STARTED: Phase6, mở bán production, external carriers/payments/deploy/push.**
Không có blocker kỹ thuật ngăn demo local trong phạm vi đã kiểm. Giữ app localhost3000, dừng server QA và dừng phát triển sau Phase5. Báo cáo này không phê duyệt mở bán thật.


## Dọn tệp sau bàn giao theo yêu cầu chủ dự án

Ảnh chụp QA cũ và các báo cáo phase lịch sử đã chuyển vào Thùng rác có manifest `verification/cleanup-result.json`. Giữ ba ảnh minh chứng hiện tại (admin-quality, customer-return, fallback), các JSON kết quả và backup. Các phép kiểm thử mô tả phía trên đã thực thi trước khi dọn; bộ ảnh full/fold không còn nằm trong dự án, có thể khôi phục từ vị trí ghi trong manifest. Không xóa dữ liệu database hoặc ảnh còn tham chiếu. Sau dọn: audit 1.423 URL ảnh không có tệp lỗi/thiếu, 65/65 unit PASS, trang chủ và sản phẩm HTTP200; 46 bảng dữ liệu chính không đổi.
