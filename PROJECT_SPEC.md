# HÀ NHI FASHION — Consolidated master specification

Maintained in the existing local project. Updated 19/10/2026.

Ghi chú dọn tệp theo yêu cầu: báo cáo phase cũ đã chuyển vào Thùng rác có manifest, liên kết lịch sử dẫn đến báo cáo tổng hợp Phase 5. Báo cáo Phase 6 hiện tại: [docs/phase-6-qa-report.md](docs/phase-6-qa-report.md). Các yêu cầu lịch sử bên dưới được giữ để tra cứu, không phải chỉ dẫn triển khai lại.

## Nghiệm thu nghiệp vụ theo cửa hàng ngày 20/10/2026

Theo yêu cầu mới: Word “Nhóm 4-Lớp 1.docx” Chương 1–2 là mẫu quy trình, cần điều chỉnh cho HÀ NHI; không sao chép máy móc tích hợp ngoại vi, cấu trúc dữ liệu hoặc các quy tắc tài chính chưa duyệt. Tiêu chuẩn 31 Use Case và 186 nhóm Given–When–Then tại [docs/business-acceptance-31.md](docs/business-acceptance-31.md); kết quả và giới hạn tại [docs/business-acceptance-report.md](docs/business-acceptance-report.md).

Giữ chính sách lỗi đủ 72 giờ, COD/giao nhận/hoàn tiền nội bộ, quyền tài chính riêng và layout Tổng quan đã duyệt. Thêm kiểm kê có phiếu/duyệt/chặn snapshot cũ; checklist trước bàn giao; phản hồi đánh giá mua thật và hỗ trợ nội bộ; hồ sơ khách/địa chỉ mặc định; voucher start/end; Excel; transaction/audit và receipt. SELLER có thêm inquiries.read/manage để phản hồi khách, không có quyền staff/roles/refunds/finance mới.

Hủy một phần chưa có chính sách được duyệt: **khóa API và ẩn UI trên database chính**, không đặt ngầm công thức tài chính. Đề xuất kỹ thuật chỉ kiểm thử trong DB riêng có policy fixture. Đổi SKU khác đơn giá lịch sử tiếp tục bị chặn. Không thay dữ liệu lịch sử cũ để giả kết quả nghiệm thu; migration chỉ bổ sung cột/bảng và giữ index.

## Ràng buộc thường trực — PROJECT MODE: LOCAL E-COMMERCE DEMO

Cập nhật theo yêu cầu chủ dự án ngày 18/10/2026. Mục này có ưu tiên cao nhất khi mâu thuẫn với các đặc tả, kế hoạch hoặc báo cáo lịch sử bên dưới, kể cả Phase 2B GHN staging.

1. Không tích hợp hãng vận chuyển thật: GHN, GHTK, Viettel Post hoặc hãng khác, kể cả staging/sandbox của hãng.
2. Không yêu cầu API token, Shop ID, tài khoản hãng hay cấu hình callback của hãng.
3. Giữ nguyên và tái sử dụng Phase 2A: vận chuyển thủ công và đối soát COD local.
4. Sinh mã hồ sơ demo nội bộ `HN-SHIP-*`; ghi rõ không phải tracking number/vận đơn hãng. Không sinh mã giả mạo hãng.
5. Chỉ quản trị viên được phân quyền mới được mô phỏng giao nhận, giao thành công, thất bại, giao lại và chuyển hoàn. Giữ validator trạng thái và yêu cầu lý do.
6. Khách tra cứu trạng thái mô phỏng từ bản ghi thực trong SQLite local, giữ kiểm tra quyền sở hữu và giới hạn thông tin công khai; không dựng timeline giả trên frontend.
7. Thanh toán, thu COD, tiền chuyển về, đối soát và hoàn tiền chỉ là giao dịch mô phỏng. Không chuyển tiền thật, không cổng thanh toán thật.
8. Giữ mọi quy tắc nghiệp vụ, transaction/CAS, idempotency, tồn kho, phân quyền, lịch sử và audit log. Không ghi đè/xóa ledger để sửa sai.
9. Không xây lại chức năng đã hoàn thành; mở rộng trên mô-đun hiện tại, migration bổ sung, giữ dữ liệu.
10. Không push GitHub, deploy, publish, tunnel hay kết nối dịch vụ production bên ngoài. Tất cả phát triển và kiểm thử ở local.

**Phase 3 đã hoàn tất; Phase 4 được yêu cầu và triển khai riêng sau đó.** Trước triển khai phải audit và tái sử dụng order lifecycle, shipment, COD và inventory. Báo cáo audit, quy tắc đề xuất, thay đổi và kiểm thử bằng tiếng Việt. Không tự khởi động các phase khác.

Giữ chính sách hiện hành: tiếp nhận trong **03 ngày kể từ khi nhận hàng khi sản phẩm có lỗi**; xác minh lỗi trước khi đổi/hoàn; không tự mở rộng sang đổi size, màu hoặc mẫu vì thay đổi nhu cầu. Chi tiết chính sách công khai trong `src/lib/content.ts` vẫn được bảo toàn.

Audit và lộ trình Phase 3: [docs/phase-5-qa-report.md](docs/phase-5-qa-report.md). Phase 3 được triển khai theo yêu cầu tiếp theo và hoàn tất kiểm chứng local ngày 19/10/2026; xem docs/phase-5-qa-report.md. Phase 2B đã dừng, tài liệu GHN cũ chỉ mang tính lịch sử.

## Phase 6 — analytics local đã triển khai (19/10/2026)

Đã bổ sung thống kê đơn/sản phẩm/khách/funnel/tồn/lợi nhuận/attribution/COD và đối chiếu bằng dữ liệu SQLite first-party, phân quyền riêng, không có kết nối analytics, hãng vận chuyển hoặc thanh toán bên thứ ba. Dữ liệu hàng/ảnh/tồn vẫn cần xác minh trước khi bán thật; giới hạn và bằng chứng tại [docs/phase-6-qa-report.md](docs/phase-6-qa-report.md).

## Phase 5 — yêu cầu riêng và kết quả (19/10/2026)

Chủ dự án yêu cầu Phase5 sau Phase4; điểm dừng Phase4 bên dưới là lịch sử. Giữ LOCAL E-COMMERCE DEMO, SQLite, 72 giờ lỗi, quyền và mọi dữ liệu.

- Đã thêm audit/readiness tách publication, kiểm tệp và quản lý media local an toàn, giữ gallery/NextImage cũ, phân trang và tối ưu payload, returnTo nội bộ, structured errors/logs, online backup/isolated restore.
- 46 bảng main giữ nguyên toàn bộ nội dung, không migration/reset/seed hoặc đổi role/password. 555 sản phẩm: 554 NEEDS REVIEW và1INVALID giá0 Bộ Buzz cần chủ shop xác nhận. Không tuyên bố ảnh/hàng/tồn đã xác minh.
- Bằng chứng và giới hạn: [docs/phase-5-qa-report.md](docs/phase-5-qa-report.md), tám tài liệu bổ sung cùng thư mục. Phase5 kỹ thuật local COMPLETED; merchandise readiness PARTIALLY COMPLETED.
- **Điểm dừng lịch sử sau Phase 5; Phase 6 đã được yêu cầu và triển khai riêng.** Không push/sync/deploy/publish hoặc dịch vụ hãng/tiền thật.

## Phase 4 — Staff RBAC đã được duyệt và triển khai (19/10/2026)

- Static permissions/default deny cho 10 role mục tiêu; giữ ADMIN legacy, không tự cấp SUPER_ADMIN qua migration hoặc đăng ký công khai.
- Chủ dự án xác nhận “Nâng tài khoản quản trị hiện tại”. Bootstrap local nâng tài khoản hiện hữu lên SUPER_ADMIN, giữ mật khẩu, audit phê duyệt và thu hồi phiên cũ; phải đăng nhập lại.
- Admin/API/service dùng quyền cụ thể, menu/form lọc quyền, staff management/permission overview/read-only audit. Tách inventory/order/returns/content/marketing/finance, giữ policy lỗi 72 giờ và mọi nghiệp vụ demo.
- Role/status thay đổi tăng permissionVersion và thu hồi phiên; bảo vệ SUPER_ADMIN cuối và chặn tự nâng role. User/Session/AuditLog chỉ thêm metadata; bảo toàn dữ liệu cũ ngoài thay đổi quyền/phiên đã duyệt.
- Kết quả và giới hạn: [docs/phase-5-qa-report.md](docs/phase-5-qa-report.md); ma trận: [docs/rbac-role-permission-matrix.md](docs/rbac-role-permission-matrix.md).
- **Dừng sau Phase 4. Không tự bắt đầu Phase 5.** Toàn bộ vẫn local, không push/deploy/publish hay carrier/payment thật.

## Phase 3 đã được duyệt và triển khai (19/10/2026)

- Thời hạn lỗi: **đủ 72 giờ từ thời điểm nhận hàng**, xác nhận trực tiếp bởi chủ dự án; không đổi sang hết ngày lịch.
- Khách đăng nhập sở hữu đơn gửi claim theo dòng/số lượng và ảnh riêng tư. ADMIN xác minh, duyệt, nhận và kiểm hàng; chỉ SELLABLE hoàn tồn một lần.
- Đổi SKU cùng đơn giá lịch sử, kiểm tồn trong transaction; kiện thay thế chỉ mô phỏng, không sửa Shipment/OrderItem gốc.
- SIMULATED REFUND tính server từ snapshot sau giảm giá, giới hạn khoản đã thu còn có thể hoàn; duyệt/xác nhận riêng, không ghi đè COD hoặc chuyển tiền thật.
- Giữ idempotency, transaction/CAS, audit, quyền sở hữu, 39 bảng dữ liệu cũ. Giới hạn và bằng chứng tại [docs/phase-5-qa-report.md](docs/phase-5-qa-report.md).
- Điểm dừng Phase 3 đã được thay bởi yêu cầu Phase 4 riêng của chủ dự án ở trên.

## Current approved amendments (take precedence over older details below)

- The latest homepage layout request follows the reference retailer's broad structure: a landscape campaign, 12 new-arrival products in four desktop columns / two mobile columns with a centred heading and action, a horizontal lookbook, a compact category edit, a short brand introduction and a four-part service area before newsletter/footer. This supersedes the original long homepage section order. Keep all shopping routes and admin features. Use original HÀ NHI artwork; never copy reference photos, trademarks, staff identities or sales claims.
- Keep the campaign footer text exactly `office Hung Yen` as requested.

