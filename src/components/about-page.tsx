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
            <h1>Phong cách bắt đầu từ nàng.</h1>
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
              <h2>Một tủ đồ có tiếng nói riêng</h2>
              <p>
                Có ngày nàng chọn sự giản dị. Có dịp nàng muốn nổi bật hơn. Từ
                trang phục đến giày, túi xách và phụ kiện, mỗi lựa chọn đều có
                thể trở thành một phần trong câu chuyện của nàng.
              </p>
            </section>
            <section>
              <h2>Tinh tế trong cách kết hợp</h2>
              <p>
                Một phom dáng vừa ý, một sắc màu yêu thích, một chi tiết làm
                điểm nhấn. HÀ NHI trân trọng những kết hợp có chủ đích, để tổng
                thể hài hòa mà vẫn giữ được cá tính.
              </p>
            </section>
            <section>
              <h2>Chọn điều phù hợp với mình</h2>
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
