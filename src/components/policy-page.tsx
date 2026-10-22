import { LocalizedContent } from "@/components/localization";
import Link from "next/link";
import { policyLinks, type ContentEntry } from "@/lib/content";
import { officialContacts } from "@/lib/taxonomy";
export function PolicyPage({
  slug,
  entry,
}: {
  slug: string;
  entry: ContentEntry;
}) {
  const privacy = slug === "chinh-sach-bao-mat";
  return (
    <LocalizedContent>
      {
        <main className="policy-page">
          <nav className="policy-breadcrumb" aria-label="Đường dẫn">
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <span>{entry.title}</span>
          </nav>
          <div className="policy-layout">
            <aside className="policy-sidebar">
              <p>CHĂM SÓC KHÁCH HÀNG</p>
              <nav aria-label="Thông tin chính sách">
                {policyLinks.map(([path, label]) => (
                  <Link
                    key={path}
                    href={"/" + path}
                    aria-current={slug === path ? "page" : undefined}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
              <Link className="policy-contact-link" href="/lien-he">
                Liên hệ HÀ NHI →
              </Link>
            </aside>
            <article className="policy-article">
              <header className="policy-heading">
                <p className="policy-eyebrow">HÀ NHI FASHION</p>
                <h1>{entry.title}</h1>
                <p className="policy-intro">{entry.intro}</p>
                <p className="policy-date">
                  Cập nhật ngày <time dateTime="2026-10-18">18.10.2026</time> ·
                  Phiên bản 1.0
                </p>
              </header>
              <p className="policy-status">
                {privacy
                  ? "Thông tin bảo mật áp dụng cho bản trải nghiệm hiện tại của website."
                  : "Bản trải nghiệm: chưa thu tiền hoặc giao hàng thực tế. Các điều kiện mua bán là phương án đề xuất cho giai đoạn bán hàng chính thức."}
              </p>
              <div className="policy-sections">
                {entry.sections.map(([heading, text], i) => (
                  <section key={heading} id={"muc-" + (i + 1)}>
                    <h2>
                      <span aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {heading}
                    </h2>
                    <p>{text}</p>
                  </section>
                ))}
              </div>
              <section className="policy-support">
                <h2>Cần trao đổi thêm?</h2>
                <p>
                  HÀ NHI tiếp nhận yêu cầu qua các kênh chính thức. Khi cần hỗ
                  trợ đơn hàng, vui lòng cung cấp mã đơn để thuận tiện đối
                  chiếu.
                </p>
                <div>
                  <a
                    className="text-link"
                    href={officialContacts.instagramMessageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Nhắn tin với HÀ NHI →
                  </a>
                  <a href={"mailto:" + officialContacts.contactEmail}>
                    {officialContacts.contactEmail}
                  </a>
                  <a href={"tel:" + officialContacts.contactPhone}>
                    {officialContacts.contactPhone}
                  </a>
                </div>
              </section>
              <nav className="policy-related" aria-label="Chính sách liên quan">
                {policyLinks
                  .filter(([path]) => path !== slug)
                  .map(([path, label]) => (
                    <Link key={path} href={"/" + path}>
                      {label} →
                    </Link>
                  ))}
              </nav>
            </article>
          </div>
        </main>
      }
    </LocalizedContent>
  );
}