- Use the supplied original PNG logo in the header, navigation drawer and footer. Never retype its letters, invent a replacement mark, recolour or distort the artwork. CSS may mask empty outside margins while preserving uniform scaling.
- Use the ELISE-inspired navigation structure: one white header row, menu and approved logo on the left, search in the centre, contact/account/cart/wishlist on the right. Categories are inside a keyboard-accessible left drawer; no crowded horizontal category row.
- Reserve space for wrapping product names so product prices align across every row, including mobile.
- Lora editorial typography and Be Vietnam Pro functional typography replace the earlier font pairing.
- The detailed taxonomy, contact and typography requirements below supersede conflicting original specifications. Preserve IDs, orders, accounts and inventory during migrations.
- Remain at localhost:3000; no deployment or remote repository operations.

# HÀ NHI FASHION — Website Design, Product Taxonomy and Contact Requirements

Apply the following requirements to the existing HÀ NHI FASHION women's officewear e-commerce project.

**Important:** Update the existing consolidated master specification and current codebase. Do not create another project version, duplicate website, or separate implementation.

Preserve the approved logo and continue building locally on `localhost:3000`. Do not deploy publicly, configure hosting, connect a domain, or push to GitHub without explicit user authorization.

## 1. Website typography

The entire storefront must use typography that feels:

- Soft, light, feminine and graceful.
- Thin and airy without becoming difficult to read.
- Elegant and slightly flowing, rather than rigid or geometric.
- Professional enough for a premium women's officewear retailer.
- Consistently legible on white, cream, beige, dark and photographic backgrounds.

Use **Lora** for editorial typography and **Be Vietnam Pro** for functional UI typography.

### Typography specifications

| Element | Font | Weight | Desktop size | Mobile size |
|---|---|---|---|---|
| Hero headline | Lora | 400 | 52–64px | 34–42px |
| Collection headline | Lora | 400 | 36–42px | 28–32px |
| Category heading | Lora | 400 | 28–34px | 24–28px |
| Navigation | Be Vietnam Pro | 400 | 13–14px | 14px |
| Normal body text | Be Vietnam Pro | 300–400 | 15–16px | 15px |
| Product name | Be Vietnam Pro | 500 | 15px | 14px |
| Product description | Be Vietnam Pro | 450–500 | 15–16px | 14–15px |
| Product price | Be Vietnam Pro | 600 | 16–17px | 15–16px |
| Buttons | Be Vietnam Pro | 500 | 13–14px | 14px |
| Filter labels | Be Vietnam Pro | 400–500 | 14px | 14px |

Keep body text elegant and visually lightweight, but make product names, product descriptions and purchasing information slightly more prominent.

Use line heights of approximately 1.6–1.75 for paragraphs and 1.2–1.35 for headings.

Italic Lora may be used selectively in editorial campaign headings, never for prices, forms or important product details.

### Background contrast

Apply these rules consistently:

**Light backgrounds**
- Background: `#FFFFFF`, `#FAF9F6` or `#F5F1EB`.
- Headings: `#222222`.
- Body text: `#514C48`.
- Product descriptions: `#4A4541`.
- Secondary text: `#645D57`.

**Dark backgrounds**
- Headings: `#FFFFFF`.
- Body text: `#F0EAE5`.
- Muted text: `#E8DDD5`.

**Photographic banners**
- Assess image brightness and local contrast.
- Use a subtle dark overlay behind white text where needed.
- Alternatively place dark text in a sufficiently light area.
- Never position thin text over a visually busy region without contrast protection.
- Prioritize WCAG AA contrast for readable text.
- Use a stronger effective font weight or background treatment when necessary.

Avoid fonts below weight 400 for small text on complex backgrounds.

The website should feel visually delicate without making shoppers struggle to read information.

### Typography implementation

Define shared typography design tokens and reusable styles.

Use optimized font loading through Next.js where possible.

Load the required Vietnamese glyphs.

Avoid layout shifts caused by font replacement.

Apply typography consistently across:

- Homepage.
- Hero banners.
- Product category pages.
- Product cards.
- Product details.
- Product descriptions.
- Navigation.
- Filters.
- Search.
- Wishlist.
- Cart.
- Checkout.
- Customer accounts.
- Footer.
- Admin pages.

Use a more functional and slightly stronger typographic hierarchy in the admin dashboard.

Do not modify the existing brand logo.

## 2. Detailed women's officewear categories

Implement a hierarchical and admin-manageable catalog taxonomy.

### Áo sơ mi — Office shirts

Subcategories:

- Sơ mi trắng.
- Sơ mi lụa.
- Sơ mi cotton.
- Sơ mi cổ đức.
- Sơ mi cổ nơ.
- Sơ mi tay dài.
- Sơ mi tay ngắn.
- Sơ mi dáng suông.
- Sơ mi kẻ sọc.

### Áo kiểu — Office blouses

Subcategories:

- Áo peplum.
- Áo tay bồng.
- Áo cổ V.
- Áo cổ bèo.
- Áo cổ tròn.
- Áo sát nách.
- Áo satin.
- Áo phối ren.
- Áo chiết eo.

### Vest & Blazer

Subcategories:

- Blazer dáng suông.
- Blazer chiết eo.
- Blazer dáng ngắn.
- Blazer oversized.
- Blazer hai hàng khuy.
- Áo vest công sở.
- Blazer tweed.

### Quần công sở — Office trousers

Subcategories:

- Quần tây ống đứng.
- Quần tây ống suông.
- Quần ống rộng.
- Quần cạp cao.
- Quần baggy công sở.
- Quần lửng culottes.
- Quần ống loe.
- Quần kaki công sở.

### Chân váy — Office skirts

Subcategories:

- Chân váy bút chì.
- Chân váy chữ A.
- Chân váy midi.
- Chân váy xếp ly.
- Chân váy đuôi cá.
- Chân váy dáng suông.
- Chân váy ngắn công sở.
- Chân váy tweed.

### Đầm công sở — Office dresses

Subcategories:

- Đầm chữ A.
- Đầm suông.
- Đầm ôm.
- Đầm sơ mi.
- Đầm vest.
- Đầm midi.
- Đầm tay lỡ.
- Đầm cổ V.
- Đầm chiết eo.

### Set công sở — Matching office sets

Subcategories:

- Set áo và chân váy.
- Set áo và quần tây.
- Set blazer và quần.
- Set blazer và chân váy.
- Set vest ba món.
- Set tweed.
- Set công sở tối giản.
- Set công sở thanh lịch.

### Áo khoác & Len

Subcategories:

- Cardigan mỏng.
- Áo khoác tweed.
- Áo khoác dạ.
- Áo len mỏng công sở.
- Áo khoác dáng ngắn.
- Áo khoác dáng dài.

Implement distinct catalog categories separately from cross-cutting product attributes, so a product can be classified once within the category hierarchy while also having style, material, occasion and color attributes.

## 3. Product taxonomy functionality

Each product must support:

- Primary category.
- Optional nested subcategory.
- Product name.
- Unique SKU.
- Slug.
- Description.
- Fabric/material.
- Fit or silhouette.
- Sleeve type.
- Length.
- Occasion.
- Style tags.
- Color options.
- Size variants.
- Price.
- Sale price.
- Stock per variant.
- Product images.
- Collection membership.
- Publication status.

Provide catalog filters for:

- Category.
- Subcategory.
- Price.
- Size.
- Color.
- Material.
- Fit.
- Occasion.
- Availability.
- Sale status.

Provide sorting by:

- Newest.
- Price ascending.
- Price descending.
- Best selling, based on genuine order data.
- Product name.

All filters must function through backend/database queries and preserve their values in URL search parameters.

### Navigation

Use these main menu labels:

HÀNG MỚI

THỜI TRANG CÔNG SỞ

ÁO SƠ MI

ÁO KIỂU

VEST & BLAZER

QUẦN TÂY

CHÂN VÁY

ĐẦM CÔNG SỞ

SET CÔNG SỞ

BỘ SƯU TẬP

SALE

Group related items into an accessible dropdown or mobile navigation drawer without overcrowding the desktop header.

All categories and subcategories must be manageable through the admin interface.

Avoid hardcoding navigation to a structure that cannot be updated.

## 4. Product content presentation

Use elegant but clearly readable product information.

Product card:

- Product name: Be Vietnam Pro 500.
- Current price: Be Vietnam Pro 600.
- Original price: Be Vietnam Pro 400 with strikethrough.
- Product metadata: Be Vietnam Pro 400.

Product detail page:

- Product heading: Lora 400 or Be Vietnam Pro 500, according to the visual context.
- Short description: Be Vietnam Pro 500.
- Long description: Be Vietnam Pro 400–500.
- Fabric and care information: Be Vietnam Pro 400.
- Stock warning and variant selection: Be Vietnam Pro 500.
- Important purchase instructions: Be Vietnam Pro 500.

Descriptions should have slightly stronger visual emphasis than ordinary editorial body text, while maintaining a sophisticated look.

Use original Vietnamese product copy. Do not copy descriptions from competitor websites.

## 5. Official brand contact information

Configure the following contact information exactly:

**Brand:** HÀ NHI FASHION

**Email:** hanhifashion@gmail.com

**Telephone:** 0961982102

**Facebook:**
https://www.facebook.com/share/19MKdV11Hu/?mibextid=wwXIfr

**Instagram:**
https://www.instagram.com/ha_nhi.05?mdxt=MWh4MHhzOHkxNjhrOA==

Display this contact information in:

- Website footer.
- Contact page.
- Customer support information.
- Relevant order support screens.

Use working links:

Email:
`mailto:hanhifashion@gmail.com`

Telephone:
`tel:0961982102`

Facebook and Instagram:
Use the exact provided HTTPS URLs.

External social links should open safely in a new tab using `rel="noopener noreferrer"` where applicable.

Do not replace these URLs with invented profiles.

Do not invent a physical store address, business registration number or business hours.

Keep contact details editable through the admin settings interface.

## 6. Contact page layout

Create a dedicated `/lien-he` page using the same elegant design language.

Page title:

LIÊN HỆ HÀ NHI FASHION

Subtitle:

"Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ nàng."

Include:

- Email contact.
- Telephone number.
- Facebook profile.
- Instagram profile.
- Customer contact form.

Contact form fields:

- Họ và tên.
- Email.
- Số điện thoại, optional.
- Chủ đề.
- Nội dung liên hệ.

Use proper validation.

Store inquiries locally in the database for admin review.

Do not claim that an email was sent if no email delivery integration has been configured.

Create an admin interface for viewing submitted inquiries.

## 7. Footer design

The footer should be visually light, refined, and feminine.

