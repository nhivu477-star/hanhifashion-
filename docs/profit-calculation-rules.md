# Giá vốn và lợi nhuận — Phase 6

Giá vốn đơn vị chỉ dùng bản ghi hiệu lực không muộn hơn lúc tạo đơn, ưu tiên variant rồi product. Snapshot dòng hàng đóng băng giá vốn đã biết. Không có thì NULL, không gán 0 và không suy từ giá bán. Nhập giá vốn mới chỉ ảnh hưởng đơn mới; cập nhật giá vốn lịch sử yêu cầu mã OrderItem, snapshot ròng tồn tại, người có `analytics.costs.manage`, nguồn chứng từ tối thiểu 20 ký tự, transaction và operational audit.

Ví dụ: hai đơn vị ròng 180.000đ, chi phí 40.000đ/chiếc và một đơn vị được trả SELLABLE, vốn sau hoàn = 40.000đ × (2−1) = 40.000đ, lãi gộp = 140.000đ. Nếu trả DAMAGED thì vốn vẫn 80.000đ. Nếu một trong các dòng giao thiếu giá vốn, tổng lãi toàn nhóm là “Chưa đủ dữ liệu giá vốn”; hiển thị phần đã biết và tỷ lệ coverage riêng.

Phí giao thực tế lấy từ Shipment.shippingFee đã có; không có thì NULL. Hàng gộp/ròng không gộp phí ship. Khoản giảm giá là chiết khấu doanh thu đã phân bổ, không phải chi phí quảng cáo. Báo cáo không khẳng định lợi nhuận ròng vì chưa trừ chi phí vận hành/marketing.
