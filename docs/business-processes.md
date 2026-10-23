# Quy trình nghiệp vụ

[BRD](business-requirements.md) · [Use cases](use-cases.md) · [Rules](business-rules.md) · [ERD](data-model.md)

Mermaid dưới đây mô tả **trình tự, quyết định và người chịu trách nhiệm**, không phải bằng chứng các bước đã chạy. Toàn bộ giao nhận/tiền là local/manual/mô phỏng. Tên trạng thái trong sơ đồ là giá trị hiện hữu; hình thoi là quyết định, không phải enum mới.

## BP-01 — Từ lựa chọn hàng đến giao hàng

UC04–UC09, UC13–UC16, UC24; FR-003–FR-009; BR-008, BR-011–BR-018.

```mermaid
flowchart TD
  subgraph Buyer[Guest hoặc CUSTOMER]
    Browse[Xem và lọc sản phẩm] --> Select[Chọn đúng màu - size - lượng]
    Select --> Cart[Giỏ đúng biến thể]
    Cart --> Form[Địa chỉ VN - COD - tối đa một voucher]
    Form --> Submit[Xác nhận checkout với key]
  end
  subgraph Server[Xử lý server]
    Submit --> Valid{Giá - tồn - voucher - key hợp lệ?}
    Valid -->|Không| Reject[Báo lỗi - không commit nửa nghiệp vụ]
    Reject --> Cart
    Valid -->|Có| Commit[Transaction: snapshot đơn và payment UNPAID - trừ tồn - movement - voucher - audit - xóa giỏ]
    Commit --> Pending[PENDING]
  end
  subgraph Operations[SELLER hoặc ADMIN]
    Pending --> Confirm[CONFIRMED - không trừ tồn lại]
    Confirm --> Processing[PROCESSING]
    Processing --> Pack{Checklist SKU - màu - size - lượng đúng?}
    Pack -->|Không| Hold[packing hold - chưa bàn giao]
    Hold --> Pack
    Pack -->|Có| Packed[packedAt và packedBy]
    Packed --> Shipment[Tạo một Shipment LOCAL_MANUAL]
    Shipment --> Pickup[READY_FOR_PICKUP rồi PICKED_UP]
    Pickup --> Transit[IN_TRANSIT rồi OUT_FOR_DELIVERY]
    Transit --> Delivered[DELIVERED - payment vẫn độc lập]
  end
  Delivered --> COD[BP-03: thu và đối soát COD]
  Delivered --> AfterSales[BP-04: lỗi hàng trong 72 giờ]
```

Cạnh tranh đơn vị tồn/lượt voucher cuối chỉ một transaction hợp lệ commit; retry cùng key/payload trả kết quả đã tạo, không chạy lại side effect. Chọn hàng/giỏ không tạo reservation. Mốc đóng gói không được bịa cho lịch sử cũ. [Máy trạng thái đơn](order-state-machine.md) và [kiện](shipping-state-machine.md) là chi tiết đầy đủ.

## BP-02 — Giao thất bại, hàng quay về và hủy

UC12, UC16, UC24; FR-007–FR-009, FR-011; BR-015, BR-016, BR-019.

```mermaid
flowchart TD
  Failure[SELLER hoặc ADMIN ghi DELIVERY_FAILED với reason và attempt] --> Decision{Phương án thực tế?}
  Decision -->|Giao lại| Retry[OUT_FOR_DELIVERY - đơn SHIPPING]
  Retry --> Outcome{Kết quả nhập?}
  Outcome -->|Giao được| Done[DELIVERED - không tự PAID]
  Outcome -->|Thất bại| Failure
  Decision -->|Chuyển hoàn| Returning[RETURNING - chưa hoàn tồn]
  Returning --> Returned[RETURNED - xác nhận hàng đã về]
  Returned --> Inspect[Kiểm từng OrderItem: sellableQuantity và damagedQuantity]
  Inspect --> Complete{Đủ mọi dòng đúng một lần - tổng bằng lượng dòng - không âm?}
  Complete -->|Không| Block[Chặn hủy - không thay tồn]
  Complete -->|Có| Unpaid{Đơn UNPAID và có lý do?}
  Unpaid -->|Không| Financial[Không hủy PAID - dùng hậu mãi hợp lệ]
  Unpaid -->|Có| Cancel[Transaction CANCELLED - chỉ hoàn tồn lượng bán được - audit kiểm hàng và history]
  Cancel --> Repeat[Retry hủy không hoàn tồn lần hai]
```

