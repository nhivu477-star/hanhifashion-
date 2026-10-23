# Nguồn ảnh và phạm vi phân phối

HÀ NHI FASHION là dự án portfolio BA/IT và bản xem trước thương mại điện tử cục bộ. Ghi nguồn, ghi “demo”, “học tập” hoặc “phi thương mại” **không tạo quyền sử dụng hay phân phối lại ảnh**. Tên thương hiệu không hàm ý quan hệ đại lý, hợp tác hoặc bảo trợ. Giấy phép mã nguồn, nếu có, không tự áp dụng cho ảnh, nhãn hiệu, thiết kế hoặc quyền hình ảnh người mẫu.

## Bản demo an toàn từ bản clone mới

`pnpm demo:setup portfolio` tạo cơ sở dữ liệu SQLite mới, tách biệt trong `.local-demo/portfolio/`; `pnpm demo:dev portfolio` chỉ chạy cơ sở dữ liệu đó ở loopback. Có thể thay `portfolio` bằng một tên workspace mới. Không chạy script nhập ảnh để chuẩn bị portfolio. Setup từ chối đường dẫn đã tồn tại, kể cả symlink; không reset, không ghi đè `.env`, cơ sở dữ liệu hoặc tài khoản có sẵn. Thông tin đăng nhập ngẫu nhiên cho ADMIN, SELLER và CUSTOMER nằm trong tệp riêng tư `accounts.json` của workspace (không commit, không đưa vào ảnh chụp màn hình).

Catalog được dựng từ mẫu trung tính, màu/cỡ và tồn kho `SAMPLE`, **không có ảnh chụp sản phẩm**; placeholder `public/images/awaiting-photo.svg` ghi rõ trạng thái chờ ảnh. Đây không phải ảnh AI hoặc bằng chứng hàng hóa thật. Dữ liệu mẫu giữ `merchandiseVerified=false` và trạng thái chờ tài sản; không lách điều kiện xuất bản thương mại. Hai đơn hàng hư cấu dùng email thuộc miền dành riêng `example.invalid`, số điện thoại không liên lạc và địa chỉ ghi rõ không giao hàng. Không có thanh toán hoặc vận chuyển thật.

Logo `public/images/brand-original.png` là tài sản nhận diện riêng của dự án, không phải ảnh minh họa hàng hóa. Việc giữ logo không xác lập quyền nhãn hiệu, quyền phân phối lại hoặc nguồn gốc ảnh; không sử dụng logo làm bằng chứng về hàng hóa thật.

## Tài sản tham khảo chỉ giữ cục bộ

Chưa có bằng chứng cho phép phân phối lại ảnh thương hiệu/ảnh người dùng bên dưới. Các tệp raster đã được **bỏ theo dõi Git bằng `git rm --cached`**, đồng thời thêm ignore; tệp có sẵn trên máy được giữ nguyên, không xóa dữ liệu catalog hoặc tệp người dùng:

- `public/images/lsoul/`: ảnh tham khảo LSOUL (4.170 đường dẫn).
- `public/images/office-demo/`: ảnh tham khảo SAINT AND SOFIA và nguồn office chưa xác minh quyền (311 đường dẫn raster; giữ README và hồ sơ nguồn).
- `public/images/campaigns/`: 6 đường dẫn raster chưa có hồ sơ quyền phân phối rõ ràng.
- 9 đường dẫn raster cũ: `auth-awak-user.png`, `hero-miranda-blue.webp`, `hero.png`, `blazer.png`, `blouse.png`, `dress.png`, `skirt.png`, `editorial-blazer.webp`, `editorial-wardrobe.webp` bên trong `public/images/`.

Tổng cộng 4.496 đường dẫn bị bỏ theo dõi trong đợt chuẩn bị portfolio; 6 tệp đã không còn trong working tree trước thao tác này. Việc bỏ theo dõi không xóa hoặc hoàn tác tài sản cục bộ. Không dùng `git add -f` để đưa các ảnh này trở lại repository công khai. Bản clone mới không cần các ảnh này để chạy demo trung tính. Các script nhập nguồn cũ vẫn phục vụ dữ liệu tham khảo cục bộ, không phải bằng chứng cấp phép và không thuộc workflow demo an toàn.

