import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("../src/components/product-selection", () => ({
  useProductSelection: () => ({ color: "Xanh" }),
}));
vi.mock("../src/components/store", () => ({
  SafeImage: () => null,
  Gallery: () => null,
}));

import { OutfitSuggestions } from "../src/components/product-features";

test("outfit displays the cheapest in-stock color price and a range label", () => {
  const product = {
    colors: [
      {
        name: "Xanh",
        outfits: [
          {
            id: "outfit",
            title: "Phối đồ",
            items: [
              {
                id: "item",
                productId: "suggested",
                colorId: "blue",
                product: {
                  id: "suggested",
                  slug: "suggested-product",
                  name: "Sản phẩm gợi ý",
                  price: 400000,
                  salePrice: 350000,
                  active: true,
                  category: { active: true },
                },
                color: {
                  productId: "suggested",
                  name: "Xanh",
                  images: [{ url: "/images/awaiting-photo.svg" }],
                  variants: [
                    { stock: 0, priceOverride: 100000 },
                    { stock: 2, priceOverride: 210000 },
                    { stock: 1, priceOverride: 190000 },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };
  const html = renderToStaticMarkup(createElement(OutfitSuggestions, { product }));
  expect(html).toContain("Từ 190.000đ");
  expect(html).not.toContain("100.000đ");
  expect(html).toContain("/san-pham/suggested-product?mau=blue");
});
