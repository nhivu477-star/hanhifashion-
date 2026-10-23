# Use cases — baseline 31 nghiệp vụ

[BRD / yêu cầu](business-requirements.md) · [Business rules](business-rules.md) · [Quy trình](business-processes.md) · [Test scenarios](test-scenarios.md)

Giữ nguyên ID `UC01`–`UC31` của [danh mục nghiệm thu](business-acceptance-31.json). Tài liệu này bổ sung ngữ cảnh BA dễ đọc; tiêu chí main/alternative/exception/permission/integrity/UI chi tiết vẫn ở [31 nghiệp vụ](business-acceptance-31.md) và [tiêu chuẩn chức năng](business-acceptance-standards.md). **Không UC nào là kết quả PASS.**

## Actor và hợp đồng chung

- **G:** guest; **C:** CUSTOMER sở hữu dữ liệu; **S:** SELLER; **A:** ADMIN. S/A thực hiện chức năng được cấp, không giả actor từ payload. “Nhân viên” mô tả công việc, không phải role thứ tư.
- Tiền điều kiện chung cho thao tác bảo vệ: phiên hợp lệ, tài khoản active, quyền từ DB hiện tại, origin và input hợp lệ. Actor mutation bắt buộc giữ permissionVersion đã xác thực và đối chiếu trong transaction sau async; không thay bằng version mới để bỏ qua thu hồi phiên. Mọi UC phải thử thêm sai quyền/sai chủ sở hữu/phiên cũ và thu hồi trong lúc request đang chờ.
- Hậu điều kiện lỗi: không công bố thành công, không lưu nửa nghiệp vụ, không lộ bí mật; mutation quan trọng và audit cùng transaction. Retry không nhân hiệu ứng theo BR-014/BR-022.
- Cột **Luồng chính** là thứ tự tương tác, **Nhánh / ngoại lệ** là khác biệt nghiệp vụ thực sự; không dùng câu “thành công theo module” thay kết quả cụ thể. Số tiền/giao nhận trong UC10/16/27/28 chỉ local/manual/mô phỏng.

## Tài khoản và lựa chọn hàng

### UC01 — Đăng ký tài khoản

- **Actor:** G. **Yêu cầu/rule:** FR-001; BR-001, BR-002. **Tiền điều kiện:** có ít nhất email hoặc điện thoại hợp lệ, định danh chưa trùng.
- **Luồng chính:** nhập hồ sơ/mật khẩu xác nhận → server chuẩn hóa/kiểm duy nhất → hash mật khẩu → tạo CUSTOMER và phiên → hiển thị trạng thái đăng nhập.
- **Nhánh / ngoại lệ:** đăng ký chỉ điện thoại; email khác hoa/thường được chuẩn hóa; wishlist khách được hợp nhất theo cơ chế hiện hữu. Trùng định danh, mật khẩu yếu/không khớp hoặc chèn role không cấp quyền.
- **Hậu điều kiện:** một tài khoản CUSTOMER, không lưu mật khẩu thô, cookie HttpOnly; không tài khoản dở dang khi rollback.

### UC02 — Đăng nhập và xác thực

- **Actor:** G/C/S/A. **Yêu cầu/rule:** FR-001; BR-001, BR-002. **Tiền điều kiện:** tài khoản hoạt động; đổi mật khẩu cần mật khẩu hiện tại; reset cần token local còn hạn/chưa dùng.
- **Luồng chính:** xác minh email/điện thoại và mật khẩu → CAS tạo phiên khớp hash/version đã xác minh → đến trang theo quyền; đăng xuất thu hồi phiên. Đổi mật khẩu xác minh hash cũ; reset dùng mail local và claim token → đổi hash/thu hồi phiên/vô hiệu mọi recovery token còn lại cùng transaction.
- **Nhánh / ngoại lệ:** returnTo local được phép giữ ngữ cảnh mua; sai mật khẩu/khóa/hết hạn/version cũ bị từ chối; reset email không tồn tại cùng thông báo, token hết hạn/đã dùng không đổi được.
- **Hậu điều kiện:** chỉ phiên hiện hành được chấp nhận; đổi/reset buộc xác thực lại và token khôi phục cũ không dùng được; tranh chấp reset/đổi quyền không tạo phiên từ credential cũ; không open redirect hoặc tiết lộ tài khoản.

