# Sao lưu và phục hồi SQLite local

`npm run db:backup` gọi `scripts/local-backup.py`; mặc định nguồn `prisma/dev.db`, đích backup local trong `verification`. Dùng SQLite online Connection.backup để giữ nhất quán cả WAL, không copy sống bằng cp. Tạo file timestamp độc nhất với O_EXCL/mode0600, không đè hoặc tự xóa backup cũ.

Sau backup, kiểm integrity_check=ok và foreign_key_check rỗng; đếm và tính SHA256 nội dung mọi bảng theo luồng, không chỉ so số lượng hoặc tải toàn DB vào RAM. Phục hồi qua backup API vào **file restore-check riêng**, bật FK và đối chiếu integrity/FK/count/hash toàn bộ bảng, gồm user/order/inventory/COD/returns/audit. Sai lệch phải báo lỗi; không restore lên DB đang chạy.

Nguồn tùy chọn: `python3 scripts/local-backup.py --source prisma/business-tests-<timestamp>.db`. Script phải từ chối nguồn không tồn tại thay vì tạo DB rỗng. Không đặt credential/nội dung record lên stdout; báo cáo chỉ chứa kết quả tổng hợp. Backup chứa dữ liệu riêng tư và hash, chỉ giữ local.

Để kiểm tra phục hồi, mở bản restore-check độc lập ở chế độ read-only. Nếu cần chuyển ứng dụng sang DB phục hồi, dừng server, sao lưu trạng thái mới nhất và chủ động chọn DATABASE_URL local riêng. Không migrate reset, db push --force-reset hoặc ghi đè DB hiện hữu. Không có retention tự động.

Quy trình này là yêu cầu vận hành, không khẳng định backup phiên bản hiện hành đã được chạy. Xem [báo cáo kiểm chứng](business-acceptance-report.md).
