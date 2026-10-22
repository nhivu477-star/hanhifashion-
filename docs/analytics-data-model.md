# Mô hình dữ liệu phân tích

Mô hình gồm `VisitorSession`, `AnalyticsEvent`, `CartAnalyticsCycle`, `OrderAttribution`, `ProductCostHistory`, `OrderLineAnalytics`, với index theo ngày/trạng thái, sự kiện, sản phẩm và chu kỳ giỏ. Schema/migration hiện hành là nguồn cấu trúc; thay đổi phải bảo toàn dữ liệu nghiệp vụ, không lấy kiểm hash lịch sử làm bằng chứng phiên bản mới.

`VisitorSession.keyHash` lưu SHA-256 của cookie first-party ngẫu nhiên, tự hết hạn logic 30 phút. `AnalyticsEvent.eventKey` unique để retry idempotent; `productId` không ràng buộc cứng để sự kiện cũ không cản xóa catalog. Metadata là JSON tối giản. `CartAnalyticsCycle` giữ snapshot mặt hàng và vòng đời riêng, unique một chu kỳ đang mở cho mỗi giỏ. `OrderAttribution` là first-touch theo phiên tại thời điểm đặt. `ProductCostHistory` ghi nguồn, tác giả, effective time. `OrderLineAnalytics` giữ hàng ròng và giá vốn snapshot theo dòng đơn.

Các bản ghi đơn cũ có thể được backfill hàng ròng từ giá/giảm giá lịch sử thực có, theo lô 100 đơn, không đụng order/payment/refund/stock và không gán giá vốn. Chạy thủ công trong local bằng `npm run analytics:backfill`; mặc định database cấu hình trong `.env`, nên kiểm tra `DATABASE_URL` trước. Retention sự kiện chạy riêng bằng `npm run analytics:retention`, xoá event quá 180 ngày và không xoá giao dịch/phiên.
