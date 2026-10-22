# Quy tắc nghiệp vụ Phase 1

1. VND số nguyên; giá, coupon và phí giao do server tính. Dòng đơn giữ snapshot tên/SKU/màu/size/ảnh/đơn giá; thay catalog không sửa đơn cũ.
2. Checkout trừ tồn ngay khi tạo đơn, không có reserved quantity và không thêm reservation trong Phase 1. Kiểm tra sản phẩm/màu còn active, quantity >=1, giá bán >0. updateMany với stock >= quantity ngăn âm tồn.
3. Mọi trừ tồn, ghi movement, coupon redemption, order/item/payment/history/audit và xóa giỏ cùng transaction. IdempotencyKey unique và capability cart-bound; retry cùng key trả lại đơn cũ. Lỗi transaction rollback hoàn toàn. Retry có giới hạn với lỗi cạnh tranh/unique, không retry sau khi commit.
4. Chuyển trạng thái/hủy/thu COD dùng compare-and-set order.status và paymentStatus trong transaction. Không thể hủy lặp để tăng tồn/coupon. Coupon.used không giảm dưới 0.
5. Movement mới có orderId/actorId. Lịch sử mới có previousStatus/status/event/actor/time/note. Audit được ghi cùng transaction, không còn ghi ngoài transaction cho order mutation.
6. COD mới luôn UNPAID. Chỉ admin ghi nhận thực thu sau giao, với chứng từ và nguồn thu; kiểm tra Payment đúng COD, số tiền khớp order.total, đúng một bản ghi chưa thu. Không tự suy ra PAID từ shipping/delivery/completion. Dashboard đã thu chỉ cộng PAID.
7. Khách chỉ xem đơn sở hữu hoặc có cookie HttpOnly capability do checkout cấp. Mã đơn + số điện thoại là cặp bằng chứng riêng cho tra cứu tối thiểu (không cung cấp địa chỉ/email/token). Không cho dùng endpoint admin để cập nhật tiền/trạng thái.
8. Khách đủ điều kiện tự hủy cần reason. Nhân viên nhập giao nhận thủ công phải ghi lý do; reference giao nhận tùy chọn, chứng từ COD bắt buộc. Không thực hiện API hãng vận chuyển.
9. Hàng RETURNED chỉ hoàn tồn khi chuyển CANCELLED, không hoàn ở cả hai bước. Không hủy đơn đã PAID; hoàn tiền nằm ngoài Phase 1.
10. Các trang admin/customer được revalidate sau mutation để hiển thị cùng dữ liệu. Không thay branding/menu hay nội dung mua sắm đã duyệt.

## Giới hạn có chủ đích
- Không carrier, online payment, refund/returns management, reservation timeout, advanced analytics.
- SQLite phù hợp kiểm thử local, không suy diễn kết quả tải lớn hoặc triển khai nhiều instance.
- Audit actorId là snapshot string, không FK bắt buộc để giữ lịch sử khi tài khoản thay đổi.
- Bản ghi lịch sử cũ thiếu actor không thể khôi phục chắc chắn; UI đánh dấu bản ghi cũ.
- Admin xác nhận COD là ghi nhận thủ công, không chứng minh ngân hàng/hãng đã chuyển tiền thực tế.