Background:
`#FAF9F6`

Primary text:
`#292929`

Secondary text:
`#645D57`

Sections:

**HÀ NHI FASHION**
A concise original officewear brand description.

**SẢN PHẨM**
- Áo sơ mi.
- Áo kiểu.
- Vest & Blazer.
- Quần tây.
- Chân váy.
- Đầm công sở.
- Set công sở.

**HỖ TRỢ**
- Hướng dẫn chọn size.
- Hướng dẫn mua hàng.
- Chính sách giao hàng.
- Chính sách đổi trả.
- Liên hệ.

**KẾT NỐI VỚI HÀ NHI**
- Email: hanhifashion@gmail.com
- Hotline: 0961982102
- Facebook: provided URL
- Instagram: provided URL

Use small, consistent social icons.

Avoid oversized decorative icons.

All links must function.

## 8. Local development and preservation

This project remains a local-first full-stack website.

Run on:

`http://localhost:3000`

Admin:

`http://localhost:3000/admin`

Preserve the existing application architecture and working functionality.

Apply the typography, product taxonomy, navigation and contact changes to the current project rather than recreating it.

Use database migrations when new category, attribute, contact or inquiry models are needed.

Maintain existing product, cart, order, inventory and account relationships.

Update seed data to match the detailed women's officewear taxonomy.

Validate responsive layouts on mobile, tablet and desktop.

Verify:

- Vietnamese font rendering.
- Text contrast over background imagery.
- Product description readability.
- Correct category navigation.
- Functional catalog filters.
- Contact links.
- Contact form persistence.
- Admin editing of categories and contact information.
- No overflow in mobile navigation.

Do not publish or deploy the website.

Do not push or sync with GitHub.

Continue implementing and testing locally until the requirements are satisfied.

The final result must be a cohesive, elegant, feminine and fully functional HÀ NHI FASHION women's officewear e-commerce website.


## Original retained functional and technical scope

PROJECT NAME: HÀ NHI FASHION

PROJECT TYPE:
Women's Officewear E-commerce Website

DEVELOPMENT MODE:
LOCAL-FIRST FULL-STACK WEB APPLICATION

REFERENCE:
https://elise.vn/thoi-trang-nu

PRIMARY OBJECTIVE:
Build a complete, elegant, functional women's officewear
e-commerce website that runs locally on macOS.

IMPORTANT:
This is a local web development project.

DO NOT:
- Deploy to Vercel.
- Deploy to Netlify.
- Create a public website.
- Create a ChatGPT Site.
- Purchase or configure a domain.
- Configure public hosting.
- Push to GitHub.
- Synchronize with remote repositories.
- Set up production payment gateways.
- Require paid cloud infrastructure.

The application should run locally at:

http://localhost:3000

All development and testing must remain local.

====================================================
1. YOUR ROLE
====================================================

Act as an experienced multidisciplinary team:

- Senior Product Manager
- Business Analyst
- Senior UI/UX Designer
- Fashion E-commerce Designer
- Frontend Engineer
- Backend Engineer
- Database Architect
- QA Engineer
- Security Engineer

Your goal is to build a professional, maintainable
fashion e-commerce application.

Do not generate only static design mockups.

Do not stop after creating the homepage.

Implement real functionality with persistent data.

All customer-facing content must be in Vietnamese.

Technical code and documentation may be in English.

Do not repeatedly ask for approval during ordinary
implementation decisions.

Proceed using the specifications below.

====================================================
2. BUSINESS POSITIONING
====================================================

BRAND:

HÀ NHI FASHION

BUSINESS CATEGORY:

Women's officewear fashion.

Vietnamese description:

Thời trang công sở nữ thanh lịch, hiện đại và tinh tế.

TARGET CUSTOMERS:

Women approximately 22–40 years old.

Customer segments:

1. University graduates starting professional careers.
2. Young office professionals.
3. Corporate employees.
4. Female managers.
5. Women seeking elegant everyday office outfits.

BRAND VALUES:

Elegance
Professionalism
Femininity
Confidence
Simplicity
Comfort
Modernity

DESIGN PHILOSOPHY:

Elegant Officewear
Minimal Luxury
Quiet Luxury
Contemporary Feminine Fashion

The website must communicate a polished,
professional and feminine brand image.

Avoid making the website look like:

- A fast-fashion discount marketplace.
- A generic dropshipping store.
- A luxury jewelry website.
- A streetwear website.
- A generic SaaS application.

The design must clearly represent women's
professional office fashion.

====================================================
3. REFERENCE WEBSITE USAGE
====================================================

Reference website:

https://elise.vn/thoi-trang-nu

Study its general information architecture and
common fashion e-commerce functionality.

Target approximately 80% functional and structural
coverage of the reference shopping experience.

Relevant reference patterns include:

- Main navigation.
- Category hierarchy.
- Product grids.
- Product listing pages.
- Filtering and sorting.
- Product details.
- Image galleries.
- Size selection.
- Shopping cart.
- Checkout workflow.
- Wishlist.
- Customer accounts.

IMPORTANT COPYRIGHT RULES:

Never copy:

- ELISE logos.
- ELISE product photographs.
- ELISE banners.
- ELISE text descriptions.
- ELISE source code.
- ELISE brand elements.
- Distinctive protected design compositions.

Do not scrape copyrighted reference assets.

Do not create a pixel-identical replica.

Create an original HÀ NHI FASHION design.

The goal is similar usability and comprehensive
e-commerce functionality, not visual duplication.

If browser inspection is available, analyze the
reference website before implementation.

Otherwise, rely on the specifications in this prompt.

Do not claim the reference website was inspected
unless it was actually inspected.

====================================================
4. BRAND DESIGN SYSTEM
====================================================

STYLE:

Minimal Luxury Office Fashion.

VISUAL CHARACTERISTICS:

- Clean white backgrounds.
- Elegant typography.
- Large editorial fashion imagery.
- Balanced spacing.
- Subtle borders.
- Minimal iconography.
- Soft neutral colors.
- Refined product presentations.
- Professional visual hierarchy.

COLOR PALETTE:

Primary White:
#FFFFFF

Warm Ivory:
#FAF9F6

Cream:
#F5F1EB

Soft Blush:
#E9DDD7

Main Text:
#222222

Dark Heading:
#181818

Secondary Text:
#77716D

Muted Text:
#96918B

Champagne Brown:
#A78B73

Accent Hover:
#8E725D

Border:
#E8E5E1

Success:
#47745A

Error:
#B84D4D

Use these colors consistently.

Do not introduce random additional colors.

TYPOGRAPHY:

Editorial Headings:
Lora

Body and UI:
Be Vietnam Pro

Ensure Vietnamese diacritics render correctly.

Use appropriate Vietnamese-compatible
font fallbacks when necessary.

HEADING SIZES:

Desktop H1:
48–60px

Desktop H2:
32–40px

Section H3:
24–28px

Body:
14–16px

Product Name:
14–15px

Product Price:
15–17px

Button Text:
13–14px

LAYOUT:

Maximum Content Width:
1320px

Desktop Horizontal Padding:
48px

Tablet Padding:
24px

Mobile Padding:
16px

Use a consistent 8px spacing system.

CORNER RADIUS:

Buttons:
2–4px

Form Inputs:
4px

Images:
0–4px

Avoid excessive rounded corners.

SHADOWS:

Use sparingly.

Prefer borders, spacing and typography
over decorative shadows.

ANIMATION:

Subtle 180–300ms transitions.

Use animations only when they improve usability.

====================================================
5. LOGO AND BRAND ASSETS
====================================================

Use the HÀ NHI FASHION logo.

If an approved logo file exists, preserve it.

Otherwise, create an original temporary SVG logo.

LOGO STRUCTURE:

Main wordmark:

HÀ NHI

Secondary descriptor:

FASHION

Optional monogram:

HN

The logo should be:

- Elegant.
- Minimal.
- Professional.
- Feminine.
- Refined.
- Easy to recognize.
- Scalable.

Create:

- Primary logo.
- Black logo.
- White logo.
- Compact HN monogram.
- Favicon.

Do not imitate ELISE trademark typography.

Maintain consistent clear space.

Never stretch or distort the logo.

====================================================
6. TECHNOLOGY STACK
====================================================

Build a single full-stack Next.js application.

FRONTEND:

Next.js App Router
React
TypeScript
Tailwind CSS

ICONS:

Lucide React

UI:

Reusable React components.

Use accessible Radix UI primitives
where they provide meaningful value.

BACKEND:

Next.js Route Handlers
Next.js Server Actions

DATABASE:

SQLite for initial local development.

ORM:

Prisma

VALIDATION:

Zod

FORMS:

React Hook Form

AUTHENTICATION:

Auth.js or a secure compatible solution.

TESTING:

Vitest
React Testing Library
Playwright

PACKAGE MANAGEMENT:

Use the existing project package manager.

For a new project, prefer pnpm.

Do not introduce microservices.

Do not create a separate backend server
unless a verified requirement makes it necessary.

Avoid excessive architectural complexity.

Do not add Redis, Kubernetes, message queues
or distributed infrastructure at this stage.

Use server components where appropriate.

Minimize unnecessary client-side JavaScript.

IMPORTANT DATABASE RULE:

If an existing project already uses a working
PostgreSQL database, preserve it.

Do not force a migration to SQLite.

SQLite is the default for a new local-first project.

Design the database schema to support a future
migration to PostgreSQL.

Do not assume the migration will be automatic.

Document the required migration and testing work.

====================================================
7. WEBSITE INFORMATION ARCHITECTURE
====================================================

Create the following storefront routes:

/

/thoi-trang-cong-so

/hang-moi

/ao-so-mi

/ao-kieu

/ao-vest-blazer

/quan-tay

/chan-vay

/dam-cong-so

/set-cong-so

/bo-suu-tap

/bo-suu-tap/[slug]

/sale

/san-pham/[slug]

/tim-kiem

/yeu-thich

/gio-hang

/thanh-toan

/dat-hang-thanh-cong/[orderCode]

/dang-nhap

/dang-ky

/quen-mat-khau

/tai-khoan

/tai-khoan/thong-tin

/tai-khoan/don-hang

/tai-khoan/don-hang/[id]

/tai-khoan/dia-chi

/gioi-thieu

/lien-he

/huong-dan-chon-size

/chinh-sach-giao-hang

/chinh-sach-doi-tra

/chinh-sach-bao-mat

/dieu-khoan-su-dung

/tra-cuu-don-hang

Every route must display functional content.

Do not create empty placeholder pages.

