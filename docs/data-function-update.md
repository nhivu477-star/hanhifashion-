# Dữ liệu tổng hợp và nguồn gốc nghiệp vụ

## Nguồn dữ liệu

Lô lịch sử tạo ngày 19/10/2026 đã được báo cáo gồm 1.000 đơn trong khoảng 01/01/2025–19/10/2026, 2.394 dòng hàng, 180 khách tổng hợp và 52 khoản hoàn. Đây là provenance của lô, **không phải thống kê DB hiện tại** hay giao dịch thật. Các phương thức COD/chuyển khoản/tiền mặt trong lịch sử là ghi nhận nội bộ; checkout vẫn dùng COD.

`SyntheticBatch` / `SyntheticRecord` đánh dấu nguồn gốc, liên kết đơn, khách và movement. Thanh toán/giao nhận/hoàn tiền truy qua đơn. Liên kết đa hình SyntheticRecord không phải khóa ngoại SQL; phải kiểm bằng công cụ nghiệp vụ. Khách tổng hợp dùng email `.test` và bị vô hiệu đăng nhập. Mã kiện HN-SHIP và provider LOCAL_MANUAL không đại diện hãng.

Lô phải tạo atomic, cùng mã lô không thêm lần nữa; phát lại lịch sử tồn không âm và không thay tồn cuối ngoài thay đổi được cho phép. Không tự sửa giá/ảnh/giá vốn hoặc snapshot cũ để tạo dữ liệu đẹp. Không seed/reset lại DB chính.

## Quy tắc diễn giải

Báo cáo cần phân biệt dữ liệu tổng hợp với giao dịch thật. Không coi trạng thái hoàn tất/đã trả trong dữ liệu là xác nhận chuyển tiền. Không suy ra conversion/attribution quá khứ nếu không thu event; giá vốn thiếu phải để thiếu. Giữ chính sách lỗi đủ 72 giờ theo mốc giao, kiểm hàng trước hoàn tồn.

Hợp đồng hiện hành về vai trò, dashboard, kho, giao nhận và quyền riêng tư nằm trong [PROJECT_SPEC](../PROJECT_SPEC.md), không trong lịch sử nhập dữ liệu. Trạng thái kiểm chứng tại [báo cáo hợp nhất](business-acceptance-report.md).

## Sơ đồ

- [Nghiệp vụ và chức năng — PNG](diagrams/business-processes.png) · [Mermaid](diagrams/business-processes.mmd)
- [Quan hệ SQL — PNG](diagrams/sql-relationships.png) · [Mermaid](diagrams/sql-relationships.mmd)

Sơ đồ hỗ trợ đọc mô hình, không thay schema/migration hiện hành. Dữ liệu mẫu, ảnh và tồn chưa phải bằng chứng đủ điều kiện mở bán thật.
