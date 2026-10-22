# Phân quyền phân tích — Phase 6

| Vai trò | Phạm vi đọc |
|---|---|
| SUPER_ADMIN | Tất cả phân tích, tài chính, cost, export |
| ADMIN | Phân tích và vận hành theo grant Phase 4; không tự cấp SUPER_ADMIN |
| STORE_MANAGER | Doanh số, sản phẩm, khách hàng tổng hợp, tồn, marketing, export; không finance/profit/cost |
| PRODUCT_STAFF | Sản phẩm và tồn |
| INVENTORY_STAFF | Tồn kho |
| ORDER_STAFF | Doanh số và sản phẩm |
| MARKETING_STAFF | Doanh số, sản phẩm, funnel/cart/attribution, export; không customer-level financial, COD, profit, cost |
| FINANCE_STAFF | Doanh số, khách/finance, tồn, profit, cost history, export |
| CUSTOMER_SUPPORT / CONTENT_STAFF / CUSTOMER | Không có quyền analytics |

UI và API kiểm quyền độc lập theo section. API analytics trả `private, no-store`; export cần thêm `analytics.export`; sửa cost yêu cầu `analytics.costs.manage` và audit. Marketing không thể gọi report customer/profit/finance hoặc cost API dù biết URL. Tổng hợp khách hàng ngoài finance không trả email/tên/số điện thoại.