====================================================
8. GLOBAL HEADER
====================================================

Create a premium officewear fashion header.

DESKTOP HEADER:

Top Announcement Bar:

Height:
34px

Background:
#222222

Text:
#FFFFFF

Example:

"THANH LỊCH MỖI NGÀY CÙNG HÀ NHI"

MAIN HEADER:

Background:
#FFFFFF

Height:
80px

LEFT:

Search.

CENTER:

HÀ NHI FASHION logo.

RIGHT:

Account.
Wishlist.
Shopping Bag.

Use minimal icons.

DISPLAY:

Shopping cart item count.

NAVIGATION:

HÀNG MỚI

THỜI TRANG CÔNG SỞ

ÁO SƠ MI

ÁO KIỂU

VEST & BLAZER

QUẦN TÂY

CHÂN VÁY

ĐẦM CÔNG SỞ

SET CÔNG SỞ

BỘ SƯU TẬP

SALE

DESKTOP DROPDOWN:

Create a multi-column menu for
THỜI TRANG CÔNG SỞ.

COLUMN 1:
DANH MỤC

Áo sơ mi
Áo kiểu
Vest & Blazer
Quần tây
Chân váy
Đầm công sở
Set công sở

COLUMN 2:
PHONG CÁCH

Thanh lịch
Tối giản
Hiện đại
Nữ tính
Công sở cao cấp

COLUMN 3:
BỘ SƯU TẬP

New Arrivals
Modern Office
Elegant Woman
Timeless Basics

MOBILE:

Use:

Hamburger Menu
Centered Logo
Search
Shopping Cart

Opening the hamburger menu must display
a functional navigation drawer.

Use accessible keyboard and focus behavior.

====================================================
9. HOMEPAGE
====================================================

Design a distinctive premium officewear homepage.

The page should look like a polished Vietnamese
women's office fashion brand.

SECTION ORDER:

1. Hero Campaign.
2. New Arrivals.
3. Officewear Categories.
4. Featured Collection.
5. Best Sellers.
6. Office Outfit Inspiration.
7. Featured Products.
8. Brand Story.
9. Newsletter.
10. Footer.

----------------------------------------------------
9.1 HERO BANNER
----------------------------------------------------

Use a premium editorial image composition.

The image should feature professional women's
office fashion.

Examples:

- Elegant white blouse and beige trousers.
- Neutral blazer with tailored pants.
- Sophisticated office midi dress.
- Modern minimalist office outfit.

Recommended colors:

White
Black
Beige
Cream
Grey
Muted Brown

Do not use streetwear photography.

Do not use copyrighted ELISE imagery.

DESKTOP:

Large full-width banner.

Recommended height:
600–720px.

MOBILE:

Dedicated responsive composition.

Recommended height:
440–520px.

TEXT:

"THE ART OF OFFICE ELEGANCE"

Vietnamese subtitle:

"Thanh lịch từ công sở đến mọi khoảnh khắc."

CTA:

"KHÁM PHÁ NGAY"

The CTA must open the appropriate product
category or collection.

----------------------------------------------------
9.2 NEW ARRIVALS
----------------------------------------------------

TITLE:

NEW ARRIVALS

SUBTITLE:

"Những thiết kế công sở mới nhất"

Show 8 products.

DESKTOP:
4 columns.

TABLET:
3 columns.

MOBILE:
2 columns.

Product card must contain:

Product image.
Product name.
Product price.
Original price if discounted.
Color options.
Wishlist button.
Product badge.

Button:

"XEM TẤT CẢ"

----------------------------------------------------
9.3 OFFICEWEAR CATEGORIES
----------------------------------------------------

TITLE:

DANH MỤC THỜI TRANG CÔNG SỞ

Display 6 featured categories:

1. ÁO SƠ MI
2. VEST & BLAZER
3. QUẦN TÂY
4. CHÂN VÁY
5. ĐẦM CÔNG SỞ
6. SET CÔNG SỞ

Use visually consistent image cards.

DESKTOP:

3 columns, 2 rows.

MOBILE:

2 columns.

Each category image must lead to
the appropriate catalog page.

----------------------------------------------------
9.4 FEATURED COLLECTION
----------------------------------------------------

TITLE:

MODERN OFFICE COLLECTION

SUBTITLE:

"Phong cách hiện đại dành cho nàng công sở."

Create an editorial split layout.

LEFT:

Large original fashion image.

RIGHT:

Collection title.

Short description.

CTA button:

"KHÁM PHÁ BỘ SƯU TẬP"

Use generous negative space.

----------------------------------------------------
9.5 BEST SELLERS
----------------------------------------------------

TITLE:

BEST SELLERS

SUBTITLE:

"Những thiết kế được yêu thích"

Display 8 selected products.

For an empty real-order database,
use explicitly configured featured products
rather than falsely claiming genuine sales rankings.

----------------------------------------------------
9.6 OUTFIT INSPIRATION
----------------------------------------------------

TITLE:

OFFICE STYLE INSPIRATION

Show three outfit concepts:

1. MONDAY ELEGANCE

White shirt.
Black tailored trousers.
Minimal blazer.

2. MODERN PROFESSIONAL

Neutral blouse.
Tailored midi skirt.
Structured blazer.

3. FRIDAY CHIC

Elegant office dress.
Lightweight outerwear.
Minimal accessories.

Each concept should link to a corresponding
collection or filtered product page.

----------------------------------------------------
9.7 BRAND STORY
----------------------------------------------------

TITLE:

HÀ NHI FASHION

SUBTITLE:

"ELEGANCE IN EVERY DETAIL"

Brand introduction:

"HÀ NHI FASHION mang đến những thiết kế
thời trang công sở thanh lịch, hiện đại
và tinh tế, giúp người phụ nữ tự tin
thể hiện phong cách riêng."

Use original copy.

Do not invent manufacturing certifications,
awards, or business history.

====================================================
10. PRODUCT CATEGORY PAGES
====================================================

Implement the same reusable catalog system
for all categories.

PRIMARY CATEGORY:

THỜI TRANG CÔNG SỞ NỮ

SECONDARY CATEGORIES:

Áo sơ mi
Áo kiểu
Vest & Blazer
Quần tây
Chân váy
Đầm công sở
Set công sở

Each category page must contain:

Breadcrumb.

Category name.

Category description.

Product count.

Filtering controls.

Sorting controls.

Product grid.

Pagination.

DESKTOP:

Left filter sidebar.

Right product grid.

FILTER SIDEBAR WIDTH:
250px.

PRODUCT GRID:
3–4 columns depending on available width.

MOBILE:

Filter drawer.

Two-column product grid.

----------------------------------------------------
10.1 FILTERS
----------------------------------------------------

Implement real product filtering.

CATEGORY FILTER:

Áo sơ mi.
Áo kiểu.
Vest & Blazer.
Quần tây.
Chân váy.
Đầm công sở.
Set công sở.

PRICE FILTER:

Below 300,000 VND.

300,000–500,000 VND.

500,000–800,000 VND.

800,000–1,200,000 VND.

Above 1,200,000 VND.

Custom price range.

SIZE FILTER:

XS
S
M
L
XL
XXL

COLOR FILTER:

White
Black
Beige
Cream
Brown
Grey
Navy
Pink
Blue

MATERIAL FILTER:

Cotton
Linen
Satin
Silk
Tweed
Polyester Blend
Viscose
Chiffon

FIT FILTER:

Slim Fit
Regular Fit
Relaxed Fit
Straight
Wide Leg
A-Line

OCCASION FILTER:

Daily Office
Business Meeting
Formal Event
Work Presentation
Business Casual

AVAILABILITY FILTER:

In Stock
On Sale
New Arrivals

FILTER RULES:

Allow combining multiple filters.

Keep filter state in URL parameters.

Provide clear filter reset.

Update result count dynamically.

Use database queries.

Do not fetch all products merely
to filter them in the browser.

----------------------------------------------------
10.2 SORTING
----------------------------------------------------

Options:

Mới nhất.

Bán chạy.

Giá thấp đến cao.

Giá cao đến thấp.

Tên A–Z.

Implement functional sorting.

====================================================
11. PRODUCT CARD
====================================================

Create a refined reusable product card.

IMAGE RATIO:

3:4

IMAGE BEHAVIOR:

Subtle hover zoom.

Optional second image on hover.

PRODUCT INFORMATION:

Product name.

Current price.

Original price.

Discount percentage.

Available color swatches.

Wishlist button.

Optional NEW or SALE label.

Example product:

"Áo Sơ Mi Lụa Công Sở Thanh Lịch"

690.000đ

Another example:

"Quần Tây Nữ Ống Suông Cao Cấp"

790.000đ

Do not overcrowd product cards.

Keep consistent image dimensions.

Avoid excessive badges.

====================================================
12. PRODUCT DETAIL PAGE
====================================================

Create a professional fashion product page.

DESKTOP LAYOUT:

LEFT:
Product gallery.

RIGHT:
Product details and purchasing options.

IMAGE GALLERY:

Main image.
Multiple thumbnails.
Zoom.
Next/previous navigation.
Mobile swipe support.

PRODUCT DETAILS:

Product name.

SKU.

Price.

Sale price if available.

Availability.

Color selection.

Size selection.

Quantity.

Add to cart.

Buy now.

Wishlist.

PRODUCT INFORMATION:

Description.

Material.

Fit.

Color.

Measurement information.

Care instructions.

SIZE GUIDE:

Create an officewear-specific size guide.

Measurements:

Bust.
Waist.
Hip.
Shoulder.
Garment length.

Where relevant:

Sleeve length.
Trouser length.
Skirt length.

Include XS–XXL.

Size data must be configurable.

Do not claim generic size measurements
are manufacturer-verified.

Provide a related products section:

"CÓ THỂ NÀNG SẼ THÍCH"

Display 4 related products.

====================================================
13. PRODUCT SEARCH
====================================================

Implement a functional search system.

Search by:

Product name.

SKU.

Category.

Material.

Style.

Collection.

Support Vietnamese text.

Use accent-insensitive search where feasible.

Example:

"ao so mi trang"

should match:

"Áo sơ mi trắng"

Provide:

Search suggestions.

Search results page.

No-results state.

Loading state.

Clear search button.

Do not use a fake search interface.

====================================================
14. WISHLIST
====================================================

Users can:

Add products to wishlist.

Remove products.

View saved items.

Navigate to product pages.

Add available product variants to cart.

Support guest wishlist locally.

Store authenticated wishlist in the database.

Merge guest wishlist after login.

Prevent duplicate wishlist entries.

====================================================
15. SHOPPING CART
====================================================