Kiểm hàng chuyển hoàn là nghiệp vụ đơn chưa giao thành công, ghi dữ liệu kiểm trong audit vận hành và lịch sử trạng thái. **Không phải** ReturnInspection của khách trả hàng sau giao. Payload `returnedItems` chứa `{orderItemId, sellableQuantity, damagedQuantity}` cho đúng tất cả dòng; hàng hỏng không cộng vào tồn bán. Hủy bình thường trước bàn giao không yêu cầu kiểm chuyển hoàn và hoàn đúng tồn đã xuất. Hủy một phần vẫn bị khóa chính sách.

## BP-03 — Thu, chuyển về và đối soát COD

UC10, UC28; FR-010; BR-004, BR-020–BR-022.

```mermaid
flowchart TD
  Delivery[Kiện DELIVERED - không tự PAID] --> Collect[ADMIN nhập CODCollection với chứng từ và ngày]
  Collect --> Paid{Đã thu đủ nghĩa vụ?}
  Paid -->|Chưa| Unpaid[Payment UNPAID - còn thiếu khách]
  Paid -->|Đủ hoặc vượt| CustomerPaid[Payment PAID - chưa đồng nghĩa đối soát]
  Unpaid --> More[Điều tra hoặc bổ sung bản ghi thu]
  More --> Collect
  CustomerPaid --> Remit[ADMIN ghi CODRemittance từng khoản chuyển về]
  Remit --> Reconcile{DELIVERED và expected = collected = remitted?}
  Reconcile -->|Có| Matched[RECONCILED - lưu snapshot kết luận]
  Reconcile -->|Không| Dispute[DISPUTED - giữ lệch và lý do]
  Dispute --> Correct[Correction liên kết gốc hoặc bổ sung có bằng chứng]
  Correct --> Remit
  Matched --> NeedChange{Phát hiện sai sau đối soát?}
  NeedChange -->|Có| Reopen[Mở dispute trước ghi tiền tiếp]
  Reopen --> Dispute
```

Số dư `outstandingCOD = max(collectedCOD − remittedCOD, 0)`. Thu vượt, thu thiếu hoặc chuyển vượt không được che bằng ép số tổng. Correction là bản ghi mới có dấu, không sửa/xóa chứng từ gốc; tổng không âm và không làm vượt trần hoàn đã giữ/hoàn. Phí giao thực tế không tự khấu trừ COD. [Chi tiết COD](cod-reconciliation.md).

## BP-04 — Đổi trả lỗi và hoàn mô phỏng

UC26, UC27; FR-018, FR-019; BR-023–BR-027.

