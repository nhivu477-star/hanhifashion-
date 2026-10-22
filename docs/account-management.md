# Quản lý ba loại tài khoản — local demo

Ngày cập nhật: 19/10/2026. Không kết nối ngoài localhost.

## Ánh xạ và tương thích

| Loại tài khoản tạo mới | Vai trò lưu trong database | Giao diện mặc định |
|---|---|---|
| ADMIN — Quản trị viên | SUPER_ADMIN | /admin |
| SELLER — Nhân viên bán hàng | SELLER | /admin/don-hang |
| BUYER — Khách hàng | CUSTOMER | /tai-khoan |

Không thêm cột hay reset database. Giữ nguyên 10 vai trò cũ và các bản ghi người dùng hiện hữu, bổ sung tập quyền SELLER. Nhãn ba loại là lớp ánh xạ trên RBAC, không thay thế các vai trò chuyên biệt. ADMIN cũ là vai trò tương thích, vẫn giữ các quyền cũ và không tự được nâng lên SUPER_ADMIN. ADMIN tạo qua màn tài khoản mới được ánh xạ SUPER_ADMIN theo yêu cầu chủ dự án. Các nhân viên chuyên biệt được nhóm dưới SELLER để lọc danh sách, vẫn dùng đúng quyền vai trò gốc.

## Ma trận quyền

| Nghiệp vụ | ADMIN mới | SELLER | BUYER |
|---|---|---|---|
| Quản lý tài khoản, phân quyền, khóa/mở khóa | Có | Không | Không |
| Sản phẩm, giá, ảnh, trạng thái công bố theo readiness | Có | Có | Chỉ xem hàng được hiển thị |
| Xem/điều chỉnh tồn, lịch sử kho | Có | Có, có audit | Không |
| Xem/xử lý đơn và giao nhận mô phỏng | Có | Có | Chỉ theo dõi đơn của mình |
| Hồ sơ trả hàng | Toàn bộ nghiệp vụ | Chỉ đọc | Gửi/xem hồ sơ của mình |
| Thu COD, chuyển tiền mô phỏng, đối soát | Có | Không | Xem trạng thái khách hàng được phép |
| Duyệt/thực hiện hoàn tiền mô phỏng | Có | Không | Theo dõi khoản hoàn của mình |
| Giá vốn, lợi nhuận, báo cáo tài chính chi tiết | Có | Không | Không |
| Phân tích sản phẩm/tồn | Có | Có | Không |
| Hồ sơ, địa chỉ cá nhân | Của mình và quản trị được cấp | Của mình | Của mình |

## Giao diện, API và dịch vụ

Màn quản lý: /admin/tai-khoan. Có tìm kiếm, lọc loại/trạng thái, phân trang 24 dòng, tạo tài khoản, sửa tên/email, đổi loại và khóa/mở khóa. Không hiển thị password/hash/token.

Các POST /api/admin/accounts/{create,update,type,status} yêu cầu accounts.manage. Dịch vụ manageAccount kiểm lại tài khoản thực của người thao tác, không tin role trong payload/actor. Schema strict chỉ nhận trường cho từng thao tác. Tái sử dụng transaction, audit, bảo vệ SUPER_ADMIN cuối và thu hồi phiên của module nhân viên. API nhân viên cũ vẫn hoạt động, không dùng để tạo CUSTOMER.

Thay tên/email/quyền/trạng thái tăng permissionVersion và xóa phiên cũ. Không tự khóa/đổi quyền tài khoản đang thao tác, không loại bỏ SUPER_ADMIN hoạt động cuối. Khách không tự cấp quyền bằng register/profile, không truy cập đơn/hồ sơ của tài khoản khác. returnTo phải là đường dẫn local và được phép; ngữ cảnh sản phẩm/giỏ vẫn được giữ.

## Tài khoản demo

Chạy scripts/provision-demo-accounts.ts sau khi kiểm thử đạt. Script dùng quyền của SUPER_ADMIN hiện hữu để tạo đúng ba tài khoản mới và ghi audit. Không nâng/hạ, đổi mật khẩu hay ghi đè tài khoản cũ. Email trùng nhưng thiếu tệp credential sẽ bị từ chối.

Credential nằm ở .local-demo-accounts.json: mode0600, git-ignored, chỉ local. Mật khẩu ngẫu nhiên riêng, hash bcrypt trong database. Script kiểm tra lại credential khi chạy lần nữa và không đổi password. Không in password trong log/báo cáo. Đăng nhập tại http://localhost:3000/dang-nhap; đọc tệp local để lấy mật khẩu. Không dùng credential demo cho môi trường công khai.