### UC03 — Quản lý thông tin cá nhân

- **Actor:** C (S/A với hồ sơ cá nhân của mình). **Yêu cầu/rule:** FR-002; BR-003, BR-005. **Tiền điều kiện:** sở hữu hồ sơ/địa chỉ.
- **Luồng chính:** mở hồ sơ → sửa tên/điện thoại → thêm/sửa/xóa/chọn địa chỉ mặc định → lưu và đọc lại.
- **Nhánh / ngoại lệ:** chưa có địa chỉ có empty state; sai ID/chủ sở hữu, input sai hoặc đổi email qua form khách bị từ chối.
- **Hậu điều kiện:** dữ liệu của actor cập nhật đúng, default theo dịch vụ; đơn cũ giữ snapshot, không thay chủ địa chỉ.

### UC04 — Xem danh sách sản phẩm

- **Actor:** G/C. **Yêu cầu/rule:** FR-003; BR-007, BR-008. **Tiền điều kiện:** catalog có hoặc không có sản phẩm phù hợp mode preview/commercial.
- **Luồng chính:** mở danh mục/bộ sưu tập → lấy trang sản phẩm hoạt động theo mode → xem ảnh/tên/giá/tình trạng → mở chi tiết.
- **Nhánh / ngoại lệ:** hết hàng hoặc rỗng hiển thị trung thực; danh mục ngừng hoạt động và sản phẩm không đủ điều kiện không xuất như bán được; ảnh lỗi có fallback.
- **Hậu điều kiện:** không mutation, không giả tồn/ảnh/readiness; liên kết đúng slug.

### UC05 — Tìm kiếm và lọc sản phẩm

- **Actor:** G/C. **Yêu cầu/rule:** FR-003; BR-007. **Tiền điều kiện:** có tiêu chí tìm kiếm/lọc.
- **Luồng chính:** nhập từ khóa → kết hợp danh mục/màu/size/giá/còn hàng → sắp xếp/phân trang → mở kết quả.
- **Nhánh / ngoại lệ:** tìm không dấu; không kết quả; query sai được chuẩn hóa/từ chối an toàn, không lộ SQL; thay filter không giữ trang vượt phạm vi.
- **Hậu điều kiện:** kết quả và điều kiện hiển thị nhất quán, không thay dữ liệu hàng.

### UC06 — Xem chi tiết sản phẩm

- **Actor:** G/C. **Yêu cầu/rule:** FR-004; BR-008, BR-009. **Tiền điều kiện:** sản phẩm được xem trong mode hiện tại.
- **Luồng chính:** xem chất liệu/phom/giá → chọn màu và size → gallery/stock đồng bộ → tùy chọn bảng/tư vấn size, wishlist hoặc gợi ý phối → chọn biến thể để thêm giỏ ở UC07.
- **Nhánh / ngoại lệ:** URL màu đích chọn đúng màu; màu thiếu ảnh không mượn ảnh khác; size hết hàng được giải thích, không tự thay; ngoài bảng không ngoại suy; sản phẩm không tồn tại có trạng thái không tìm thấy.
- **Hậu điều kiện:** lựa chọn đúng biến thể, không tự mua; đóng dialog xóa số đo, không lưu/analytics; ảnh tham khảo vẫn được ghi nhận là tham khảo.

## Giỏ, checkout và xử lý đơn

### UC07 — Thêm sản phẩm vào giỏ

- **Actor:** G/C. **Yêu cầu/rule:** FR-005; BR-013, BR-014. **Tiền điều kiện:** chọn biến thể active, lượng nguyên dương và tồn đáp ứng.
- **Luồng chính:** gửi biến thể/lượng và mutation key → server kiểm hàng/giỏ actor → thêm hoặc tăng dòng cùng biến thể → hiển thị giỏ.
- **Nhánh / ngoại lệ:** retry cùng key/payload trả cùng hiệu ứng; key khác payload hoặc lượng vượt tồn bị chặn; không cần analytics consent để chống lặp.
- **Hậu điều kiện:** một dòng/biến thể/giỏ, đúng actor; giỏ không giữ chỗ hoặc trừ tồn.

### UC08 — Quản lý giỏ hàng