Implement a real cart system.

Users can:

Add products.

Choose valid variants.

Increase quantity.

Decrease quantity.

Remove products.

View subtotal.

View estimated shipping.

Proceed to checkout.

Cart must display:

Product image.

Product name.

SKU.

Size.

Color.

Quantity.

Unit price.

Subtotal.

Handle out-of-stock products.

Prevent quantity exceeding available inventory.

Store cart data persistently.

Guest cart can use local persistence.

Authenticated cart must sync
with the database.

Recalculate prices on the server.

Do not trust client-submitted prices.

====================================================
16. CHECKOUT
====================================================

Create a complete local checkout workflow.

IMPORTANT:

This is a local development website.

Do not connect real payment gateways yet.

Do not process real payments.

The purpose is to implement and verify
the ordering workflow.

CHECKOUT FORM:

Customer Name.

Phone Number.

Email.

Province/City.

Ward/Commune.

Street Address.

Address Details.

Order Notes.

PAYMENT METHOD:

Cash on Delivery (COD).

For local development, COD means
the order is recorded as unpaid
and awaiting fulfillment.

No real payment is collected.

ORDER SUMMARY:

Products.

Quantities.

Subtotal.

Discount.

Shipping fee.

Final total.

ORDER PROCESSING:

1. Validate customer details.

2. Validate shipping address.

3. Validate selected product variants.

4. Validate stock.

5. Recalculate prices on server.

6. Calculate discounts.

7. Calculate shipping.

8. Create an order in the database.

9. Reserve or deduct stock atomically.

10. Generate unique order code.

11. Save order items and price snapshots.

12. Clear purchased cart items.

13. Navigate to order confirmation.

Prevent duplicate orders when
the user submits multiple times.

Display a success message only after
the database transaction succeeds.

EXAMPLE ORDER CODE:

HN-20261017-0001

Use a reliable uniqueness strategy.

ORDER STATUS:

Pending.

Confirmed.

Processing.

Shipping.

Delivered.

Completed.

Cancelled.

PAYMENT STATUS:

Unpaid.

Paid.

Refunded.

Do not automatically mark COD orders
as paid after checkout.

====================================================
17. CUSTOMER ACCOUNTS
====================================================

Create customer authentication.

FEATURES:

Registration.

Login.

Logout.

Password reset.

Profile management.

Address management.

Order history.

Order details.

Wishlist.

REGISTRATION:

Full Name.

Email.

Phone.

Password.

Confirm Password.

Validate forms.

Hash passwords securely.

Do not store plain-text passwords.

ACCOUNT DASHBOARD:

Thông tin cá nhân.

Đơn hàng của tôi.

Địa chỉ giao hàng.

Sản phẩm yêu thích.

Đổi mật khẩu.

Đăng xuất.

Users must not access another
customer's private information.

====================================================
18. ADMINISTRATION SYSTEM
====================================================

Create a separate local admin interface.

Admin URL:

http://localhost:3000/admin

ADMIN MENU:

Tổng quan.

Sản phẩm.

Danh mục.

Bộ sưu tập.

Đơn hàng.

Khách hàng.

Kho hàng.

Mã giảm giá.

Banner.

Báo cáo.

Cài đặt.

----------------------------------------------------
18.1 ADMIN DASHBOARD
----------------------------------------------------

Display:

Total Orders.

Pending Orders.

Completed Orders.

Cancelled Orders.

Total Paid Revenue.

Active Products.

Low Stock Products.

Total Customers.

CHARTS:

Revenue over time.

Orders over time.

Order status distribution.

Top-selling products.

Use actual database records.

Do not display fake real-world revenue.

Seeded demo data may be used,
but must be distinguishable
from actual business activity.

----------------------------------------------------
18.2 PRODUCT MANAGEMENT
----------------------------------------------------

Admin must be able to:

Create products.

Edit products.

Archive products.

Activate/deactivate products.

Upload images.

Set prices.

Set sale prices.

Manage product variants.

Manage inventory.

Assign categories.

Assign collections.

PRODUCT FIELDS:

Name.

Slug.

SKU.

Description.

Category.

Material.

Style.

Fit.

Price.

Sale Price.

Images.

Colors.

Sizes.

Inventory.

Status.

Featured Flag.

New Arrival Flag.

Prevent duplicate SKUs.

Validate pricing.

----------------------------------------------------
18.3 INVENTORY MANAGEMENT
----------------------------------------------------

Track inventory by variant.

Example:

Product:
Áo Sơ Mi Trắng HN001

Size S:
12 units.

Size M:
20 units.

Size L:
15 units.

Size XL:
8 units.

Allow admin to:

Update stock.

View stock movement history.

See low-stock warnings.

Record restocking.

Prevent negative inventory.

Use SQLite-compatible atomic transactions.

If concurrency requirements exceed the
capabilities of the local SQLite setup,
document the limitation and ensure
safe behavior for the local environment.

----------------------------------------------------
18.4 ORDER MANAGEMENT
----------------------------------------------------

Admin can:

View all orders.

Search orders.

Filter by status.

Open order details.

Confirm orders.

Update shipping status.

Cancel eligible orders.

Record legitimate COD payment receipt.

Review order history.

Store timestamps for status changes.

Prevent invalid status transitions.

----------------------------------------------------
18.5 CUSTOMER MANAGEMENT
----------------------------------------------------

Display:

Customer name.

Email.

Phone.

Registration date.

Number of orders.

Total paid spending.

Account status.

Do not expose password hashes.

----------------------------------------------------
18.6 COUPON MANAGEMENT
----------------------------------------------------

Support:

Percentage discount.

Fixed discount.

Minimum order amount.

Maximum discount.

Expiry date.

Usage limits.

Coupon activation.

Validate coupon usage server-side.

----------------------------------------------------
18.7 CONTENT MANAGEMENT
----------------------------------------------------

Admin can update:

Homepage banner.

Promotional announcement.

Featured products.

Collections.

Homepage text.

Newsletter text.

Brand information.

Footer contact details.

Do not require source code edits
for ordinary storefront content updates.

====================================================
19. DATABASE DESIGN
====================================================

Use Prisma with SQLite for
initial local development.

Create models for:

User.

Account.

Session.

Address.

Category.

Product.

ProductImage.

ProductVariant.

Collection.

CollectionProduct.

Wishlist.

WishlistItem.

Cart.

CartItem.

Order.

OrderItem.

OrderStatusHistory.

Payment.

InventoryMovement.

Coupon.

CouponRedemption.

Banner.

StoreSetting.

AuditLog.

DATABASE RULES:

Use stable unique IDs.

Use foreign-key relationships.

Use unique constraints.

Use indexes for frequently searched fields.

Use createdAt and updatedAt.

Store VND amounts as integers.

Example:

690000

Do not use floating-point values
for monetary calculations.

Preserve historical order prices.

Do not delete historical order information
when a product is archived.

Enable SQLite foreign-key enforcement.

Use transactions for critical operations.

Create Prisma migrations.

Create a reproducible seed script.

====================================================
20. SAMPLE PRODUCT DATABASE
====================================================

Generate 100 original demo products.

DISTRIBUTION:

Áo sơ mi:
18 products.

Áo kiểu:
14 products.

Vest & Blazer:
12 products.

Quần tây:
16 products.

Chân váy:
14 products.

Đầm công sở:
16 products.

Set công sở:
10 products.

TOTAL:
100 products.

Each product should have:

Unique name.

Unique SKU.

Category.

Description.

Material.

Fit.

Price.

Optional sale price.

Color options.

Size variants.

Inventory quantity.

Image reference.

Status.

Demo prices:

250,000–2,500,000 VND.

Use realistic category-specific pricing.

EXAMPLE PRODUCTS:

Áo Sơ Mi Lụa Trắng Thanh Lịch.

Áo Kiểu Cổ Nơ Công Sở.

Blazer Nữ Dáng Suông Beige.

Quần Tây Nữ Ống Đứng.

Quần Tây Nữ Ống Rộng.

Chân Váy Bút Chì Công Sở.

Chân Váy Midi Xếp Ly.

Đầm Công Sở Dáng A.

Đầm Midi Tay Lỡ Thanh Lịch.

Set Vest Công Sở Hiện Đại.

Create varied original names and descriptions.

Do not copy ELISE product data.

----------------------------------------------------
20.1 PRODUCT IMAGES
----------------------------------------------------

Use original or properly licensed images.

Preferred visual style:

- Professional female office outfits.
- Neutral fashion photography.
- Minimal editorial backgrounds.
- Soft studio lighting.
- Realistic garment presentation.

Do not use copyrighted images from ELISE.

If licensed product photography is unavailable,
use coherent local placeholder images.

Avoid unrelated generic product photography.

Do not misrepresent a placeholder garment
as an actual product photograph.

Do not depend on unstable external hotlinks.

Use a reusable image component with fallbacks.

====================================================
21. SEO BASICS
====================================================

Even though this is a local website,
implement a clean SEO-ready structure.

Include:

Semantic HTML.

Page titles.

Meta descriptions.

Friendly URLs.

Breadcrumbs.

Image alt attributes.

Proper heading hierarchy.

Sitemap generation.

Robots configuration appropriate
for the development environment.

Do not submit the website to search engines.

Do not connect analytics platforms yet.

Do not configure public indexing.

====================================================
22. RESPONSIVE REQUIREMENTS
====================================================

The entire website must work on:

375px.

390px.

768px.

1024px.

1280px.

1440px.

1920px.

DESKTOP:

Horizontal navigation.

Wide hero.

Four-column product grid when appropriate.

Sidebar filters.

Two-column product detail page.

MOBILE:

Hamburger menu.

Two-column product grid.

Filter drawer.

Swipeable gallery.

Responsive cart.

Single-column checkout.

Touch-friendly controls.

No horizontal overflow.

No overlapping buttons.

No unreadable text.

No hover-only critical interactions.

====================================================
23. SECURITY REQUIREMENTS
====================================================

Implement:

Secure authentication.

Password hashing.

Server-side authorization.

Input validation.

Safe database queries.

Protected admin routes.

Secure session management.

Rate limiting where necessary.

Safe image upload validation.

No hardcoded production secrets.

No exposure of customer private data.

No client-controlled prices.

No client-controlled payment status.

No unauthorized order modifications.

No duplicate order creation.

No negative inventory.

Use environment variables.

Create .env.example.

Use development-only test credentials
that are not suitable for production.

====================================================
24. TESTING
====================================================

Implement automated tests.

TEST CASES:

1. Homepage loads.

2. Main navigation works.

