# Định nghĩa chỉ số — Phase 6

Tất cả tiền là VND nguyên; phép phân bổ giảm giá dùng thuật toán phần dư lớn nhất ổn định theo mã dòng hàng, tổng phân bổ đúng bằng giảm giá trên đơn. Ví dụ hai dòng 200.000đ và 100.000đ, giảm 30.000đ: giảm 20.000đ/10.000đ, hàng ròng trước hoàn 270.000đ.

| Chỉ số | Công thức / nguồn |
|---|---|
| Hàng gộp | Σ số lượng × đơn giá snapshot của dòng đã giao |
| Hàng ròng | Σ (phân bổ hàng ròng sau giảm giá − hoàn hàng đã hoàn tất); không gồm ship |
| Hàng đã thanh toán | Hàng ròng của đơn đã giao có payment status PAID; COD chưa thu bị loại |
| Đơn trong nhóm | Đơn tạo trong kỳ và khớp trạng thái/bộ lọc; gồm đơn huỷ, hiển thị riêng |
| Đơn hoàn tất | Đơn DELIVERED hoặc COMPLETED |
| AOV | Hàng ròng / số đơn hoàn tất; null nếu không có đơn hoàn tất |
| Đơn vị bán | Số lượng đã giao trừ lượng trả SELLABLE/DAMAGED; phần trả báo cáo riêng |
| Tỷ lệ trả theo sản phẩm | Lượng trả SELLABLE/DAMAGED / (đơn vị bán + lượng trả) |
| Tỷ lệ huỷ | Lượng huỷ / toàn bộ lượng đặt |
| Tỷ lệ mua lặp | Người có trên một đơn đã giao trong kỳ / người mua đã giao trong kỳ |
| Tần suất | Đơn đã giao / người mua đã giao trong kỳ |
| Funnel | Phiên 30 phút có chuỗi sự kiện đầu tiên theo thứ tự SESSION→VIEW→ATTEMPT→SUCCESS→CHECKOUT→ORDER |
| Tỷ lệ bỏ giỏ | Giỏ đủ điều kiện, chưa chuyển đổi, im lặng đủ ngưỡng / giỏ đủ điều kiện trong cohort |
| LTV | Tổng hàng ròng đã thu của các đơn đã giao toàn thời gian của nhóm khách phát sinh kỳ; chỉ hiển thị với finance |
| Lãi gộp | Hàng ròng − giá vốn snapshot đã biết; tổng chỉ hiện khi độ phủ giá vốn dòng hàng đã giao là 100% |
| COD | Thu từ khách, chuyển về shop, còn phải chuyển và đối soát là các ledger/snapshot riêng |
| Phân bổ bộ sưu tập | Chia nguyên VND đều giữa bộ sưu tập của sản phẩm, phần dư theo ID; không nhân tổng doanh thu |

Doanh số theo ngày dùng ngày tạo đơn theo múi giờ Việt Nam và trạng thái hiện tại. Báo cáo nguồn/phiên chỉ áp dụng dữ liệu UTM/event đã thu; không suy ra nguồn cho đơn lịch sử.