- **Actor:** G/C. **Yêu cầu/rule:** FR-005; BR-003, BR-014. **Tiền điều kiện:** giỏ thuộc user/guest hiện tại.
- **Luồng chính:** mở giỏ → đổi lượng/xóa dòng → server kiểm lại biến thể/giá/tồn → tính tổng để tiếp tục checkout.
- **Nhánh / ngoại lệ:** giỏ rỗng; hàng vừa hết/ẩn/đổi giá cảnh báo trước mua; đăng nhập hợp nhất theo quy tắc hiện hữu, không truy cập giỏ người khác.
- **Hậu điều kiện:** giỏ lưu đúng biến thể/ảnh màu, không tạo đơn/ledger; tổng cuối cùng vẫn do checkout xác minh.

### UC09 — Đặt hàng

- **Actor:** G/C. **Yêu cầu/rule:** FR-006; BR-005, BR-011–BR-014. **Tiền điều kiện:** giỏ hợp lệ, địa chỉ VN và COD; key checkout gắn cart/payload.
- **Luồng chính:** nhập/chọn địa chỉ → áp tối đa một voucher → xem tiền hàng/giảm/phí/tổng → xác nhận → transaction kiểm tồn/voucher, tạo snapshot order/items/payment/history, trừ tồn/movement, audit và xóa giỏ → trả mã đơn/quyền xem.
- **Nhánh / ngoại lệ:** voucher hết hạn/hết lượt, giá hoặc tồn thay đổi thì không commit sai; tranh đơn vị tồn/lượt cuối chỉ giao dịch hợp lệ commit; retry cùng key không tạo đơn thứ hai; địa chỉ ngoài VN/phương thức khác bị từ chối.
- **Hậu điều kiện:** đơn PENDING, Payment/Order UNPAID, tổng VND khớp, không tồn âm; rollback giữ giỏ và không giảm lượt/tồn dở dang.

### UC10 — Thanh toán và COD

- **Actor:** A; C chỉ xem trạng thái đơn mình. **Yêu cầu/rule:** FR-010; BR-004, BR-020–BR-022. **Tiền điều kiện:** đơn COD đã giao, có bằng chứng thu phù hợp; hồ sơ có Shipment dùng ledger shipment, đơn cũ dùng đường thu legacy được guard.
- **Luồng chính:** A nhập thực thu/chứng từ/ngày → server xác minh nghĩa vụ và ghi collection/audit → cập nhật thanh toán theo tiền thu; xem riêng remittance và đối soát ở UC28.
- **Nhánh / ngoại lệ:** thu thiếu chưa PAID; thu vượt giữ lệch/DISPUTED; S hoặc payload ép PAID không được ghi; giao thành công một mình không đổi payment.
- **Hậu điều kiện:** chỉ có bản ghi thu local đã commit; không chuyển tiền thật, không coi PAID là đã đối soát hoặc ngân hàng xác nhận.

### UC11 — Theo dõi đơn hàng

- **Actor:** C có phiên sở hữu đơn; S/A theo quyền; G chỉ capability đúng đơn guest cũ userId=null hoặc tra cứu tối thiểu mã + điện thoại. **Yêu cầu/rule:** FR-007; BR-003, BR-018. **Tiền điều kiện:** có bằng chứng truy cập hợp lệ.
- **Luồng chính:** mở đơn/nhập tra cứu → với đơn có userId kiểm phiên chủ/staff; chỉ đơn guest cũ userId=null mới dùng capability → trả trạng thái/lịch sử theo allowlist; mã–điện thoại chỉ cho tra cứu tối thiểu.
- **Nhánh / ngoại lệ:** cookie hn_order/accessToken còn lại sau logout/reset/khóa không cấp quyền đọc/hủy đơn gắn tài khoản; sai mã/điện thoại, chủ khác hoặc hết capability không trả dữ liệu riêng; chưa shipment không dựng timeline hãng.
- **Hậu điều kiện:** chỉ đọc allowlist, không lộ địa chỉ đầy đủ ở public lookup/chứng từ/actor tài chính/token.

### UC12 — Hủy đơn hàng

