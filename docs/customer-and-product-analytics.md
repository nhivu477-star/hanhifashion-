# Phân tích khách hàng và sản phẩm

Khách mới đăng ký tính theo `User.createdAt`; người mua lần đầu là người có đơn đã giao trong kỳ nhưng không có đơn giao trước ngày bắt đầu; khách quay lại có đơn giao trước đó. Repeat rate tính trong cohort kỳ. Cohort giữ tháng mua giao đầu tiên và số người quay lại theo tháng, không dự đoán tương lai. AOV theo phân khúc là hàng ròng/đơn giao. Finance mới xem mã KH giả danh và LTV; vai trò khác chỉ xem nhóm tổng hợp.

Bán chạy dùng lượng giao ròng; chậm luân chuyển là sản phẩm active có tồn nhưng không có dòng đã giao trong kỳ. Màu/size đọc từ snapshot dòng đơn. Hàng trả và huỷ hiển thị riêng; catalog readiness đếm riêng toàn bộ sản phẩm chưa xác minh và giá bằng 0. Phân tích không thay đổi publication, giá hoặc tồn. Tồn đầu kỳ/nhập đã xác minh chưa đủ thì sell-through hiển thị chưa đủ dữ liệu.
