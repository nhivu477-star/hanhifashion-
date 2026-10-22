# Phase 2A — audit trước triển khai và quy tắc

## Audit ban đầu
Đã đọc bốn docs/order-*.md. Mã `src/lib/order-lifecycle.ts` có transaction retry/CAS, history actor và COD độc lập. `prisma/schema.prisma` chưa có Shipment/ShipmentEvent/COD settlement. `Order.shippingStatus` là snapshot thô; Payment chỉ chứng minh ghi nhận thu thủ công, không phân biệt hãng giữ tiền và tiền đã chuyển. `AdminPage` chỉ nhận ADMIN; chưa có vai trò nhân viên được phép tài chính. Tái sử dụng ADMIN duy nhất, không mở rộng quyền STAFF.

23 unit tests Phase 1 chạy lại đạt trước sửa; 17 integration đang chạy lại trước sửa. Chưa lấy lời báo cáo trước làm bằng chứng mới.

## Phương án tương thích
- Thêm bảng mới, không sửa/xóa ledger hay đơn cũ, không backfill chứng từ vận chuyển/tiền giả.
- Một Shipment cho mỗi đơn trong Phase 2A, chỉ tạo ở PROCESSING + COD UNPAID có payment khớp total. Provider duy nhất LOCAL_MANUAL, reference nội bộ bắt đầu HN-SHIP-, không phải vận đơn hãng.
- Phí giao thực tế trên shipment tách Order.shipping khách đã đồng ý; không sửa giá lịch sử.
- Snapshot địa chỉ lấy từ order ở server; expectedCOD lấy từ Payment.amount. Khách không được gửi tổng COD hay snapshot thay thế.
- Trạng thái shipment chi tiết riêng; đồng bộ trạng thái đơn thô qua validator Phase 1 trong cùng transaction. Đơn đã có shipment phải dùng module shipping để ghi nhận giao/thu COD, tránh hai nguồn dữ liệu lệch nhau.
- Giao thất bại và RETURNING/RETURNED không tự hoàn tồn; RETURNED rồi hủy đơn mới hoàn tồn một lần theo Phase 1. Hủy trước bàn giao đồng thời hủy shipment. Không hủy kiện đang lưu chuyển.
- Mọi event có from/to/time/actor/source=LOCAL_MANUAL. Failure reason bắt buộc thuộc nhóm lý do rõ ràng; không có webhook/carrier thật.
- Ghi nhận tài chính append-only, idempotency key và reference unique. Sửa sai bằng bản ghi correction có liên kết bản gốc và audit, không ghi đè lịch sử.
- Không đưa chứng từ/ghi chú đối soát nội bộ vào giao diện/API khách.