- **Actor:** C/G có quyền đơn; S/A theo quyền vận hành. **Yêu cầu/rule:** FR-007; BR-015, BR-016, BR-019. **Tiền điều kiện:** UNPAID và trạng thái cho phép; có lý do, kiện chưa bàn giao hoặc đã xác nhận quay về.
- **Luồng chính:** yêu cầu hủy toàn đơn → kiểm state/CAS và shipment; nếu RETURNED kiểm đủ mọi dòng qua returnedItems (sellableQuantity + damagedQuantity = quantity dòng) → CANCELLED, hoàn tồn/voucher một lần, history/audit cùng transaction.
- **Nhánh / ngoại lệ:** khách chỉ PENDING/CONFIRMED; vận hành thêm PROCESSING/RETURNED theo guard. RETURNED thiếu/trùng/sai dòng, lượng âm/sai tổng không được hủy; chỉ lượng bán được hoàn tồn, lượng hỏng không cộng tồn bán. PAID/đang giao/hủy một phần bị chặn; retry CANCELLED no-op.
- **Hậu điều kiện:** không tăng tồn/lượt hai lần, không sửa khoản tiền kiện đang giao, giữ lịch sử.

### UC13 — Xem và tiếp nhận đơn mới

- **Actor:** S/A. **Yêu cầu/rule:** FR-007; BR-004, BR-015. **Tiền điều kiện:** có orders.read/manage phù hợp.
- **Luồng chính:** lọc trạng thái/ngày/tìm mã → mở snapshot → phân công và ưu tiên → chuyển xử lý theo UC14.
- **Nhánh / ngoại lệ:** danh sách rỗng; assignee/priority sai bị chặn; cạnh tranh cập nhật phải đọc trạng thái mới.
- **Hậu điều kiện:** phân công/ưu tiên có audit, không tự thay tiền/tồn/payment hoặc mở thêm vai trò HR.

### UC14 — Xác nhận đơn hàng

- **Actor:** S/A. **Yêu cầu/rule:** FR-007; BR-013, BR-015. **Tiền điều kiện:** PENDING và snapshot checkout đã trừ tồn.
- **Luồng chính:** đối chiếu thông tin đã chốt → xác nhận CONFIRMED → chuẩn bị PROCESSING, hoặc từ chối bằng hủy hợp lệ có lý do.
- **Nhánh / ngoại lệ:** state đã thay đổi bị CAS chặn; đơn mua đơn vị tồn cuối vẫn xác nhận được, không kiểm lại như chưa xuất kho.
- **Hậu điều kiện:** history/audit mới, không trừ tồn lần hai và không tự PAID.

### UC15 — Đóng gói sản phẩm

- **Actor:** S/A. **Yêu cầu/rule:** FR-008; BR-017. **Tiền điều kiện:** đơn trong giai đoạn chuẩn bị, dòng hàng snapshot hợp lệ.
- **Luồng chính:** đối chiếu từng SKU/màu/size/lượng → xác nhận checklist → lưu packedAt/packedBy → được phép tạo/bàn giao shipment.
- **Nhánh / ngoại lệ:** sai/thiếu dòng hoặc lượng tạo hold/chặn bàn giao; sửa lỗi rồi đối chiếu lại, không giả PACKED enum.
- **Hậu điều kiện:** vẫn PROCESSING, có bằng chứng đóng gói; thiếu packedAt/đang hold không đi UC16.

### UC16 — Cập nhật giao hàng

- **Actor:** S/A; C/G xem phần cho phép. **Yêu cầu/rule:** FR-009; BR-017–BR-020. **Tiền điều kiện:** đóng gói hợp lệ, một shipment gốc/đơn và payment COD đúng.
- **Luồng chính:** tạo hồ sơ LOCAL_MANUAL → READY_FOR_PICKUP → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED; lưu event và đồng bộ Order trong transaction.
- **Nhánh / ngoại lệ:** DELIVERY_FAILED có reason/attempt → giao lại hoặc RETURNING→RETURNED; hủy trước bàn giao theo guard; cạnh không hợp lệ hoặc dùng endpoint đơn để bỏ qua shipment bị chặn.
- **Hậu điều kiện:** timeline phản ánh event đã nhập, mã HN-SHIP-* chỉ nội bộ; giao xong không PAID, RETURNED không tự cộng tồn.

## Kho, hỗ trợ và quản trị

### UC17 — Kiểm tra, nhập và xuất kho

