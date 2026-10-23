# Quy tắc giao nhận thủ công

Chỉ LOCAL_MANUAL, không tích hợp hãng hoặc giữ adapter có thể bật lại. Endpoint hãng đã ngừng hỗ trợ trả HTTP 410; cột/migration lịch sử còn lại chỉ để bảo toàn dữ liệu. ADMIN và SELLER vận hành giao nhận; chỉ ADMIN ghi nhận tài chính/COD.

## Hợp đồng nghiệp vụ
- Thêm bảng mới, không sửa/xóa ledger hay đơn cũ, không backfill chứng từ vận chuyển/tiền giả.
- Một Shipment cho mỗi đơn trong nghiệp vụ, chỉ tạo ở PROCESSING + COD UNPAID có payment khớp total. Provider duy nhất LOCAL_MANUAL, reference nội bộ bắt đầu HN-SHIP-, không phải vận đơn hãng.
- Phí giao thực tế trên shipment tách Order.shipping khách đã đồng ý; không sửa giá lịch sử.
- Snapshot địa chỉ lấy từ order ở server; expectedCOD lấy từ Payment.amount. Khách không được gửi tổng COD hay snapshot thay thế.
- Trạng thái shipment chi tiết riêng; đồng bộ trạng thái đơn thô qua validator nghiệp vụ trong cùng transaction. Đơn đã có shipment phải dùng module shipping để ghi nhận giao/thu COD, tránh hai nguồn dữ liệu lệch nhau.
- Giao thất bại và RETURNING/RETURNED không tự hoàn tồn. Trước hủy đơn RETURNED + UNPAID, vận hành phải kiểm đủ từng dòng `{orderItemId, sellableQuantity, damagedQuantity}`: không âm/trùng/thiếu, tổng bằng lượng dòng. Chỉ lượng bán được hoàn tồn một lần cùng transaction CANCELLED, movement, audit phân loại và history; hàng hỏng không cộng tồn bán. Đây không phải ReturnInspection hậu mãi. Hủy trước bàn giao đồng thời hủy shipment và giữ quy tắc hoàn tồn bình thường. Không hủy kiện đang lưu chuyển.
- Mọi event có from/to/time/actor/source=LOCAL_MANUAL. Failure reason bắt buộc thuộc nhóm lý do rõ ràng; không có webhook/carrier thật.
- Ghi nhận tài chính append-only, idempotency key và reference unique. Sửa sai bằng bản ghi correction có liên kết bản gốc và audit, không ghi đè lịch sử.
- Không đưa chứng từ/ghi chú đối soát nội bộ vào giao diện/API khách.