```mermaid
flowchart TD
  Request[CUSTOMER chọn dòng - lượng - lý do lỗi - phương án] --> Eligible{Đúng chủ - còn lượng claim - có mốc giao - trong đủ 72 giờ?}
  Eligible -->|Không| Deny[Chặn tự phục vụ - không giả deadline]
  Eligible -->|Có| Snapshot[REQUESTED - snapshot mốc giao đầu tiên và policy]
  Snapshot --> Review[ADMIN UNDER_REVIEW xác minh lỗi]
  Review --> Defect{Lỗi được xác minh và phương án thống nhất?}
  Defect -->|Không| Reject[REJECTED - giải phóng lượng nếu chưa nhận]
  Defect -->|Có| Approve[APPROVED - chờ gửi nhận]
  Approve --> Receive[RECEIVED - chưa cộng tồn]
  Receive --> Inspect[ADMIN kiểm từng dòng]
  Inspect --> Result{Kết luận?}
  Result -->|REVIEW| Inspect
  Result -->|REJECTED| InspectionFailed[INSPECTION_FAILED rồi CLOSED có lý do]
  Result -->|SELLABLE| Restock[Hoàn tồn đúng một lần]
  Result -->|DAMAGED| Quarantine[Cách ly - không cộng tồn bán]
  Restock --> Inspected{Mọi dòng có kết luận đạt?}
  Quarantine --> Inspected
  Inspected --> Resolution{Phương án đã thống nhất?}
  Resolution -->|EXCHANGE| Price{SKU thay thế cùng đơn giá lịch sử và đủ tồn?}
  Price -->|Không| NoExchange[Chặn phân bổ - không bù chênh giá]
  Price -->|Có| Exchange[Trừ tồn thay thế atomic - EXCHANGE_PENDING]
  Exchange --> ExchangeDelivered[Mọi hàng thay thế DELIVERED]
  Resolution -->|REFUND| Limit{Còn trần thực thu và tiền snapshot hợp lệ?}
  Limit -->|Không| NoRefund[Chặn hoàn - không tự ghi tiền thu]
  Limit -->|Có| Refund[MockRefund PENDING rồi APPROVED]
  Refund --> Simulated[Quyền execute: SIMULATED_COMPLETED]
  ExchangeDelivered --> Complete[ReturnRequest COMPLETED]
  Simulated --> Complete
```

Deadline bao gồm đúng mốc `deliveredAt + 72 giờ`, không hết ngày lịch. Ảnh lỗi tùy chọn và riêng tư. Đổi/hoàn chỉ sau kết luận kiểm hàng theo guard; đơn/kiện gốc không đổi CANCELLED để xử lý hàng đã trả tiền. Kết quả cuối không ghi đè, retry không double stock/refund. S chỉ đọc hồ sơ hỗ trợ. [Return state machine](returns-state-machine.md) bổ sung các nhánh CLOSED và điều kiện cuối; [ledger](mock-refund-ledger.md) giải thích phân bổ tiền/phí giao.

## BP-05 — Kiểm kê kho

UC17, UC29; FR-011, FR-020; BR-028, BR-029.

```mermaid
flowchart LR
  Draft[SELLER hoặc ADMIN tạo DRAFT] --> Count[Snapshot bookStock - nhập countedStock bán được và damagedStock]
  Count --> Submit[SUBMITTED]
  Submit --> Current{Tồn hiện tại còn khớp snapshot?}
  Current -->|Không| Recount[Từ chối duyệt - kiểm đếm lại]
  Current -->|Có| Approve[APPROVED atomic: delta - movement - audit]
  Draft --> Cancel[CANCELLED theo guard]
  Submit --> Cancel
  Approve --> Read[Đọc lại số dư - retry không áp delta lần hai]
```

Phiếu không cho ghi đè giao dịch bán/nhập/xuất mới. Hàng hỏng được ghi riêng, không cộng vào countedStock bán được. Trạng thái cuối không mở lại để thay lịch sử.

## Sơ đồ liên kết kỹ thuật

[Bản đồ nghiệp vụ → UI → service → bảng (SVG)](diagrams/business-processes.svg) / [PNG](diagrams/business-processes.png) / [Mermaid](diagrams/business-processes.mmd) là **mapping kiến trúc**, không phải trình tự workflow. [ERD logic và đầy đủ](data-model.md) giải thích các quan hệ thực. Sơ đồ mapping/ERD sinh bởi [exporter](../scripts/export-business-diagrams.ts); các quyết định nghiệp vụ ở tài liệu này cần được duy trì cùng rules và test khi chính sách đổi.