- **Actor:** S/A. **Yêu cầu/rule:** FR-011; BR-028. **Tiền điều kiện:** SKU có thật, lượng/ngày/nhà cung cấp/lý do phù hợp nghiệp vụ.
- **Luồng chính:** xem tồn → chọn nhập/xuất/điều chỉnh → xác nhận delta → ghi stock, movement và audit atomic.
- **Nhánh / ngoại lệ:** xuất quá tồn, số âm/sai ngày hoặc key trùng khác nội dung bị chặn; retry đúng không nhân movement.
- **Hậu điều kiện:** số dư không âm và truy vết delta; không sửa lịch sử đơn để cân tồn.

### UC18 — Đánh giá và hỗ trợ khách hàng

- **Actor:** C gửi; S/A phản hồi/kiểm duyệt theo quyền. **Yêu cầu/rule:** FR-012; BR-003, BR-030. **Tiền điều kiện:** đánh giá cần mua/giao hợp lệ; inquiry/reply phải đúng chủ và quyền.
- **Luồng chính:** khách gửi đánh giá/inquiry → server liên kết user/đơn → nhân viên đọc/trả lời hoặc ẩn/hiện có lý do → khách đọc phản hồi.
- **Nhánh / ngoại lệ:** chưa mua/chưa giao, chèn userId, xem thread người khác hoặc nội dung sai bị từ chối; email nhập không cấp quyền sở hữu.
- **Hậu điều kiện:** phản hồi gắn đúng thread, kiểm duyệt có lịch sử; không cam kết chat realtime ngoài hệ thống.

### UC19 — Quản lý người dùng

- **Actor:** A. **Yêu cầu/rule:** FR-013; BR-001, BR-002, BR-004. **Tiền điều kiện:** accounts.manage, target hợp lệ.
- **Luồng chính:** tìm tài khoản → xem thông tin được phép → cập nhật/khóa/mở theo validation → audit/thu hồi phiên khi thay quyền/trạng thái.
- **Nhánh / ngoại lệ:** trùng định danh, tự khóa, ADMIN cuối hoặc S gọi trực tiếp bị từ chối; không trả passwordHash/token.
- **Hậu điều kiện:** tài khoản/dữ liệu kinh doanh được giữ, không reset mật khẩu để demo.

### UC20 — Quản lý nhân viên và phân quyền

- **Actor:** A. **Yêu cầu/rule:** FR-013; BR-001, BR-002, BR-004. **Tiền điều kiện:** quyền quản lý/assign và còn ADMIN hoạt động.
- **Luồng chính:** tạo/sửa tài khoản S/A → chọn một trong ba role chuẩn theo module → lưu/tăng permissionVersion/thu hồi phiên → đăng nhập lại với quyền mới.
- **Nhánh / ngoại lệ:** role lạ, tự đổi role, mất ADMIN cuối, phiên cũ hoặc actor S bị chặn.
- **Hậu điều kiện:** quyền UI/API/service thống nhất, không alias role hoặc quyền tài chính ngầm cho S; audit giữ before/after an toàn.

### UC21 — Quản lý sản phẩm

- **Actor:** S/A theo quyền; cost tài chính chỉ A. **Yêu cầu/rule:** FR-014; BR-005, BR-007–BR-010. **Tiền điều kiện:** quyền sản phẩm, SKU/slug và liên kết hợp lệ.
- **Luồng chính:** tạo/sửa nháp → nội dung/giá/biến thể/màu/ảnh/size/phối → kiểm readiness → lưu/ẩn/công bố theo mode và quyền.
- **Nhánh / ngoại lệ:** thiếu ảnh/giá/tồn xác minh giữ cảnh báo; file sai bị từ chối trước gắn catalog; SKU trùng/reference đang dùng chặn xóa phá lịch sử.
- **Hậu điều kiện:** giữ ID/SKU và snapshot cũ, audit cùng ghi DB; không tự đặt giá hoặc nâng READY để đạt demo.

### UC22 — Quản lý danh mục

- **Actor:** S/A theo quyền sản phẩm. **Yêu cầu/rule:** FR-015; BR-007. **Tiền điều kiện:** cây danh mục/bộ sưu tập và slug hợp lệ.
- **Luồng chính:** thêm/sửa/thứ tự/active danh mục, liên kết bộ sưu tập → kiểm quan hệ → lưu/audit → storefront phản ánh.
- **Nhánh / ngoại lệ:** vòng lặp cây, parent sai, slug trùng hoặc xóa còn tham chiếu bị chặn/ẩn theo guard.
- **Hậu điều kiện:** không orphan hàng hoặc mất order reference, filter có cấu trúc nhất quán.

