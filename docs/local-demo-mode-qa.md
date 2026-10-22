# Cập nhật chế độ local và QA

Ngày 18/10/2026. Yêu cầu mới thay thế Phase 2B; không tiếp tục tích hợp GHN. Không triển khai Phase 3 trong lần cập nhật này.

## Thay đổi

- PROJECT_SPEC.md bổ sung 10 ràng buộc thường trực ở đầu, ưu tiên hơn mọi yêu cầu lịch sử. README dẫn tới yêu cầu và audit Phase 3.
- Bỏ lựa chọn GHN và trường đặc thù hãng khỏi form tạo kiện. Service chỉ nhận LOCAL_MANUAL; giữ toàn bộ máy trạng thái, tài chính, phân quyền và tồn kho Phase 2A.
- Endpoint admin GHN trả 410 sau xác thực; webhook hãng trả 410 không đọc payload/ghi DB. Factory provider bị khóa bất kể biến môi trường. Adapter lịch sử không có fetch mặc định; chỉ unit test truyền transport mô phỏng trực tiếp. Không còn cấu hình/token/Shop ID cần điền trong .env.example.
- Timeline và màn hình vận chuyển ghi rõ mô phỏng local, mã HN-SHIP-* là mã nội bộ. Không dựng dữ liệu giao nhận giả ngoài DB.
- Bỏ lệnh test:ghn khỏi luồng đang hỗ trợ. Các file/kết quả thử nghiệm GHN trước đổi phạm vi là lịch sử, không phải nghiệm thu tích hợp và không yêu cầu người dùng cấu hình hãng.
- Giữ các trường schema bổ sung từ phần việc Phase 2B đã dừng để không phá DB. Migration tương ứng chuyển thành ALTER ADD COLUMN/CREATE INDEX, không dựng lại bảng. Bản local đã áp dụng trước đó được đối chiếu schema và đồng bộ checksum; không chạy lại migration/reset DB.
- So sánh 39 bảng theo toàn bộ cột cũ với backup trước Phase 2B: không đổi dữ liệu. Bằng chứng `verification/local-demo-data-preservation.json`. Không sửa chính sách công khai, đơn, giá, tài khoản hoặc mật khẩu.

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | 39/39 PASS; gồm 3 kiểm tra mới khóa carrier, không gọi fetch mặc định và từ chối webhook |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run test:shipping -- --stable` | Phase 1: 17/17 PASS; Phase 2A: 18/18 PASS |
| Build local trong stable runner | PASS; chỉ tạo artifact local, không deploy |
| Bảo toàn dữ liệu chính | 39/39 bảng cũ giữ nguyên dữ liệu |

Kiểm tra API Phase 2A còn xác nhận từ chối provider GHN/GHTK/Viettel Post và 410 cho submit/webhook GHN. Timeline khách tiếp tục có LOCAL_MANUAL, mã nội bộ và trạng thái từ DB, không lộ chứng từ COD.

Các lần đầu dùng Next dev gặp lỗi framework `Unexpected end of JSON input` khi đọc manifest; không ghi nhận các lần đó là PASS. Đã bổ sung tùy chọn `--stable` vào runner, build/start server local ở cổng 3101, chạy lại toàn bộ trên DB mới. Lần stable đầu phát hiện assertion timeline cần giữ nhãn LOCAL_MANUAL; đã giữ nhãn kèm “mô phỏng local”, rồi chạy lại đạt toàn bộ. Log cuối: `verification/local-demo-stable-regression.log`; kết quả máy đọc: `verification/order-phase1-results.json`, `verification/shipping-phase2a-results.json`.

Không chạy lại browser E2E trong lần audit này; không lấy ảnh/browser report Phase 2A trước làm bằng chứng mới. Mọi API regression chạy trên DB mới `phase1-orders-<timestamp>.db`, không phải dev.db. Những test GHN adapter còn giữ chỉ chạy transport mock, không có kết nối hãng. Chưa kiểm thử nghiệp vụ Phase 3 vì chưa triển khai.
