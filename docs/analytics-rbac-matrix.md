# Phân quyền phân tích

| Vai trò | Phạm vi |
|---|---|
| ADMIN | Toàn bộ phân tích, tài chính, COD, giá vốn, lợi nhuận và xuất dữ liệu |
| SELLER | Phân tích sản phẩm/tồn và báo cáo vận hành được cấp; không tài chính, giá vốn hoặc lợi nhuận |
| CUSTOMER | Không có quyền báo cáo quản trị |

UI và API kiểm độc lập theo section, mặc định từ chối. Báo cáo private/no-store, export cần quyền tương ứng và giữ cùng scope/filter. Sửa cost chỉ ADMIN, có audit; SELLER không gọi được cost/profit/finance API dù biết URL. Không trả dữ liệu cá nhân hoặc trường tài chính qua section tổng hợp phi tài chính. Xem [ma trận quyền](rbac-role-permission-matrix.md).