### UC23 — Quản lý khuyến mãi

- **Actor:** A. **Yêu cầu/rule:** FR-016; BR-011, BR-012. **Tiền điều kiện:** promotions.manage/content.manage phù hợp, input toàn form hợp lệ.
- **Luồng chính:** tạo/sửa FIXED/PERCENT, khoảng hiệu lực/lượt/min/max hoặc cấu hình phí/banner → lưu/audit → checkout mới áp cấu hình.
- **Nhánh / ngoại lệ:** start>end, limit<used, giá trị sai hoặc S gọi API bị chặn; đúng mốc hết hạn VN được xử lý theo policy.
- **Hậu điều kiện:** không chồng mã hoặc tự sáng tạo loại mới, đơn cũ giữ tiền đã chốt.

### UC24 — Quản lý đơn hàng

- **Actor:** S/A. **Yêu cầu/rule:** FR-007, FR-008; BR-013, BR-015–BR-019. **Tiền điều kiện:** quyền orders theo thao tác, state hiện tại hợp lệ.
- **Luồng chính:** tìm/xem/ưu tiên/phân công → UC14 xác nhận → UC15 đóng gói → UC16 giao nhận; xem lịch sử hoặc UC12 hủy khi đủ điều kiện.
- **Nhánh / ngoại lệ:** mutation cạnh tranh, sai state, thiếu packedAt, đã thu hoặc đang giao không được bỏ guard; S không xác nhận tiền.
- **Hậu điều kiện:** điều phối các UC con, không tạo máy trạng thái/luật tiền thứ hai.

### UC25 — Báo cáo thống kê

- **Actor:** A; S chỉ phân tích sản phẩm/tồn được cấp. **Yêu cầu/rule:** FR-017; BR-031–BR-033. **Tiền điều kiện:** analytics permission đúng loại và khoảng/filter hợp lệ.
- **Luồng chính:** chọn báo cáo/filter → aggregate dữ liệu thật → xem KPI/chart/định nghĩa/coverage → export nếu có quyền, cùng scope/filter và audit.
- **Nhánh / ngoại lệ:** rỗng không bịa số; thiếu cost hiển thị NULL/độ phủ; S không đọc hoặc export finance/profit; dữ liệu chứa ký tự formula được xuất text an toàn.
- **Hậu điều kiện:** UI/export cùng tập dữ liệu, không nhầm ngày đặt với ngày dòng tiền; tải về private/no-store.

## Hậu mãi, đối soát và vận hành

### UC26 — Đổi trả sản phẩm

- **Actor:** C gửi; A duyệt/nhận/kiểm/đổi; S chỉ đọc hỗ trợ. **Yêu cầu/rule:** FR-018; BR-023–BR-026. **Tiền điều kiện:** đơn C sở hữu đã giao, trong đủ 72 giờ, dòng/lượng chưa claim, lý do lỗi; ảnh tùy chọn.
- **Luồng chính:** C chọn dòng/lượng/lỗi/phương án → snapshot deadline/policy và REQUESTED → A xác minh UNDER_REVIEW/APPROVED → nhận RECEIVED → kiểm mọi dòng → INSPECTED → phân bổ SKU thay thế cùng giá hoặc UC27 refund → hoàn tất theo kết quả.
- **Nhánh / ngoại lệ:** đúng deadline chấp nhận, muộn/thiếu mốc/sở thích/khác chủ/quá lượng bị chặn; REVIEW chờ thêm, DAMAGED không cộng tồn, REJECTED dẫn kết quả kiểm thất bại; SKU khác giá bị chặn.
- **Hậu điều kiện:** giữ đơn/kiện gốc, SELLABLE hoàn tồn đúng một lần, replacement riêng có stock guard; lịch sử và ảnh lỗi riêng tư.

### UC27 — Hoàn tiền

