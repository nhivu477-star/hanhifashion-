# Chất lượng dữ liệu sản phẩm

Chạy `npm run data:quality` (read-only). Kết quả `verification/product-quality.json`, `media-audit.json`.

`src/lib/product-quality.ts` dùng dữ liệu thực: ID/name/slug/SKU, taxonomy, collection, copy/material/care, giá, publication, colors/variants/SKU/configuration/stock/override, ảnh/alt/order/media mapping/verification. INVALID ưu tiên trước INCOMPLETE, NEEDS REVIEW, READY. Collection thiếu chỉ review vì không phải thiết kế nào cũng bắt buộc có bộ sưu tập. Stock bằng 0 hợp lệ; available tách readiness. SKU toàn cục do unique SQLite và API bảo vệ. Không thay snapshot OrderItem.unitPrice.

Admin /admin/san-pham hiển thị chỉ báo cấu trúc + lý do trên mỗi trang 24 sản phẩm. Đây không phải kiểm tra file mỗi request; audit CLI kiểm bytes/files và phân loại bổ sung. READY dữ liệu không tự đổi commercial publicationStatus. Tiếp tục guard merchandise/approved product photography/verified inventory cũ khi mở bán thương mại.

Số lượng và phân loại phải lấy từ audit read-only mới trên DB hiện tại, không dùng thống kê cũ làm hiện trạng. Sản phẩm giá 0 cần chủ shop xác nhận, không tự đặt giá hay xóa. Asset DEVELOPMENT chỉ phục vụ preview, không chứng minh ảnh hàng đã duyệt. Asset PRODUCT/APPROVED gắn sai product/color là INVALID.

Thông tin chất liệu/care tham khảo không được chứng nhận đúng hàng. Cần ảnh được phép dùng, đối chiếu màu và kiểm tồn thực tế bằng người có trách nhiệm trước bán thật. Không nâng READY hàng loạt.
