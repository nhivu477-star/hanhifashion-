# Ma trận vai trò và quyền — Phase 4

19/10/2026. Nguồn thực thi: src/lib/rbac.ts. Static RBAC, default deny; không có quyền kế thừa ngầm hoặc override từ client. STAFF/role không biết bị từ chối. CUSTOMER chỉ có quyền sở hữu qua module khách, không có quyền admin trong ma trận này.

| Quyền |SUPER_ADMIN|STORE_MANAGER|PRODUCT_STAFF|INVENTORY_STAFF|ORDER_STAFF|CUSTOMER_SUPPORT|CONTENT_STAFF|MARKETING_STAFF|FINANCE_STAFF|ADMIN|CUSTOMER|
|---|---|---|---|---|---|---|---|---|---|---|---|
|staff.read|✓|✓|—|—|—|—|—|—|—|—|—|
|staff.create|✓|—|—|—|—|—|—|—|—|—|—|
|staff.update|✓|—|—|—|—|—|—|—|—|—|—|
|staff.disable|✓|—|—|—|—|—|—|—|—|—|—|
|roles.assign|✓|—|—|—|—|—|—|—|—|—|—|
|audit.read|✓|—|—|—|—|—|—|—|—|—|—|
|products.read|✓|✓|✓|—|—|—|—|—|—|✓|—|
|products.create|✓|✓|✓|—|—|—|—|—|—|✓|—|
|products.update|✓|✓|✓|—|—|—|—|—|—|✓|—|
|products.publish|✓|✓|✓|—|—|—|—|—|—|✓|—|
|products.archive|✓|✓|✓|—|—|—|—|—|—|✓|—|
|inventory.read|✓|✓|✓|✓|✓|—|—|—|—|✓|—|
|inventory.adjust|✓|✓|—|✓|—|—|—|—|—|✓|—|
|inventory.movements.read|✓|✓|✓|✓|—|—|—|—|—|✓|—|
|orders.read|✓|✓|—|—|✓|✓|—|—|✓|✓|—|
|orders.manage|✓|✓|—|—|✓|—|—|—|—|✓|—|
|orders.cancel|✓|✓|—|—|✓|—|—|—|—|✓|—|
|shipping.read|✓|✓|—|—|✓|✓|—|—|✓|✓|—|
|shipping.create|✓|✓|—|—|✓|—|—|—|—|✓|—|
|shipping.update|✓|✓|—|—|✓|—|—|—|—|✓|—|
|shipping.failures.manage|✓|✓|—|—|✓|—|—|—|—|✓|—|
|cod.read|✓|—|—|—|—|—|—|—|✓|✓|—|
|cod.collection.confirm|✓|—|—|—|—|—|—|—|✓|✓|—|
|cod.remittance.record|✓|—|—|—|—|—|—|—|✓|✓|—|
|cod.reconcile|✓|—|—|—|—|—|—|—|✓|✓|—|
|refunds.read|✓|—|—|—|—|—|—|—|✓|✓|—|
|refunds.approve|✓|—|—|—|—|—|—|—|✓|✓|—|
|refunds.execute|✓|—|—|—|—|—|—|—|✓|✓|—|
|returns.read|✓|✓|—|✓|✓|✓|—|—|✓|✓|—|
|returns.review|✓|✓|—|—|—|✓|—|—|—|✓|—|
|returns.inspect|✓|✓|—|✓|—|—|—|—|—|✓|—|
|returns.exchange|✓|✓|—|—|✓|—|—|—|—|✓|—|
|promotions.read|✓|✓|—|—|—|—|—|✓|—|✓|—|
|promotions.manage|✓|✓|—|—|—|—|—|✓|—|✓|—|
|content.read|✓|✓|—|—|—|—|✓|✓|—|✓|—|
|content.manage|✓|✓|—|—|—|—|✓|✓|—|✓|—|
|analytics.read|✓|✓|—|—|—|—|—|✓|—|✓|—|
|customers.read|✓|✓|—|—|—|✓|—|—|—|✓|—|
|customers.manage|✓|—|—|—|—|—|—|—|—|✓|—|
|inquiries.read|✓|✓|—|—|—|✓|—|—|—|✓|—|
|inquiries.manage|✓|✓|—|—|—|✓|—|—|—|✓|—|

ADMIN là tương thích nghiệp vụ cũ, không có staff.create/roles.assign. Chỉ chủ dự án duyệt nâng tài khoản ADMIN hiện tại lên SUPER_ADMIN bằng bootstrap local riêng; migration không tự chuyển role.