- **Actor:** A duyệt và thực hiện theo quyền riêng; C xem số/trạng thái được phép. **Yêu cầu/rule:** FR-019; BR-004, BR-027. **Tiền điều kiện:** hồ sơ refund đã kiểm đủ điều kiện và còn trần thực thu.
- **Luồng chính:** server tính tiền snapshot sau discount và lượng hợp lệ → tạo PENDING → duyệt → thực hiện mô phỏng → SIMULATED_COMPLETED → return hoàn tất.
- **Nhánh / ngoại lệ:** chưa thu/không đủ trần, client tự gửi số tiền, S gọi, thực hiện khi chưa duyệt hoặc retry khác nội dung bị từ chối; từ chối/hủy giữ ledger/history.
- **Hậu điều kiện:** không hoàn vượt thu/claim, không chuyển tiền thật, không ghi đè COD hoặc OrderItem; không khẳng định hai người khác nhau là bắt buộc.

### UC28 — Đối soát COD

- **Actor:** A. **Yêu cầu/rule:** FR-010; BR-020–BR-022. **Tiền điều kiện:** Shipment/Payment khớp, collection/remittance có chứng từ hợp lệ.
- **Luồng chính:** xem expected/collected/remitted/outstanding → ghi chuyển về từng khoản → đối chiếu → RECONCILED nếu DELIVERED và ba số bằng nhau.
- **Nhánh / ngoại lệ:** thu/chuyển lệch giữ DISPUTED; mở dispute trước sửa hồ sơ đã đối soát; correction có dấu trỏ gốc, không sửa/xóa gốc; ngày tương lai/trước đơn hoặc trùng reference sai payload bị chặn.
- **Hậu điều kiện:** kết luận lưu snapshot/actor/time/audit; PAID không đồng nghĩa RECONCILED và mọi tiền vẫn là ghi nhận local.

### UC29 — Kiểm kê và xử lý chênh lệch kho

- **Actor:** S/A theo quyền tồn. **Yêu cầu/rule:** FR-020; BR-028, BR-029. **Tiền điều kiện:** phiếu nháp, SKU hợp lệ; snapshot sổ tại thời điểm kiểm.
- **Luồng chính:** tạo DRAFT → nhập countedStock/damagedStock/notes → SUBMITTED → đối chiếu snapshot → APPROVED, delta/movement/audit atomic hoặc CANCELLED hợp lệ.
- **Nhánh / ngoại lệ:** có giao dịch mới đổi tồn giữa gửi/duyệt thì chặn và kiểm đếm lại; hàng hỏng không cộng vào tồn bán; duyệt lặp không nhân delta.
- **Hậu điều kiện:** chênh lệch có nguồn gốc, không ghi đè số dư mới hoặc sửa ledger cũ.

### UC30 — Ngôn ngữ, khu vực và tiền tệ

- **Actor:** G/C; A quản trị cấu hình. **Yêu cầu/rule:** FR-021; BR-011. **Tiền điều kiện:** locale/currency trong danh sách hỗ trợ.
- **Luồng chính:** chọn VI/EN/vùng/tiền hiển thị → lưu preference theo cơ chế hiện hữu → render bản dịch/định dạng, giữ ngữ cảnh mua.
- **Nhánh / ngoại lệ:** giá quy đổi là tham khảo local; ngoài VN không checkout; giá trị không hỗ trợ không đổi tiền giao dịch.
- **Hậu điều kiện:** Order/Payment/ledger luôn VND nguyên; không xuất dữ liệu size hoặc thông tin đăng nhập lên URL.

### UC31 — Nhật ký và kiểm soát vận hành

- **Actor:** A đọc audit/backup vận hành máy; S chỉ mutation được cấp tạo audit server. **Yêu cầu/rule:** FR-022; BR-006, BR-034, BR-035. **Tiền điều kiện:** quyền phù hợp, backup đích riêng không phải DB đang dùng.
- **Luồng chính:** mutation quan trọng ghi audit cùng transaction → A lọc/xem; vận hành backup SQLite online → restore vào file thử → kiểm integrity/FK/count/hash.
- **Nhánh / ngoại lệ:** lỗi audit rollback mutation; export cũng audit; restore lỗi không đè nguồn; log không raw body/secret, không API xóa lịch sử.
- **Hậu điều kiện:** có thể truy vết thay đổi và phục hồi đã kiểm ở file riêng; không công bố backup/credential, không dùng report lịch sử để đánh dấu phiên bản mới PASS.
