# Trạng thái giao nhận — Phase 2A

```mermaid
stateDiagram-v2
[*] --> PENDING
PENDING --> READY_FOR_PICKUP
PENDING --> CANCELED
READY_FOR_PICKUP --> PICKED_UP
READY_FOR_PICKUP --> CANCELED
PICKED_UP --> IN_TRANSIT
PICKED_UP --> RETURNING
IN_TRANSIT --> OUT_FOR_DELIVERY
IN_TRANSIT --> DELIVERY_FAILED
IN_TRANSIT --> RETURNING
OUT_FOR_DELIVERY --> DELIVERED
OUT_FOR_DELIVERY --> DELIVERY_FAILED
DELIVERY_FAILED --> OUT_FOR_DELIVERY
DELIVERY_FAILED --> RETURNING
RETURNING --> RETURNED
```

DELIVERED, RETURNED, CANCELED là kết thúc cho kiện này. Không tạo kiện thứ hai cho cùng đơn ở Phase 2A.

| Sự kiện kiện | Đồng bộ trạng thái đơn |
|---|---|
| PENDING/READY_FOR_PICKUP | Giữ PROCESSING |
| PICKED_UP | PROCESSING → SHIPPING |
| IN_TRANSIT/OUT_FOR_DELIVERY | Giữ SHIPPING; khi giao lại từ DELIVERY_FAILED → SHIPPING |
| DELIVERY_FAILED | SHIPPING → DELIVERY_FAILED; lưu DeliveryAttempt |
| RETURNING | Nếu đơn còn SHIPPING, ghi DELIVERY_FAILED; không hoàn tồn |
| RETURNED | DELIVERY_FAILED → RETURNED; không hoàn tồn |
| CANCELED trước bàn giao | PROCESSING → CANCELLED, hoàn tồn theo Phase 1 |
| DELIVERED | SHIPPING → DELIVERED; không tự thanh toán |

Khi RETURNED, admin kiểm tra hàng đã về rồi hủy đơn ở trang đơn hàng; CAS Phase 1 hoàn tồn duy nhất. Giao thất bại cần reasonCode và note. Các lý do: không liên hệ được, từ chối nhận, địa chỉ sai, giao không thành công. Mọi cập nhật lưu previousStatus/status/createdAt/actorId/source=LOCAL_MANUAL; không nhận source từ client.

Đơn cũ chưa có Shipment vẫn dùng quy trình Phase 1. Đơn đã có Shipment bị chặn các chuyển giao/thu COD ở endpoint cũ, buộc đi qua hồ sơ để hai trạng thái thống nhất. Cập nhật đơn và kiện cùng transaction, rollback nếu một phía không hợp lệ.