**Giới hạn lịch sử:** ảnh tham khảo vẫn có trong các commit cũ. Bỏ theo dõi ở commit mới không gỡ ảnh khỏi lịch sử Git hoặc bản sao đã chia sẻ. Đợt này không rewrite lịch sử và không push/deploy. Trước khi công khai toàn bộ lịch sử, chủ dự án cần xin phép phù hợp hoặc quyết định cách xuất bản lịch sử sạch với sự chấp thuận rõ ràng; không tuyên bố repository đã được clearance bản quyền toàn phần.

## Hồ sơ nguồn được giữ

- LSOUL: <https://lsoul.com> — hồ sơ sản phẩm/màu/đường dẫn tại `scripts/data/lsoul-manifest.json`.
- SAINT AND SOFIA: <https://saintandsofia.com> — hồ sơ trang nguồn tại `public/images/office-demo/sources.json`.
- Pexels: <https://www.pexels.com> — ảnh có trang nguồn tại `public/images/demo-photos/sources.json`, đối chiếu <https://www.pexels.com/license/>. Nhóm này được giữ với hồ sơ ghi nguồn; demo an toàn không phụ thuộc vào nó. Phải kiểm tra từng ảnh, giới hạn hình ảnh/nhãn hiệu và điều khoản tại thời điểm dùng; tài liệu này không xác nhận quyền cho mọi ngữ cảnh sử dụng.
- `src/lib/image-credits.json` và trang `/nguon-anh` lưu dấu vết nguồn tham khảo, có thể bao gồm ảnh đã loại khỏi bản phân phối. Hồ sơ nguồn không phải giấy phép hoặc chứng nhận quyền sở hữu.
- Font được phân phối kèm hồ sơ giấy phép tại `public/fonts/licenses/`; không áp dụng giấy phép font cho ảnh.
- Roboto hiện dùng `public/fonts/roboto-variable.ttf` từ nguồn chính thức Google Fonts: <https://github.com/google/fonts/tree/main/ofl/roboto>, kèm nguyên văn SIL Open Font License tại `public/fonts/licenses/Roboto-OFL.txt`. Git blob nguồn được đối chiếu khi nhập: font `5522a368d9072fd88c299916e61fcff369949061`, giấy phép `9c48e05a24fa2267e207ecf17560291b5621c197`.
- Bốn font tham khảo cũ `public/fonts/lsoul-roboto-{regular,500,600,700}.woff2` không có hồ sơ giấy phép/nguồn kèm theo đã được bỏ theo dõi Git và ignore; giữ nguyên bản cục bộ. Layout đã chuyển sang font Roboto chính thức nêu trên. Các blob font cũ vẫn còn trong lịch sử Git; giới hạn xuất bản lịch sử chưa được giải quyết chỉ bằng việc bỏ theo dõi.

Ảnh minh họa sản phẩm từng sinh bằng script và các ảnh đã xác định có metadata AI đã được loại khỏi đường tái tạo trước đợt portfolio này; không sinh ảnh AI mới. Những tệp SVG minh họa cũ không được coi là ảnh hàng hóa thật hoặc dùng để xác minh xuất bản. Không dùng việc thiếu metadata làm bằng chứng ảnh thật, quyền sử dụng hoặc quyền hình ảnh.

## Điều kiện trước khi sử dụng ảnh mới

Lưu tác giả/chủ sở hữu, URL nguồn, giấy phép hoặc văn bản cho phép, phạm vi phân phối, yêu cầu ghi công, quyền hình ảnh/nhãn hiệu liên quan và thay đổi đã thực hiện. Không xóa watermark/ghi công gốc. Ảnh chưa rõ quyền phải được xin phép hoặc thay bằng ảnh tự chụp/có giấy phép phù hợp; không xác nhận hàng hóa thật chỉ vì đã có ảnh.

Chủ sở hữu quyền có thể tạo issue với URL ảnh, vị trí sử dụng và căn cứ quyền để yêu cầu rà soát/gỡ bỏ. Lời cảm ơn các tác giả và nguồn LSOUL, SAINT AND SOFIA, Pexels không hàm ý đã được cấp phép, hợp tác hoặc bảo trợ.
