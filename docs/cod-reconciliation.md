# COD thu hộ và đối soát

## Kiến trúc
Giữ nguyên Payment của đơn làm nghĩa vụ thanh toán VND. Không thêm Payment cho mỗi sự kiện thu/chuyển. Shipment liên kết duy nhất orderId và paymentId; expectedCOD snapshot từ Payment.amount khi tạo, kiểm tra bằng order.total. CODCollection ghi tiền nhà vận chuyển đã thu từ khách; CODRemittance ghi tiền đã chuyển về; CODReconciliation là lịch sử kết luận đối soát riêng.

Tất cả là dữ liệu người quản trị nhập local, không có xác minh ngân hàng/hãng hay giao dịch thật. Provider duy nhất LOCAL_MANUAL. Reference tài chính là chứng từ người nhập, không sinh mã hãng giả. HN-SHIP-* là mã hồ sơ nội bộ; carrierReference giữ null khi chưa có hãng thật.

## Các số tiền
- expectedCOD: nghĩa vụ theo payment gốc, không tin số client.
- collectedCOD: tổng ledger thu (kể cả correction có dấu).
- remittedCOD: tổng ledger chuyển (kể cả correction).
- outstandingCOD = max(collectedCOD − remittedCOD, 0): hãng còn phải chuyển.
- Khách còn thiếu = max(expectedCOD − collectedCOD, 0).
- Thu khác kỳ vọng hoặc chuyển vượt thu: cảnh báo DISPUTED; không che số chênh lệch có dấu.
- Phí giao thực tế lưu riêng; nghiệp vụ đối chiếu số tiền COD gross, không tự trừ phí/khấu trừ vào tiền chuyển.

## Quy trình
1. Giao thành công vẫn UNPAID.
2. Admin nhập số thu, bằng chứng, mã chứng từ và ngày thu. Chưa đủ kỳ vọng thì UNPAID; đủ/vượt thì khách PAID, khoản vượt vẫn DISPUTED. Không có bằng chứng thì từ chối.
3. Admin nhập từng khoản chuyển. Thiếu thì PARTIALLY_REMITTED và còn phải chuyển; đủ thì REMITTED, chưa phải RECONCILED.
4. RECONCILE chỉ đạt RECONCILED khi kiện DELIVERED, collected == expected == remitted. Nếu lệch, tạo kết luận DISPUTED, giữ cảnh báo đến khi điều tra và đối soát lại khớp.
5. DISPUTE mở lại hồ sơ đã đối soát, lưu snapshot và lý do. Không xóa chứng từ.
6. Correction là record có dấu, correctsId trỏ bản gốc cùng kiện/kind, bắt buộc chứng từ và bằng chứng; không chỉnh sửa record gốc. Tổng không được âm. Có thể bổ sung thu thiếu hoặc chuyển thiếu bằng record mới. Sau RECONCILED khóa ghi tiền; phải mở điều tra trước.

## Chống trùng và quyền
Chỉ ADMIN được ghi thu/chuyển/đối soát/correction tài chính; SELLER có thể tạo/cập nhật giao nhận nhưng không ghi ledger COD. CUSTOMER/GUEST không có quyền quản trị. Tất cả mutation check origin. eventKey unique theo loại ledger, reference unique theo provider trong mỗi loại. Retry cùng key và cùng dữ liệu là no-op; khác payload bị từ chối. CAS version Shipment + transaction ngăn ghi tổng/đối soát đồng thời sai. Reconcile lặp không tạo kết luận hoàn tất lần hai.

Ledger có FK Shipment, correction có FK bản gốc. Mỗi record lưu actor/time/reference/evidence/provider. Mọi mutation có AuditLog cùng transaction. Không nhận id/payment/provider sai từ client để ghi chéo kiện. Bản ghi ngày trước ngày tạo đơn hoặc ở tương lai bị chặn.

## Báo cáo và quyền riêng tư
Payment PAID ở đơn có Shipment chỉ thể hiện khách đã trả đủ. Metric hiện có “Doanh thu đã thu” chỉ cộng tiền Shipment đã RECONCILED; đơn nghiệp vụ chưa có Shipment giữ cách tính cũ. Báo cáo theo ngày hiện có vẫn nhóm ngày tạo đơn, không tuyên bố là sổ kế toán thu tiền theo ngày.

Khách thấy provider, mã nội bộ, trạng thái, timeline và trạng thái thanh toán; API dùng allowlist không gửi amount/evidence/actor/notes đối soát. Không đưa evidence nội bộ vào lịch sử đơn khách. Tra cứu code+phone giữ quy tắc nghiệp vụ, chỉ thêm timeline công khai.

## Giới hạn
Không split shipment, carrier live, bù trừ phí, gộp remittance nhiều kiện, refund hay kế toán đầy đủ. Không giả vờ tạo vận đơn. Dữ liệu manual cần người vận hành chịu trách nhiệm kiểm tra bằng chứng.
