# Funnel và tracking

Sự kiện: SESSION_STARTED, PRODUCT_VIEWED, PRODUCT_SEARCHED, ADD_TO_CART_ATTEMPTED, ADD_TO_CART_SUCCEEDED, CHECKOUT_STARTED, ORDER_PLACED. Web app gửi session/view/search/checkout; API ghi attempt trước quyền truy cập và success sau transaction giỏ. Order/campaign ghi bên trong transaction đơn mới. Funnel dùng sự kiện đầu tiên mỗi bước trong cùng visitor session 30 phút, bắt buộc timestamp tăng theo từng bước. Mẫu chưa có bước trước không nhảy vào bước kế.

Public endpoint nhận schema chặt, giới hạn body 8KiB, cùng-origin, rate-limit theo visitor, event key unique và không nhận nội dung tìm kiếm hay metadata cá nhân. Sự kiện từ analytics off không được ghi. Chỉ staff có marketing.read xem funnel; đơn đặt và tiền vẫn lấy từ Order/Payment, không từ event.

Giỏ bỏ dở lấy snapshot của thay đổi giỏ sau đăng nhập, cập nhật cùng transaction với CartItem. Chu kỳ theo first-seen, activity cuối, liên kết order chuyển đổi. Chu kỳ lịch sử chưa có snapshot không được bịa.
