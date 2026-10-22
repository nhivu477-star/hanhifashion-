# Sổ hoàn tiền mô phỏng

**SIMULATED REFUND**. Không ngân hàng, cổng thanh toán, API hoặc chuyển tiền thật.

MockRefund liên kết duy nhất ReturnRequest, Order và Payment gốc. Giữ ID/reference `HN-REFUND-*`, amount, shippingAmount, reason, status, approvalActor, completionActor, createdAt/completedAt. Thay đổi trạng thái lưu audit append-only; amount không được sửa, không xóa lịch sử. Sổ này độc lập CODCollection/Remittance/Reconciliation; không tạo Payment mới.

## Tính số tiền ở server

1. Lấy giá đơn vị/số lượng từ OrderItem. Phân bổ Order.discount theo tỷ lệ giá trị dòng bằng số nguyên VND (BigInt); phần lẻ lớn nhất trước, tie theo id để luôn xác định và tổng khớp.
2. Yêu cầu một phần dòng lấy floor(netLine × quantity / quantityPurchased). Khi yêu cầu phần còn lại cuối cùng, lấy netLine trừ tổng tiền đã được giữ ở các hồ sơ không giải phóng. Bảo đảm tổng không vượt netLine và không mất phần dư khi trả toàn dòng. Không lấy giá catalog mới.
3. Số hoàn hàng = tổng ReturnItem.amount đã snapshot. Chỉ tính sau khi kiểm hàng đạt của tất cả dòng, khách chọn REFUND.
4. Phí giao gốc không tự hoàn. ADMIN chỉ có lựa chọn hoàn Order.shipping khi hồ sơ trả toàn bộ đơn do lỗi đã xác nhận, có lý do/thống nhất với khách. Trả một phần chưa tự phân bổ phí giao. Chưa nhập/tự tính phí gửi hàng lỗi mới ngoài phí giao lịch sử.
5. Trần tiền: min(số đã thu mô phỏng, Payment.amount) trừ PENDING/APPROVED/SIMULATED_COMPLETED của các khoản khác trên cùng đơn. Có Shipment dùng collectedCOD; đơn cũ dùng Payment PAID. Chưa thu hoặc số còn lại không đủ thì từ chối. Kiểm lại trần lúc duyệt và xác nhận hoàn tất.
6. Request schema strict không nhận amount do client. Quantity claim và khóa refund/request unique ngăn hoàn trùng. Transaction SQLite + rollback/retry bảo vệ thao tác đồng thời. COD correction giảm số thu dưới tổng khoản hoàn đã giữ/đã hoàn bị chặn; không hủy chứng từ cũ để lách trần.

## Trạng thái

PENDING → APPROVED → SIMULATED_COMPLETED.
PENDING → REJECTED/CANCELED; APPROVED → CANCELED. Các trạng thái cuối không mở lại. Retry cùng trạng thái không thêm refund hoặc audit hoàn tất thứ hai. Reject/cancel giữ nguyên số tiền/record và audit, đóng hồ sơ xử lý, không giả đã trả tiền.

Không có chỉnh sửa âm hoặc correction refund sau hoàn tất trong phạm vi hiện tại; không cho sửa số tiền để “sửa sai”. Cần đặc tả nghiệp vụ điều chỉnh mới nếu mở rộng. Hoàn đúng một lần đã hoàn tất là bất biến.

## Phân biệt các sổ

- Payment/collectedCOD: khách đã trả mô phỏng bao nhiêu.
- remittedCOD/outstandingCOD: tiền đã về/chưa về shop theo nghiệp vụ.
- MockRefund: phần shop xác nhận hoàn mô phỏng cho khách.

Hoàn không tự làm RECONCILED, không bù trừ nợ vận chuyển, không đổi Order.total/Payment.amount, không đổi lịch sử PAID. Admin giữ cảnh báo COD gốc và thấy bảng hoàn riêng; chỉ số doanh thu gross nghiệp vụ vẫn giữ ý nghĩa cũ, chưa coi là báo cáo net kế toán. Không tuyên bố đối soát thật hoặc tiền đã về khách.