3. Category pages show products.

4. Product filtering works.

5. Product sorting works.

6. Product search works.

7. Product detail page loads.

8. Variant selection works.

9. Out-of-stock variants cannot be purchased.

10. Add to cart works.

11. Update cart quantity works.

12. Remove from cart works.

13. COD checkout creates an order.

14. Order totals are calculated server-side.

15. Order appears in admin dashboard.

16. Admin can update order status.

17. Customer login works.

18. Customer order history works.

19. Admin can create a product.

20. New product appears in the storefront.

21. Admin can update inventory.

22. Unauthorized admin access is denied.

23. Duplicate checkout submissions are prevented.

24. Mobile navigation works.

25. Mobile checkout works.

26. SQLite migrations execute successfully.

27. Seed data loads successfully.

28. Production build succeeds locally.

Use Playwright for critical E2E workflows.

Do not mark tests as passed unless executed.

Fix discovered issues where feasible.

====================================================
25. LOCAL DEVELOPMENT WORKFLOW
====================================================

The application must run locally on macOS.

REQUIRED COMMANDS:

Install dependencies:

pnpm install

Generate Prisma client:

pnpm prisma generate

Apply migrations:

pnpm prisma migrate dev

Seed database:

pnpm prisma db seed

Start development server:

pnpm dev

LOCAL WEBSITE:

http://localhost:3000

LOCAL ADMIN:

http://localhost:3000/admin

These commands must match the actual package
scripts configured in the project.

If the repository already has different
working scripts, document those instead.

Do not hardcode an admin password.

Provide a secure development-only method
for creating an admin account.

Do not require:

Vercel.

Netlify.

Paid hosting.

Paid databases.

Cloud deployment.

Production payment gateway credentials.

Domain configuration.

GitHub publication.

The entire core application must be testable
locally without external production services.

====================================================
26. DEVELOPMENT PRIORITIES
====================================================

Build the application coherently.

Recommended implementation sequence:

1. Inspect the current repository.

2. Configure Next.js and Tailwind.

3. Create design tokens.

4. Implement reusable layout components.

5. Build homepage.

6. Build product catalog pages.

7. Implement the Prisma database schema.

8. Create demo products.

9. Connect catalog pages to database.

10. Implement search, filtering and sorting.

11. Build product details.

12. Implement variants and inventory.

13. Implement wishlist.

14. Implement shopping cart.

15. Implement local COD checkout.

16. Implement customer accounts.

17. Build admin authentication.

18. Build admin management pages.

19. Implement order status workflows.

20. Implement homepage content management.

21. Add basic SEO metadata.

22. Implement automated tests.

23. Test desktop and mobile layouts.

24. Fix critical issues.

25. Document local startup instructions.

These are internal implementation steps.

Do not create separate project versions.

Maintain one coherent codebase.

Do not require user approval between
routine development steps.

====================================================
27. COMPLETION CRITERIA
====================================================

The project is complete for the LOCAL
development objective when:

[ ] Website runs on localhost.

[ ] Homepage is visually complete.

[ ] Navigation works.

[ ] All specified product categories work.

[ ] 100 demo products are available.

[ ] Catalog data comes from SQLite.

[ ] Product filters work.

[ ] Search works.

[ ] Sorting works.

[ ] Product variants work.

[ ] Wishlist works.

[ ] Shopping cart works.

[ ] Guest COD checkout works.

[ ] Orders persist in the database.

[ ] Customer authentication works.

[ ] Order history works.

[ ] Admin authentication works.

[ ] Admin can manage products.

[ ] Admin can manage inventory.

[ ] Admin can manage orders.

[ ] Admin can manage categories.

[ ] Admin dashboard uses database data.

[ ] Mobile layouts work.

[ ] Critical tests pass.

[ ] Local build succeeds.

[ ] No ELISE copyrighted assets are copied.

[ ] No public deployment is performed.

[ ] No remote repository push is performed.

====================================================
28. FINAL REPORT
====================================================

After implementation, provide a report
in Vietnamese containing:

1. Completed website pages.

2. Completed shopping functions.

3. Completed admin functions.

4. Database structure.

5. Sample product data status.

6. Local development URL.

7. Admin account setup instructions.

8. Commands to start the application.

9. Automated test results.

10. Known technical limitations.

11. Features deferred until public launch.

12. Remaining security or migration work.

Clearly classify work as:

- Implemented and tested.
- Implemented but not fully tested.
- Not implemented.

Do not make unsupported claims
about production readiness.

====================================================
29. FINAL NON-NEGOTIABLE INSTRUCTION
====================================================

Build HÀ NHI FASHION as a complete
LOCAL-FIRST women's officewear
e-commerce web application.

The website must be:

Elegant.

Professional.

Feminine.

Minimalist.

Fully responsive.

Database-driven.

Functionally complete for local testing.

Maintainable.

Original.

Inspired by the general shopping functionality
of premium fashion retailers such as ELISE,
without copying their protected content.

Do not deploy.

Do not publish.

Do not push to GitHub.

Do not build a public Site.

Keep all work in the current local workspace.

START IMPLEMENTING THE WEBSITE.

Do not stop at planning or mockups.

---

## Phụ lục được yêu cầu ngày 17/10/2026 — danh mục, phối đồ và size

# HÀ NHI FASHION — Product Diversity, Color Styling, Product Descriptions and Size Advisor

## Project instruction

Update the existing **HÀ NHI FASHION** women's officewear e-commerce application.

**Do not redesign the existing website layout.** The overall homepage structure, navigation hierarchy, page proportions, typography system, luxury-minimalist visual identity, and primary user journeys have already been selected.

This update focuses specifically on:

1. Increasing the diversity and realism of the fashion catalog.
2. Introducing elegant, cool, soft and sophisticated clothing colors.
3. Writing natural, detailed Vietnamese product descriptions.
4. Making the actual garment the primary visual focus.
5. Supporting multiple authentic color variants per product.
6. Introducing coordinated officewear styling recommendations.
7. Building a functional size guide and interactive size advisor.
8. Refining all related Vietnamese interface copy.

Preserve all existing functional features, including catalog navigation, filters, product variants, wishlist, shopping cart, checkout, customer accounts, admin management and database integration.

Continue development entirely on localhost. Do not deploy, publish, or push to GitHub.

---

## 1. Product diversity: make the catalog feel like a real officewear boutique

The current catalog needs more variety in garments, silhouettes, colors, materials, and styling.

Avoid generating dozens of products with nearly identical designs and only slightly different names.

Create approximately **180 distinct women's officewear products** across the following categories:

| Category | Suggested count |
|---|---:|
| Áo sơ mi | 24 |
| Áo kiểu | 22 |
| Vest & Blazer | 18 |
| Quần tây | 25 |
| Chân váy | 25 |
| Đầm công sở | 30 |
| Set công sở | 24 |
| Áo len & Cardigan | 12 |
| **Total** | **180** |

These are distinct product designs, not 180 color variants of the same design.

### Áo sơ mi

Include variations such as:

- Sơ mi lụa cổ đức.
- Sơ mi cotton dáng suông.
- Sơ mi cổ nơ mềm mại.
- Sơ mi cổ trụ.
- Sơ mi tay bồng nhẹ.
- Sơ mi tay lỡ.
- Sơ mi sọc xanh trắng.
- Sơ mi cổ V.
- Sơ mi chiết eo.
- Sơ mi dáng oversized thanh lịch.
- Sơ mi satin trơn.
- Sơ mi phối nút ngọc trai.

### Áo kiểu

Include:

- Áo cổ vuông.
- Áo cổ bèo.
- Áo peplum.
- Áo tay phồng.
- Áo cổ thuyền.
- Áo sát nách công sở.
- Áo cổ tim.
- Áo cổ nơ.
- Áo kiểu xếp ly.
- Áo phối ren tinh tế.
- Áo chiffon hai lớp.
- Áo kiểu chiết eo.

### Quần tây

Include:

- Quần ống đứng.
- Quần ống suông.
- Quần ống rộng.
- Quần cạp cao.
- Quần ly trước.
- Quần lưng thun sau.
- Quần culottes.
- Quần ống loe nhẹ.
- Quần dáng slim.
- Quần baggy công sở.

### Chân váy

Include:

- Chân váy chữ A.
- Chân váy bút chì.
- Chân váy midi.
- Chân váy xếp ly.
- Chân váy đuôi cá.
- Chân váy xẻ trước.
- Chân váy xẻ sau.
- Chân váy tweed.
- Chân váy dáng suông.
- Chân váy cạp cao.
- Chân váy phối nút.
- Chân váy vạt chéo.

### Đầm công sở

Include:

- Đầm chữ A.
- Đầm midi.
- Đầm sơ mi.
- Đầm chiết eo.
- Đầm cổ vuông.
- Đầm cổ V.
- Đầm tay lỡ.
- Đầm xếp ly.
- Đầm dáng suông.
- Đầm vest.
- Đầm đuôi cá.
- Đầm thắt đai.
- Đầm phối màu tinh tế.
- Đầm tweed.

### Set công sở

Include:

- Set áo sơ mi và chân váy.
- Set áo kiểu và quần tây.
- Set blazer và quần.
- Set blazer và chân váy.
- Set vest ba món.
- Set áo gile và quần.
- Set áo tweed và chân váy.
- Set áo peplum và chân váy.
- Set áo sát nách và blazer.
- Set công sở tối giản.

For sets, specify precisely what is included in the purchase.

For example:

"Bộ gồm áo blazer và quần tây."

Never show a three-piece outfit and imply all three pieces are included if only one or two pieces are being sold.

---

## 2. Elegant and refreshing color palette

Introduce a wider range of cool, soft, airy officewear colors.

The clothing should evoke elegance, freshness, femininity, comfort and a premium modern office aesthetic.

### Primary fashion colors

| Vietnamese name | English name | Reference HEX |
|---|---|---|
| Xanh dương nhạt | Powder Blue | `#BFD7EA` |
| Xanh baby | Baby Blue | `#D6EAF8` |
| Xanh pastel | Pastel Blue | `#B6D6E6` |
| Xanh xám | Dusty Blue | `#9CB8C8` |
| Xanh sage | Sage Green | `#B8C7B0` |
| Xanh bạc hà | Soft Mint | `#D5E9DF` |
| Be sữa | Milk Beige | `#E8DDCF` |
| Be cát | Sand Beige | `#D9C9B6` |
| Trắng ngà | Ivory | `#F5F1E8` |
| Kem nhạt | Soft Cream | `#F6EBDD` |
| Hồng phấn | Blush Pink | `#EBCDD0` |
| Hồng nude | Nude Rose | `#D9B9AF` |
| Tím lavender | Lavender | `#D8D0E7` |
| Xám ngọc trai | Pearl Grey | `#DADDE0` |
| Nâu taupe | Soft Taupe | `#B5A69A` |
| Xanh navy | Navy | `#263B55` |
| Đen thanh lịch | Classic Black | `#252525` |

