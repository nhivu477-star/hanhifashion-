import { LocalizedContent } from "@/components/localization";
import Link from "next/link";

const selections = [
  {
    name: "Đầm Ricci",
    group: "Trang phục",
    href: "/san-pham/ls-ricci-dress",
    image: "/images/lsoul/products/dam-ricci-dress-nguyen-ban-1.webp",
  },
  {
    name: "Loea Sandals",
    group: "Giày",
    href: "/giay",
    image: "/images/lsoul/products/giay-loea-sandals-hong-0.webp",
  },
  {
    name: "Ci Tia Bag",
    group: "Túi xách",
    href: "/tui-xach",
    image: "/images/lsoul/products/tui-xach-ci-tia-bag-en-0.webp",
  },
  {
    name: "C De Sunglasses",
    group: "Phụ kiện",
    href: "/phu-kien",
    image: "/images/lsoul/products/phu-kien-c-de-sunglasses-tim-0.webp",
  },
];

export function AboutPage() {
  return (
    <LocalizedContent>
      {
        <main className="about-page">
          <nav className="about-breadcrumb" aria-label="Đường dẫn">
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <span>Về HÀ NHI</span>
          </nav>
          <header className="about-intro">
            <h1>Thời trang nữ, giày, túi xách &amp; phụ kiện</h1>
            <p>
              Trang phục thể hiện cá tính. Một đôi giày, chiếc túi hay món phụ
              kiện hoàn thiện dấu ấn riêng. HÀ NHI FASHION gợi mở những lựa chọn
              để nàng tự do kết hợp, theo cách của mình.
            </p>
          </header>
          <section
            className="about-selection"
            aria-label="Bốn lựa chọn trong tủ đồ HÀ NHI"
          >
            {selections.map((item) => (
              <Link href={item.href} key={item.group}>
                <div className="about-product-image">
                  <img src={item.image} alt={item.name} />
                </div>
                <span>{item.group}</span>
              </Link>
            ))}
          </section>
          <div className="about-story">
            <section>
              <h2>Trang phục nữ cho nhiều phong cách</h2>
              <p>
                Từ áo, đầm đến quần, chân váy và bộ trang phục, HÀ NHI gợi mở
                những lựa chọn để nàng thể hiện cá tính trong từng khoảnh khắc.
                Khám phá thiết kế, màu sắc và kích cỡ phù hợp với mình.
              </p>
            </section>
            <section>
              <h2>Giày, túi xách và phụ kiện phối cùng</h2>
              <p>
                Kết hợp trang phục với giày, túi xách và phụ kiện để tạo điểm
                nhấn cho tổng thể. Nàng có thể khám phá riêng từng nhóm sản phẩm
                và chọn cách phối phù hợp với phong cách của mình.
              </p>
            </section>
            <section>
              <h2>Tìm sản phẩm phù hợp với nàng</h2>
              <p>
                Khám phá từng thiết kế, xem kỹ hình ảnh, màu sắc và kích cỡ. Khi
                cần thêm một góc nhìn, nàng có thể trao đổi cùng HÀ NHI trước
                khi lựa chọn.
              </p>
              <Link href="/lien-he">Trò chuyện cùng HÀ NHI →</Link>
            </section>
          </div>
          <div className="about-close">
            <p>Những lựa chọn mới, cho cảm hứng của riêng nàng.</p>
            <Link href="/tat-ca">Khám phá sản phẩm →</Link>
          </div>
        </main>
      }
    </LocalizedContent>
  );
}
