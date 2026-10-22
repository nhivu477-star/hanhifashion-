# Đổi hàng và kiểm chất lượng — Phase 3

1. Khách gửi defect claim với phương án EXCHANGE trong 72 giờ.
2. ADMIN xem ảnh, xác minh lỗi và ghi lý do UNDER_REVIEW → APPROVED.
3. Nhận hàng mô phỏng → RECEIVED; chưa hoàn tồn.
4. Kiểm từng dòng: SELLABLE / DAMAGED / REJECTED / REVIEW. Chỉ SELLABLE tăng stock; DAMAGED vẫn có thể được đổi vì lỗi đã xác minh, hàng gốc cách ly.
5. Chọn đúng một SKU thay thế cho mỗi dòng, quantity bằng số đã duyệt/kiểm của dòng. Transaction kiểm sản phẩm và màu active, SKU tồn tại, stock đủ và trừ bằng updateMany(stock >= quantity). Rollback toàn bộ nếu bất kỳ dòng nào thiếu tồn.
6. Không có chính sách chênh lệch giá: chỉ cho SKU có giá bán hiệu lực hiện tại bằng unitPrice snapshot gốc (giá trước phân bổ coupon của đơn). Không tự thu thêm/hoàn chênh lệch, không sửa giá lịch sử. Coupon lịch sử không làm tăng số tiền hoặc tạo Payment mới cho hàng thay thế.
7. ExchangeItem snapshot SKU/name/size/color/quantity/price và liên kết ReturnItem → OrderItem. Mã riêng `HN-EXCHANGE-*` ghi rõ nội bộ, không phải vận đơn hãng.
8. Kiện thay thế dùng chung validateShipmentTransition với Phase 2A: PENDING → READY_FOR_PICKUP → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED; có giao thất bại/giao lại/chuyển hoàn theo cạnh cũ. ADMIN nhập lý do cho mọi thao tác. Không đổi tiến trình kiện gốc hoặc thu COD thêm.
9. Mọi kiện thay thế giao đủ → ReturnRequest COMPLETED. Lặp phân bổ cùng SKU hoặc lặp state không trừ tồn thêm. Hủy trước pickup trả tồn đã phân bổ một lần; RETURNED không tự hoàn tồn bán được.

## Tương thích và giới hạn

Giữ unique Shipment.orderId: vẫn một kiện giao ban đầu/đơn. Một ExchangeItem/ReturnItem đồng thời là một kiện thay thế mô phỏng tối thiểu, không tạo Shipment thứ hai cho orderId cũ. Hồ sơ nhiều dòng có một kiện riêng cho mỗi dòng; chưa gom kiện/split quantity hoặc gửi thay thế lần hai cùng dòng.

Kiện thay thế RETURNED cần xử lý/kiểm tra riêng trước bán lại; Phase 3 không tự tái cộng tồn hàng đó hoặc tạo lần đổi thứ hai. Có thể đóng hồ sơ với lý do khi mọi kiện RETURNED/CANCELED; không che sự kiện trả về. Nếu yêu cầu cần thay phương án sau khi đã tạo khoản hoàn/kiện, chưa cho chỉnh payload hoặc mở lại hồ sơ tự động. Các trường hợp này được ghi nhận là giới hạn, không tự phát sinh hàng/tiền.

Admin thấy inspection, movement (RETURN_RESTOCK / EXCHANGE_ALLOCATED / EXCHANGE_CANCELED), evidence và timeline. Khách thấy SKU/hàng thay thế và trạng thái mô phỏng qua DB, không thấy bằng chứng nội bộ.