The HEX values represent catalog swatch colors, not an instruction to recolor the website's existing design system.

### Color distribution

Aim for a balanced clothing assortment:

- 35% light neutral colors: white, ivory, beige, cream.
- 30% soft cool colors: powder blue, pastel blue, sage, mint.
- 20% classic officewear tones: navy, black, grey, taupe.
- 15% subtle feminine accents: blush, dusty rose, lavender.

These are merchandising targets, not strict database constraints.

Do not make every garment beige.

Do not make the entire catalog blue.

Create a visually harmonious assortment with enough contrast and variety.

### Color realism

Every color swatch must correspond to a real variant record.

When a user chooses **Xanh dương nhạt**, the primary product gallery must switch to the images associated with that specific color.

Do not display a beige garment while the selected variant is blue.

Do not reuse unrelated photographs to represent different colors.

Do not generate misleading product imagery or claim color accuracy beyond the available photographs.

For products with multiple color options, use **2–5 appropriate colors**, depending on the garment design.

Do not force every product to have the same number of colors.

---

## 3. Make the garment the hero of every product image

Product photography must focus on the actual garment being sold.

This is a critical requirement.

### Shirt example

If the product is an office shirt, the shirt must be the main subject.

- Show the collar, sleeves, buttons, fabric texture, drape and silhouette.
- Use a composition that gives the shirt more visual attention than the trousers, handbag or accessories.
- Include full-outfit images only as secondary styling photographs.
- Ensure the product card image unmistakably communicates that the listed product is a shirt.

### Skirt example

If the product is a skirt:

- Show the waistband.
- Show the skirt silhouette.
- Show the hemline and relevant length.
- Demonstrate how the skirt fits into an office outfit.
- Keep the skirt clearly visible.

### Trousers example

If the product is trousers:

- Show the waist and leg shape.
- Include an image revealing the full trouser length.
- Provide suitable front and side views.
- Avoid poses that hide the trousers completely.

### Dress example

If the product is a dress:

- Show the whole dress.
- Preserve the actual dress proportions.
- Include close-ups of meaningful design details.
- Show the neckline, waist, sleeves and skirt length when relevant.

### Product gallery requirements

Where suitable images are available, provide:

1. Primary garment-focused image.
2. Front view.
3. Back or side view.
4. Fabric/detail close-up.
5. Full outfit styling image.
6. Alternative styling image.

Use only legitimate images with appropriate usage rights.

For local demonstration data without verified product photographs, use consistent placeholders or properly licensed imagery rather than inventing photographic evidence of a garment's actual construction.

### Clicking product images

The entire primary product card image must link to the correct product detail page.

If the card shows a shirt, clicking the shirt image opens that shirt's product page.

A supporting pair of trousers shown in the outfit must not cause the entire card to open the trousers product.

For dedicated **Shop the Look** images, individual garments may have interactive hotspots.

Each hotspot must link to the correct product SKU.

For example:

- Click shirt → Shirt product page.
- Click trousers → Trousers product page.
- Click blazer → Blazer product page.

Do not make all outfit hotspots link to the same product.

---

## 4. Realistic Vietnamese product names and descriptions

All product copy must read naturally, like content prepared for a professional fashion boutique.

Do not use generic repetitive descriptions.

Do not show phrases such as:

- "AI-generated product."
- "Created by AI."
- "Synthetic fashion product."
- "AI mockup."
- "This product was generated automatically."
- "Sản phẩm được tạo bởi AI."

Do not use those labels as ordinary customer-facing product copy.

Keep internal demo-data provenance documented separately for developers and administrators.

**Accuracy is mandatory:** Product descriptions must be consistent with the actual product attributes stored in the database. Never invent verified fabric compositions, manufacturing origins, certifications, exact measurements or promises about real merchandise without supporting product information.

For local sample products, write internally consistent illustrative retail descriptions based on their configured sample attributes. They must be reviewed against actual merchandise before a real commercial launch.

### Required product description structure

Each product needs:

**A. Product title**

A natural, descriptive Vietnamese name.

Example:

"Áo Sơ Mi Lụa Cổ Nơ Xanh Pastel"

**B. Short description**

Two to three elegant sentences describing:

- Style.
- Silhouette.
- Material.
- Occasion.
- Overall fashion impression.

**C. Material and design details**

Include:

- Main fabric.
- Lining, if applicable.
- Texture.
- Fit.
- Collar.
- Sleeves.
- Waist or hem construction.
- Closure details.
- Other relevant design features.

**D. Styling suggestions**

Provide one or two realistic combinations using matching products from the catalog.

**E. Care instructions**

Include care recommendations appropriate to the confirmed fabric or the configured sample material.

**F. Size and fit**

Include the cut, approximate fit characteristics and size guide access.

### Example product 1: Shirt

**Áo Sơ Mi Lụa Cổ Nơ Xanh Pastel**

"Mang nét thanh lịch và nữ tính, mẫu sơ mi cổ nơ gây ấn tượng với sắc xanh pastel dịu nhẹ cùng phom dáng mềm mại. Thiết kế cổ nơ tạo điểm nhấn tinh tế, dễ dàng kết hợp cùng quần tây hoặc chân váy cho những ngày làm việc chỉn chu."

**Chi tiết sản phẩm**

- Chất liệu: Vải satin mềm mại theo thông tin sản phẩm.
- Kiểu dáng: Suông nhẹ.
- Cổ áo: Cổ nơ.
- Tay áo: Tay dài.
- Màu sắc: Xanh pastel, trắng ngà, be sữa.
- Phong cách: Thanh lịch, nữ tính, công sở.

**Gợi ý phối đồ**

"Phối cùng quần tây ống suông màu kem để tạo vẻ ngoài nhẹ nhàng, hoặc kết hợp với chân váy bút chì màu be cho những buổi gặp gỡ cần sự trang nhã."

### Example product 2: Trousers

**Quần Tây Ống Suông Cạp Cao Màu Be**

"Thiết kế quần tây cạp cao với đường ly tinh tế giúp tổng thể trang phục trở nên gọn gàng và cân đối. Phom ống suông mang đến vẻ hiện đại, phù hợp khi kết hợp cùng áo sơ mi, áo kiểu hoặc blazer."

**Chi tiết sản phẩm**

- Chất liệu: Vải dệt pha polyester và viscose theo thông tin sản phẩm.
- Kiểu dáng: Ống suông.
- Cạp: Cạp cao.
- Chi tiết: Ly trước.
- Màu sắc: Be, đen, xám nhạt.
- Phong cách: Công sở hiện đại.

**Gợi ý phối đồ**

"Kết hợp cùng sơ mi xanh dương nhạt và giày cao gót tông nude để hoàn thiện bộ trang phục công sở thanh lịch."

### Example product 3: Skirt

**Chân Váy Midi Xếp Ly Màu Kem**

"Những đường xếp ly mềm mại tạo chuyển động uyển chuyển cho mẫu chân váy midi. Gam kem nhẹ nhàng giúp thiết kế dễ dàng kết hợp với áo sơ mi pastel, áo kiểu trắng ngà hoặc cardigan mỏng."

**Chi tiết sản phẩm**

- Chất liệu: Vải dệt mềm theo thông tin sản phẩm.
- Kiểu dáng: Midi xếp ly.
- Chiều dài: Qua gối theo bảng thông số sản phẩm.
- Màu sắc: Kem, xanh xám, hồng phấn.
- Phong cách: Thanh lịch, nữ tính.

### Example product 4: Office set

**Set Blazer Và Chân Váy Xanh Xám Thanh Lịch**

"Sự kết hợp đồng điệu giữa blazer dáng gọn và chân váy thanh lịch mang đến diện mạo chỉn chu, hiện đại. Tông xanh xám nhẹ nhàng tạo cảm giác tinh tế, thích hợp cho môi trường công sở và những buổi gặp gỡ chuyên nghiệp."

**Chi tiết sản phẩm**

- Bộ sản phẩm gồm: 1 blazer và 1 chân váy.
- Chất liệu: Theo thông tin riêng của từng thành phần.
- Phom dáng: Thanh lịch, gọn gàng.
- Màu sắc: Xanh xám, be, đen.
- Phong cách: Công sở chuyên nghiệp.

### Product content rules

Descriptions must not be identical across products.

Different garments require different content.

Avoid excessive superlatives such as "hoàn hảo nhất", "chất lượng số một" or "đảm bảo tuyệt đối".

Use concise, expressive and credible Vietnamese.

Maintain a slightly stronger font weight for product descriptions than for purely decorative editorial copy.

---

## 5. Product color variants and coordinated styling

Each supported product color must have its own variant-specific visual presentation.

### Example product

Product:

"Áo Sơ Mi Lụa Cổ Nơ"

Available colors:

- Xanh pastel.
- Trắng ngà.
- Be sữa.
- Hồng phấn.

### Variant behavior

When the customer selects:

**Xanh pastel**

Display the pastel-blue shirt images.

Suggested combinations:

- Quần tây trắng kem.
- Chân váy midi be.
- Blazer trắng ngà.

**Trắng ngà**

Display the ivory shirt images.

Suggested combinations:

- Quần tây xanh navy.
- Chân váy xanh xám.
- Blazer be.

**Be sữa**

Display the milk-beige shirt images.

Suggested combinations:

- Quần tây nâu taupe.
- Chân váy kem.
- Blazer xanh pastel.

**Hồng phấn**

Display the blush-pink shirt images.

Suggested combinations:

- Quần tây trắng ngà.
- Chân váy xám nhạt.
- Blazer màu kem.

### Styling feature

Create a product-detail section titled:

**GỢI Ý PHỐI ĐỒ CÙNG NÀNG**

Supporting text:

"Khám phá những cách kết hợp nhẹ nhàng để hoàn thiện phong cách của riêng nàng."

For each selected color:

- Show 2–3 relevant outfit combinations.
- Link to actual available products in the local catalog.
- Match garment colors harmoniously.
- Match officewear silhouettes appropriately.
- Never recommend archived or unavailable products as immediately purchasable.
- Make it clear which pieces are sold separately.
- Provide prices for individual products when useful.

Create a related data model such as:

`ProductColorVariant → OutfitCombination → OutfitItem`

