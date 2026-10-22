# Quy tắc nghiệp vụ phân tích

Phạm vi chỉ là cửa hàng demo local, tiền COD và hoàn tiền là mô phỏng. Nguồn sự thật là SQLite hiện tại. Số đơn theo cohort ngày tạo đơn, lọc bằng trạng thái và hoàn tiền hiện tại; đây không phải biểu đồ dòng tiền theo ngày nhận tiền. Mọi báo cáo gắn chú thích này.

Chỉ đơn `DELIVERED` hoặc `COMPLETED` được tính hàng đã giao. Đơn hủy không được tính đơn vị bán hay doanh thu hàng. COD chưa thu không phải tiền đã thu; tiền ship luôn tách khỏi hàng hóa. Tiền chuyển COD từ đơn vị giao tới shop chỉ là đối soát khoản thu trước đó, không phải doanh thu lần hai. Tiền hoàn chỉ trừ doanh thu khi mock refund là `SIMULATED_COMPLETED`; phần hoàn vận chuyển không trừ doanh số hàng.

Giỏ đủ điều kiện có snapshot sản phẩm/biến thể đang hoạt động, giá dương, số lượng hợp lệ và tồn tại thời điểm cập nhật. Giỏ chuyển đổi được giữ trong cohort ban đầu và không mang nhãn bỏ dở. Chỉ giỏ có chu kỳ activity từ sau khi bật tracking mới đủ dữ liệu phân loại; chu kỳ cũ không bị suy đoán. Mặc định bỏ dở sau 24 giờ, ngưỡng cấu hình 1–720 giờ. Giá trị giỏ là ước tính, không phải doanh thu; analytics không xoá giỏ.

Theo dõi first-party dùng cookie ngẫu nhiên 30 phút, lưu hash khóa; không lưu IP, user-agent, email, token phiên đăng nhập, hoặc từ khóa tìm kiếm. UTM chỉ nhận tag chiến dịch hợp lệ, từ chối email/URL/số điện thoại. Có thể tắt qua cookie `hn_analytics=off`. Sự kiện web cũ không được dựng ngược. Giữ sự kiện tối đa 180 ngày theo lệnh bảo trì local; phiên và dữ liệu giao dịch không bị dọn bởi lệnh đó.

Thêm giỏ yêu cầu tài khoản. Attempt được ghi trước kiểm tra phiên đăng nhập; thành công chỉ ghi trong cùng transaction khi thay đổi giỏ thành công. Checkout cũng yêu cầu tài khoản. Sự kiện đặt đơn, attribution, giá vốn lịch sử và chu kỳ chuyển đổi được ghi cùng transaction đơn mới; retry idempotent không tạo đơn/snapshot lặp.

Các cảnh báo đối chiếu chỉ đọc và không sửa giao dịch. Không đổi giá, tồn, trạng thái công bố, hoàn, đối soát hoặc đơn khi có sai khác. Giá vốn không rõ để trống; nguồn giá vốn mới không được gán hồi tố.
