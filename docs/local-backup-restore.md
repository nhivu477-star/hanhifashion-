# Sao lưu và phục hồi SQLite local

`npm run db:backup` gọi scripts/local-backup.py; mặc định nguồn prisma/dev.db, đích verification/backups. Không copy sống bằng cp. Python sqlite3 online Connection.backup đọc nhất quán kể cả WAL. File mới tên UTC timestamp microsecond, open O_EXCL mode0600 chống ghi đè; không tự xóa backup cũ.

Sau sao lưu: integrity_check=ok, foreign_key_check rỗng; duyệt từng bảng theo luồng để đếm và tính SHA256 toàn bộ nội dung (cả ledger/order/inventory/COD/return/users) mà không tải toàn bảng vào RAM. Restore bằng backup API sang file **restore-check-<timestamp>.db riêng**, bật FK, so lại integrity/FK/count/hash tất cả bảng; sai lệch báo lỗi kể cả khi Python chạy tối ưu hóa. Không restore lên DB đang dùng. JSON verification cạnh backup, stdout không chứa record hoặc credential.

Chạy nguồn test: `python3 scripts/local-backup.py --source prisma/phase1-orders-<timestamp>.db`. Đích chỉ trong verification; backup directory đã ignore. Script từ chối nguồn không tồn tại, không tạo DB rỗng thay nguồn.

Khôi phục để kiểm tra: dùng bản restore-check độc lập bằng SQLite read-only. Nếu sau này cần chuyển app sang bản phục hồi, dừng server, sao lưu DB hiện tại mới nhất và chủ động chọn DATABASE_URL local riêng; Phase5 không thực hiện thay active DB. Không dùng migrate reset/db push --force-reset. Không có retention tự động.

Kết quả thực thi main: verification/phase5-backup-restore.json. Kết quả trên DB có đơn/shipment/COD/claim: verification/phase5-test-backup.json. Cả hai kiểm toàn bộ nội dung, không chỉ số lượng. Backup chứa dữ liệu riêng tư; không đưa lên remote hoặc tài liệu công khai.
