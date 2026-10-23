# Quy tắc đơn hàng

1. VND số nguyên; giá, coupon và phí giao do server tính. Dòng đơn giữ snapshot tên/SKU/màu/size/ảnh/đơn giá; thay catalog không sửa đơn cũ.
2. Checkout trừ tồn ngay khi tạo đơn, không có reserved quantity và không thêm reservation trong nghiệp vụ. Kiểm tra sản phẩm/màu còn active, quantity >=1, giá bán >0. updateMany với stock >= quantity ngăn âm tồn.
3. Mọi trừ tồn, ghi movement, coupon redemption, order/item/payment/history/audit và xóa giỏ cùng transaction. IdempotencyKey unique và capability cart-bound; retry cùng key trả lại đơn cũ. Lỗi transaction rollback hoàn toàn. Retry có giới hạn với lỗi cạnh tranh/unique, không retry sau khi commit.
4. Chuyển trạng thái/hủy/thu COD dùng compare-and-set order.status và paymentStatus trong transaction. Không thể hủy lặp để tăng tồn/coupon. Coupon.used không giảm dưới 0.
5. Movement mới có orderId/actorId. Lịch sử mới có previousStatus/status/event/actor/time/note. Audit được ghi cùng transaction, không còn ghi ngoài transaction cho order mutation.
6. COD mới luôn UNPAID. Chỉ admin ghi nhận thực thu sau giao, với chứng từ và nguồn thu; kiểm tra Payment đúng COD, số tiền khớp order.total, đúng một bản ghi chưa thu. Không tự suy ra PAID từ shipping/delivery/completion. Dashboard đã thu chỉ cộng PAID.
7. Đơn có userId luôn cần phiên hợp lệ của chủ sở hữu hoặc nhân viên đúng quyền; hn_order/accessToken còn lại không thay thế phiên sau logout/thu hồi. Capability chỉ dùng cho đúng đơn guest cũ userId=null. Mã đơn + số điện thoại là cặp bằng chứng riêng cho tra cứu tối thiểu (không cung cấp địa chỉ/email/token), không quyền mutation hay đổi trả. Actor mutation giữ permissionVersion đã xác thực và kiểm lại trong transaction sau async; không gán version mới từ DB để hợp thức hóa phiên cũ. Không dùng endpoint admin để cập nhật tiền/trạng thái nếu thiếu quyền.
   Checkout đã xác thực không cấp cookie capability đơn; quyền đọc/hủy đơn tài khoản luôn đi qua phiên hiện hành, kể cả khi trình duyệt vẫn giữ cookie từ trước.
8. Khách đủ điều kiện tự hủy cần reason. Nhân viên nhập giao nhận thủ công phải ghi lý do; reference giao nhận tùy chọn, chứng từ COD bắt buộc. Không thực hiện API hãng vận chuyển.
9. Hàng RETURNED chỉ được chuyển CANCELLED khi UNPAID, có lý do và kiểm đủ mọi OrderItem qua `returnedItems`: mỗi dòng đúng một lần, `sellableQuantity`/`damagedQuantity` là số nguyên không âm, tổng bằng quantity dòng. Chỉ hoàn tồn sellableQuantity đúng một lần trong transaction hủy; damagedQuantity không cộng tồn bán. Audit và lịch sử giữ phân loại kiểm hàng chuyển hoàn, không tạo ReturnInspection khách trả sau giao. Không hoàn tồn ở bước RETURNED hoặc hủy lặp. Không hủy đơn đã PAID; dùng quy trình đổi trả/hoàn tiền riêng thay vì lách trạng thái hủy. Hủy trước bàn giao không cần kiểm chuyển hoàn và giữ quy tắc hoàn tồn hiện hành.
10. Các trang admin/customer được revalidate sau mutation để hiển thị cùng dữ liệu. Không thay branding/menu hay nội dung mua sắm đã duyệt.

## Giới hạn có chủ đích
- Không carrier, online payment hoặc reservation timeout. Đổi trả/hoàn tiền và analytics có quy tắc riêng, không được suy ra từ trạng thái đơn đơn lẻ.
- SQLite phù hợp kiểm thử local, không suy diễn kết quả tải lớn hoặc triển khai nhiều instance.
- Audit actorId là snapshot string, không FK bắt buộc để giữ lịch sử khi tài khoản thay đổi.
- Bản ghi lịch sử cũ thiếu actor không thể khôi phục chắc chắn; UI đánh dấu bản ghi cũ.
- Admin xác nhận COD là ghi nhận thủ công, không chứng minh ngân hàng/hãng đã chuyển tiền thực tế.
