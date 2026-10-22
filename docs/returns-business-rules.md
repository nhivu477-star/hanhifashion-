# quy tắc đổi trả local

Ngày yêu cầu: 18/10/2026. Chỉ LOCAL E-COMMERCE DEMO. Tham chiếu chính: PROJECT_SPEC.md và business-acceptance-report.md. Không tích hợp carrier, thanh toán, ngân hàng hoặc dịch vụ production; không deploy/push.

## Chính sách và điều kiện

- Chủ dự án đã xác nhận **đủ 72 giờ từ thời điểm nhận hàng**, bao gồm đúng mốc cuối. Chính sách trước đó chỉ nói “03 ngày”, chưa có hàm tính ngày. Không áp dụng hết ngày lịch. `src/lib/content.ts` được làm rõ đúng câu này; các điều kiện khác giữ nguyên.
- Mốc nhận: ShipmentEvent DELIVERED đầu tiên của kiện gốc; đơn cũ chưa có kiện dùng OrderStatusHistory DELIVERED đầu tiên. Đơn phải DELIVERED/COMPLETED và kiện nếu có phải DELIVERED. Không dùng ngày đặt/cập nhật đơn.
- Mốc nhận và deadline được snapshot vào ReturnRequest với `DEFECT_72H_V1_2026-10-18`. Đơn thiếu mốc/quá hạn bị chặn ở API tự phục vụ, hướng dẫn liên hệ để xét riêng; không giả mốc và chưa mở API ngoại lệ tự gia hạn.
- RET-001: chỉ tài khoản CUSTOMER đăng nhập, đúng userId đơn. Guest capability hoặc code+phone không đủ để gửi/xem hồ sơ đổi trả. ADMIN xử lý qua admin module; SELLER không được duyệt, kiểm hàng, phân bổ tồn hoặc hoàn tiền.
- Yêu cầu phải có dòng OrderItem thuộc đơn, số nguyên dương, không lặp dòng, lý do lỗi tối thiểu 10 ký tự, phương án REFUND hoặc EXCHANGE và loại DEFECT. Phương án mong muốn không tự chứng minh lỗi: ADMIN phải xác minh và thống nhất với khách trước duyệt.
- Giữ chính sách không đổi size/màu/mẫu vì sở thích. Size khác chỉ được hỗ trợ là phương án khắc phục lỗi đã xác minh và thống nhất.
- Tổng số lượng hồ sơ chưa giải phóng không vượt số mua. Từ chối trước nhận hàng giải phóng lượng đã giữ; hồ sơ đã nhận/đã xử lý không giải phóng để gửi lại cùng hàng. Event key unique + hash payload bảo đảm retry cùng nội dung trả lại cùng ID, khác nội dung bị chặn. Transaction SQLite và retry ngăn hai hồ sơ đồng thời chiếm quá số mua.

## Kiểm hàng và tồn kho

Nhận hàng chỉ chuyển RECEIVED; không cộng stock. Inspection lưu actor/time/condition/notes/evidence; REVIEW giữ chờ kiểm thêm, SELLABLE cộng tồn đúng quantity một lần, DAMAGED cách ly không cộng tồn, REJECTED không cộng tồn và không cho đổi/hoàn tự động. Khi mọi dòng có kết luận cuối, chuyển INSPECTED hoặc INSPECTION_FAILED.

Kết luận cuối không được ghi đè. Retry chính xác là no-op; nội dung khác bị chặn. Các inspection REVIEW trước đó giữ lịch sử. Mọi movement và audit nằm cùng transaction. Không gọi CANCELLED của đơn đã PAID để xử lý hàng khách trả.

## Quyền và dữ liệu riêng tư

- API mutation dùng origin check sẵn có, kiểm quyền ở route và service. Client không gửi giá trị hoàn/giá lịch sử hoặc stock; schema strict chặn trường tài chính chèn thêm.
- Khách chỉ đọc allowlist: trạng thái, sản phẩm trả, hàng thay thế, lịch sử trao đổi, số hoàn và nhãn mô phỏng. Không đưa inspector/evidence nội bộ, actor tài chính hay COD proof vào dữ liệu khách.
- Ảnh lỗi không bắt buộc: tối đa 3 ảnh JPEG/PNG/WebP, 2MB đầu vào/ảnh, giới hạn 12 triệu pixel; decode/re-encode JPEG 1600px bỏ metadata. Lưu base64 trong bảng riêng, không public upload. Endpoint ảnh kiểm ADMIN hoặc chủ hồ sơ, no-store, nosniff; không chấp nhận SVG/URL bên ngoài.
- Ghi chú chuyển trạng thái được thể hiện trong lịch sử khách; form admin ghi rõ. Bằng chứng kiểm hàng và AuditLog chỉ ở admin.
- Audit ghi mọi tạo hồ sơ/quyết định/kiểm hàng/đổi trạng thái kiện/hoàn tiền cùng transaction. Retry không tạo lần ghi tài chính/tồn mới.

## Database

Migration `20261018235000_returns_mock_refunds`: chỉ CREATE TABLE/INDEX và FK Restrict, thêm 7 bảng ReturnRequest, ReturnItem, ReturnEvidence, ReturnInspection, ReturnHistory, ExchangeItem, MockRefund. Các field relation ngược thêm ở Prisma không sửa cột DB cũ. Unique eventKey/reference, request-item, exchange-item và refund-request. Index status/time, user/time và order/status.

Backup `verification/backups/before-nghiệp vụ.db`. Đối chiếu toàn bộ cột/bản ghi 39 bảng cũ với dev.db sau migration; không reset/seed/backfill hàng hoặc tiền giả. QA chạy database timestamp riêng.
