# Ngôn ngữ, khu vực và tiền tệ

Hệ thống chỉ chạy local. Không có giao nhận, thanh toán, đổi ngoại tệ hoặc chuyển tiền thật.

## Tùy chọn chung

Tùy chọn cá nhân nằm tại `/cai-dat-hien-thi`, truy cập từ menu, tài khoản hoặc thanh điều hướng quản trị. Không còn thanh ngôn ngữ riêng phía trên header.

Bộ chọn trên mọi trang hỗ trợ tiếng Việt / English; VN, SG, US, GB, FR; và các đồng tiền được bật trong cấu hình. Chọn và bấm Lưu tùy chọn. Lựa chọn áp dụng cho Storefront, tài khoản, Admin và Seller mà không thay đổi quyền truy cập.

Khách vãng lai: cookie HttpOnly/SameSite và bản ghi `ShopperPreference` theo khóa khách ngẫu nhiên. Đăng nhập: ghi theo `userId` duy nhất trong SQLite. Lựa chọn rõ ràng trên trình duyệt được mang sang tài khoản khi đăng nhập; nếu không có cookie lựa chọn, dùng tùy chọn đã lưu của tài khoản. Đăng xuất giữ cách hiển thị trên trình duyệt. Các tab đồng bộ qua thông báo storage và đọc lại API, không lưu thông tin đăng nhập trong localStorage.

UI dịch bằng các boundary React, dùng chung từ điển được lưu trong dự án; không sửa DOM sau hydration, không gọi dịch vụ dịch. Dịch nhãn hiển thị và thuộc tính trợ năng, không đổi form values, SKU, mã đơn, URL hoặc dữ liệu gốc. Tên riêng và nội dung khách tự nhập được giữ nguyên. Bản dịch không bổ sung thông tin hàng hóa chưa được xác minh.

## Giao nhận và địa chỉ

Chỉ VN được đặt đơn và sử dụng giao nhận nội bộ hiện có. Các khu vực khác được xem danh mục/giá và lưu địa chỉ, nhưng UI vô hiệu hóa đặt hàng và API quote/checkout từ chối trước khi tạo đơn hoặc trừ kho. Khu vực không làm tự bật API hãng vận chuyển.

| Khu vực | Trường địa chỉ | Mã bưu chính |
| --- | --- | --- |
| VN | Tỉnh/thành phố, phường/xã, số nhà/tên đường | Không bắt buộc |
| SG | Thành phố/khu vực nếu có, địa chỉ đường | 6 chữ số |
| US | State, City, Street | ZIP 5 số hoặc ZIP+4 |
| GB | County nếu có, Town/City, Street | Định dạng postcode UK |
| FR | Region nếu có, City, Street | 5 chữ số |

Số điện thoại Việt Nam giữ quy tắc +84/0 hiện có; địa chỉ quốc tế chấp nhận định dạng quốc tế cơ bản. `countryCode` và `postalCode` là cột bổ sung của Address và Order; dữ liệu cũ mặc định VN, không bị ghi đè.

## Tỷ giá tham chiếu hiển thị

Bộ mặc định **LOCAL_REFERENCE_V1**, ngày nhãn **01/01/2025**, là bảng tham chiếu cố định nội bộ; **không phải tỷ giá thị trường tại ngày vận hành**, không phải báo giá ngân hàng. Không dùng kết quả nghiên cứu nguồn bên ngoài khi không xác minh được đầy đủ ngày/giá. Không có tác vụ tự tải tỷ giá hoặc dịch vụ ngoại hối.

| Đồng tiền | VND / 1 đơn vị |
| --- | ---: |
| VND | 1 |
| USD | 26.000 |
| EUR | 30.000 |
| SGD | 20.000 |

Giá hiển thị = giá VND ÷ số VND mỗi đơn vị. `Intl.NumberFormat` định dạng theo ngôn ngữ; VND không có phần lẻ, các đồng tiền khác theo số chữ số lẻ chuẩn ISO (USD/EUR/SGD: 2). VND/tiếng Việt giữ định dạng giao diện cũ. Các trường nhập giá, biểu mẫu nghiệp vụ, số liệu nguồn và CSV giữ đơn vị VND ghi rõ trên nhãn.

Đơn hàng, tồn kho, giảm giá, COD, sổ đối soát, hạn mức hoàn tiền và mọi giao dịch **luôn tính bằng số nguyên VND trên server**. Tham số giá/tỷ giá/tiền tệ gửi từ trình duyệt không được dùng để tính tổng đơn. Checkout hiển thị thêm số tiền VND sẽ ghi nhận khi chọn ngoại tệ.

Người có quyền `content.manage` có thể cấu hình thêm đồng tiền, tỷ giá, ngày và nguồn ở **Admin → Cài đặt → Tỷ giá hiển thị**. API/service xác minh quyền mới nhất, kiểm tra ISO currency, giá trị dương, mã không trùng; VND phải bật với tỷ giá 1 và USD phải được bật. Thay đổi ghi audit, chỉ ảnh hưởng hiển thị, không sửa các đơn lịch sử. Đồng tiền đã tắt tự trở về VND trên lần đọc tiếp theo.

## API và dữ liệu

- `GET /api/preferences`: tùy chọn hiện tại và cấu hình tỷ giá, private/no-store.
- `POST /api/preferences`: validate schema strict, kiểm tra cùng origin; không nhận userId/role từ client.
- `POST /api/admin/currencies`: cần đăng nhập và `content.manage`; ghi cấu hình trong StoreSetting và audit trong transaction.
- Backend/customer schema dùng chung với form checkout, cùng kiểm tra địa chỉ theo countryCode.
- Các route/controllers/services cũ được giữ và tái sử dụng, không chuyển sang kiến trúc khác.
