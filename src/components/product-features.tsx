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
  const images = p.colors?.length
    ? p.colors.find((c: { name: string }) => c.name === color)?.images
    : p.images;
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
  if (!outfits.length) return null;
  return (
    <LocalizedContent>
      {
        <section className="outfit-suggestions">
          <h2>GỢI Ý PHỐI ĐỒ CÙNG NÀNG</h2>
          <p className="small">
            Dành cho màu {color}. Các thiết kế bên dưới được bán riêng, không đi
            kèm sản phẩm đang xem.
          </p>
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
        </section>
      }
    </LocalizedContent>
  );
}

export function VariantPrice({ product: p }: { product: any }) {
  const { color, size } = useProductSelection();
  const variants = p.variants.filter(
    (v: { color: string; size: string }) =>
      v.color === color && (!size || v.size === size),
  );
  const available = variants.filter((v: { stock: number }) => v.stock > 0);
  const prices = (available.length ? available : variants).map(
    (v: { priceOverride: number | null }) => effectivePrice(p, v),
  );
  const price = prices.length ? Math.min(...prices) : effectivePrice(p);
  const hasRange = prices.some((value: number) => value !== price);
  const discounted = p.salePrice && !variants.some(
    (v: { priceOverride: number | null }) => v.priceOverride != null,
  );
  return (
    <LocalizedContent>
      {
        <div className="detail-price">
          {hasRange ? "Từ " : ""}
          {price > 0 ? money(price) : "Liên hệ"}{" "}
          {discounted && (
            <del>{money(p.price)}</del>
          )}
        </div>
      }
    </LocalizedContent>
  );
}