An equivalent normalized design is acceptable.

Each outfit recommendation should be editable in the admin interface.

Do not invent unavailable product combinations as purchasable sets.

If a complete look is shown, include a section listing every garment actually included.

### Suggested outfit styling principles

Use combinations such as:

- Powder blue + ivory.
- Beige + white.
- Sage green + cream.
- Blush pink + pearl grey.
- Dusty blue + milk beige.
- Navy + ivory.
- Taupe + cream.
- Lavender + soft grey.

Favor harmonious professional combinations.

Do not force every item into a monochromatic outfit.

Offer enough variety to make the website visually interesting.

---

## 6. Size guide and interactive size advisor

Add two related functions to every product detail page:

**HƯỚNG DẪN CHỌN SIZE**

**TƯ VẤN CHỌN SIZE**

Place both near the size selector and the Add to Cart button.

Use elegant text-based links or refined outlined buttons.

Do not make these features look like loud promotional banners.

### Customer-facing microcopy

Below the size selector, display:

**"Chưa chắc chắn về kích cỡ? Để HÀ NHI giúp nàng chọn size phù hợp nhé."**

Provide a link:

**"Tư vấn chọn size"**

The link opens a responsive modal or drawer.

### Size advisor interface

Modal heading:

**TƯ VẤN CHỌN SIZE CÙNG HÀ NHI**

Description:

"Chỉ cần chia sẻ một vài thông tin cơ bản, HÀ NHI sẽ gợi ý kích cỡ để nàng dễ dàng lựa chọn hơn."

Create the following fields:

| Field | Required | Unit |
|---|---|---|
| Chiều cao | Yes (*) | cm |
| Cân nặng | Yes (*) | kg |
| Vòng ngực | No | cm |
| Vòng eo | No | cm |
| Vòng mông | No | cm |

Labels:

**Chiều cao (*)**

Placeholder:
"Ví dụ: 160"

**Cân nặng (*)**

Placeholder:
"Ví dụ: 50"

**Vòng ngực**

Placeholder:
"Không bắt buộc"

**Vòng eo**

Placeholder:
"Không bắt buộc"

**Vòng mông**

Placeholder:
"Không bắt buộc"

Below the fields, display:

"* Thông tin bắt buộc."

Secondary note:

"Nếu có thêm số đo ba vòng, nàng có thể điền để nhận được gợi ý sát với vóc dáng hơn."

### Input requirements

Height and weight must be required.

Bust, waist and hips must be optional.

Do not prevent the customer from requesting a size recommendation when all three optional measurements are blank.

Support decimal values when appropriate.

Reject zero, negative numbers and invalid text.

Show gentle Vietnamese validation messages.

Examples:

"Vui lòng nhập chiều cao của nàng."

"Vui lòng nhập cân nặng để HÀ NHI có thể gợi ý kích cỡ."

"Thông tin này chưa đúng định dạng, nàng thử kiểm tra lại nhé."

Avoid judgmental or body-shaming language.

Do not describe body measurements as attractive, unattractive, ideal or undesirable.

### Primary action

Button:

**"XEM SIZE GỢI Ý"**

Secondary action:

**"XEM BẢNG SIZE CHI TIẾT"**

### Recommendation result

After submission, display:

**"HÀ NHI GỢI Ý SIZE M CHO NÀNG"**

Explanation:

"Dựa trên chiều cao và cân nặng nàng đã chia sẻ, size M có thể là lựa chọn phù hợp để tham khảo. Nàng có thể đối chiếu thêm bảng số đo của sản phẩm để lựa chọn thoải mái hơn nhé."

The size in this example is illustrative only. The application must calculate the actual suggested size from configured rules.

Buttons:

**"CHỌN SIZE M"**

**"XEM BẢNG SIZE"**

**"THỬ THÔNG TIN KHÁC"**

Selecting the suggested size must update the real size selector on the product detail page.

Do not automatically add the product to the cart.

### Actual size recommendation logic

This must be implemented as a deterministic, testable size recommendation system.

Do not build an arbitrary random size recommender.

Do not claim an AI fitting model has been trained when it has not.

Use:

- Product category.
- Available product sizes.
- Height.
- Weight.
- Optional bust.
- Optional waist.
- Optional hips.
- Configurable garment size chart.
- Garment fit classification.
- Garment measurements where available.

### Recommendation priority

**Step 1: Identify garment category**

For shirts and blouses, bust measurements should carry stronger weight when available.

For skirts and trousers, waist and hips should carry stronger weight when available.

For dresses, bust, waist and hips should be considered according to garment silhouette.

For matching sets, assess the components separately where independent sizing is supported.

**Step 2: Use height and weight**

When only mandatory inputs are provided, return a conservative approximate recommendation using a configurable reference sizing matrix.

Height and weight alone must not be treated as exact body measurements.

**Step 3: Refine with optional measurements**

Use provided measurements to compare against the product's configured size chart.

Do not require all three optional measurements.

**Step 4: Consider garment fit**

Account for:

- Slim fit.
- Regular fit.
- Relaxed fit.
- Oversized fit.
- Stretch characteristics, if verified.
- Product-specific measurements.

**Step 5: Validate available sizes**

Only recommend sizes that exist for the product.

If the best-matching size is unavailable, explain its availability rather than silently claiming another size is equivalent.

**Step 6: Explain uncertainty**

If measurements conflict or the recommendation is ambiguous, display:

"Thông tin hiện tại cho thấy nàng có thể phù hợp với size M hoặc L. Nàng hãy tham khảo thêm bảng số đo chi tiết để lựa chọn thoải mái nhất nhé."

Never guarantee a perfect fit.

If configured data is insufficient for a meaningful recommendation, show the product-specific size chart rather than returning an unsupported size.

### Product size charts

Support sizes:

XS, S, M, L, XL, XXL and free size where applicable.

The admin must be able to configure:

- Bust ranges.
- Waist ranges.
- Hip ranges.
- Garment lengths.
- Sleeve lengths.
- Shoulder widths.
- Trouser inseams.
- Other relevant garment measurements.

Do not use one universal size chart for every category.

Store size charts in the database.

Allow admin overrides per product.

### Privacy

Treat height, weight and body measurements as personal information.

Use entered values only to provide the requested recommendation.

Do not save measurements to a customer account by default.

Do not include them in analytics events.

Do not expose them in URLs.

Do not send them to third-party services.

If persistent measurement profiles are ever introduced, require a separate, explicit user opt-in.

---

## 7. Refined Vietnamese shopping language

Every interactive label should feel polite, light, graceful and easy to understand.

Use a consistent soft and elegant Vietnamese tone.

### Examples

Instead of:

"Nhập thông tin"

Use:

"Chia sẻ thông tin của nàng"

Instead of:

"Submit"

Use:

"Xem gợi ý dành cho nàng"

Instead of:

"Recommended products"

Use:

"Có thể nàng sẽ thích"

Instead of:

"Choose size"

Use:

"Chọn kích cỡ phù hợp"

Instead of:

"Complete your outfit"

Use:

"Hoàn thiện phong cách của nàng"

Instead of:

"More colors"

Use:

"Khám phá thêm màu sắc"

Instead of:

"Other products"

Use:

"Những thiết kế dành cho nàng"

Instead of:

"Size not found"

Use:

"Rất tiếc, kích cỡ này hiện chưa có sẵn."

The text must remain concise and functional.

Do not make checkout forms unnecessarily poetic.

Do not overuse the word "nàng" in every sentence.

Use respectful, natural, professional wording.

---

## 8. Admin updates

Extend the existing admin interface so products and their variants can be maintained properly.

For every product, administrators should be able to:

- Add garment colors.
- Edit color names.
- Assign HEX swatch colors.
- Upload images for individual colors.
- Select a primary image per color.
- Edit the material description.
- Edit the garment silhouette.
- Edit the detailed Vietnamese product description.
- Edit care instructions.
- Edit styling suggestions.
- Link coordinated products.
- Configure a size chart.
- Configure fit characteristics.
- Edit stock for each color-size combination.

Preserve existing product IDs and relationships.

Use database migrations where new tables or fields are necessary.

Do not wipe existing product or order data.

Seed new sample data with reproducible scripts.

Ensure generated sample variants and image associations are internally consistent.

---

## 9. Verification and acceptance criteria

Do not mark this update complete until the following requirements are checked:

- [ ] Existing layout remains unchanged except for necessary feature additions.
- [ ] Clothing catalog includes varied, recognizable officewear designs.
- [ ] Product names are distinct and natural.
- [ ] Clothing colors emphasize airy, elegant pastel and neutral tones.
- [ ] Product descriptions mention relevant material and garment details.
- [ ] Product descriptions do not contain AI-generation labels.
- [ ] Unverified material claims are not presented as verified facts.
- [ ] Shirt images focus on the shirt.
- [ ] Skirt images focus on the skirt.
- [ ] Trouser images clearly show the trousers.
- [ ] Dress images reveal the garment's overall shape.
- [ ] Clicking a product image opens the correct product.
- [ ] Color swatches change to the correct variant images.
- [ ] Each variant retains correct SKU, price and stock data.
- [ ] Styling suggestions contain compatible officewear items.
- [ ] Styling links open the correct associated products.
- [ ] The size guide opens correctly.
- [ ] The size advisor opens correctly.
- [ ] Height is mandatory.
- [ ] Weight is mandatory.
- [ ] Bust measurement is optional.
- [ ] Waist measurement is optional.
- [ ] Hip measurement is optional.
- [ ] Recommendations can be generated using only height and weight when reference rules are available.
- [ ] Optional measurements improve the recommendation when suitable size-chart data exists.
- [ ] Recommendations differ appropriately across garment categories.
- [ ] Suggested size can be selected on the product page.
- [ ] Unavailable sizes are not presented as purchasable.
- [ ] Size consultation remains usable on mobile.
- [ ] Form data is not persisted without user consent.
- [ ] All Vietnamese wording is elegant and understandable.
- [ ] Existing cart, checkout, account and admin functions remain operational.
- [ ] No remote deployment or GitHub push occurs.

## Final instruction

Implement these improvements within the current HÀ NHI FASHION codebase.

Preserve the approved layout and visual identity.

Prioritize realistic women's officewear presentation, beautiful soft color variants, garment-focused imagery, credible product descriptions, intelligent coordinated outfit suggestions and a useful size-advice experience.

Keep the application local on `localhost:3000`.

Do not create a new website version.

Do not stop after modifying static text; implement the corresponding data relationships, interactions, validations and tests.

Report completed changes and any limitations in Vietnamese.