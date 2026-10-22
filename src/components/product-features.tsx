"use client";
import { LocalizedContent } from "@/components/localization";

import Link from "next/link";
import { Gallery, SafeImage } from "./store";
import { useProductSelection } from "./product-selection";
import { effectivePrice, money } from "@/lib/catalog";
type OutfitPriceItem = {
  id: string;
  colorId: string;
  product: {
    slug: string;
    name: string;
    price: number;
    salePrice: number | null;
  };
  color: {
    name: string;
    images: { url: string }[];
    variants: { stock: number; priceOverride: number | null }[];
  };
};
export function ColorGallery({ product: p }: { product: any }) {
  const { color } = useProductSelection();
  const images = p.colors?.find((c: any) => c.name === color)?.images;
  return (
    <LocalizedContent>
      {
        <Gallery
          key={color}
          images={
            images?.length
              ? images
              : [
                  {
                    id: "pending",
                    url: "/images/awaiting-photo.svg",
                    alt: "Hình ảnh màu này đang cập nhật",
                  },
                ]
          }
        />
      }
    </LocalizedContent>
  );
}
export function OutfitSuggestions({ product: p }: { product: any }) {
  const { color } = useProductSelection();
  const current = p.colors?.find((c: any) => c.name === color);
  const outfits =
    current?.outfits.filter(
      (o: any) =>
        o.items.length &&
        o.items.every(
          (i: any) =>
            i.product.active &&
            i.product.category.active &&
            i.color.productId === i.productId &&
            i.color.images.length &&
            i.color.variants.some((v: any) => v.stock > 0),
        ),
    ) ?? [];
  return (
    <LocalizedContent>
      {
        <section className="outfit-suggestions">
          <h2>GỢI Ý PHỐI ĐỒ CÙNG NÀNG</h2>
          <p className="muted">
            Khám phá những cách kết hợp nhẹ nhàng để hoàn thiện phong cách của
            riêng nàng.
          </p>
          <p className="small">
            Dành cho màu {color}. Các thiết kế bên dưới được bán riêng, không đi
            kèm sản phẩm đang xem.
          </p>
          {outfits.length ? (
            <div className="outfit-grid">
              {outfits.map((outfit: any) => (
                <article key={outfit.id}>
                  <h3>{outfit.title}</h3>
                  {outfit.items.map((item: OutfitPriceItem) => {
                    const prices = item.color.variants
                      .filter((v) => v.stock > 0)
                      .map((v) => effectivePrice(item.product, v));
                    return (
                      <Link
                        key={item.id}
                        href={`/san-pham/${item.product.slug}?mau=${item.colorId}`}
                      >
                        <SafeImage
                          loading="lazy"
                          src={item.color.images[0]?.url}
                          alt={`${item.product.name} — ${item.color.name}`}
                        />
                        <span>{item.product.name}</span>
                        <small>{item.color.name}</small>
                        <strong>
                          {prices.some((price) => price !== prices[0])
                            ? "Từ "
                            : ""}
                          {money(Math.min(...prices))}
                        </strong>
                      </Link>
                    );
                  })}
                </article>
              ))}
            </div>
          ) : (
            <p>
              Gợi ý cho màu này đang được cập nhật theo những thiết kế còn sẵn.
            </p>
          )}
        </section>
      }
    </LocalizedContent>
  );
}

export function VariantPrice({ product: p }: { product: any }) {
  const { color, size } = useProductSelection();
  const variant = p.variants.find(
    (v: any) => v.color === color && (!size || v.size === size),
  );
  return (
    <LocalizedContent>
      {
        <div className="detail-price">
          {p.price > 0 ? money(effectivePrice(p, variant)) : "Liên hệ"}{" "}
          {!variant?.priceOverride && p.salePrice && (
            <del>{money(p.price)}</del>
          )}
        </div>
      }
    </LocalizedContent>
  );
}
