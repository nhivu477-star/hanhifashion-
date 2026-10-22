import { describe, it, expect } from "vitest";
import {
  productQuality,
  type QualityProduct,
} from "../src/lib/product-quality";
import { safeReturnTo } from "../src/lib/safe-redirect";
import { safeLogRecord } from "../src/lib/observability";
import { localImagePattern, inspectLocalImage } from "../src/lib/local-images";
const valid = () =>
  ({
    id: "p",
    name: "Thiết kế",
    slug: "thiet-ke",
    sku: "HN-1",
    description: "Mô tả",
    material: "Cotton",
    care: "Giặt tay",
    categoryId: "cat",
    category: { active: true, parentId: null },
    subcategory: null,
    collections: [{}],
    price: 100,
    salePrice: null,
    publicationStatus: "READY",
    merchandiseVerified: true,
    active: true,
    images: [
      {
        url: "/images/test.jpg",
        alt: "Thiết kế",
        position: 0,
        mediaAsset: {
          localPath: "/images/test.jpg",
          productId: "p",
          reviewStatus: "APPROVED",
          role: "PRODUCT",
          garmentVerified: true,
          authorizedUse: "PRODUCT_SALE",
        },
      },
    ],
    colors: [
      {
        id: "c",
        name: "Be",
        productId: "p",
        images: [
          {
            url: "/images/test.jpg",
            alt: "Be",
            position: 0,
            mediaAsset: {
              localPath: "/images/test.jpg",
              productId: "p",
              colorId: "c",
              reviewStatus: "APPROVED",
              role: "PRODUCT",
              garmentVerified: true,
              authorizedUse: "PRODUCT_SALE",
            },
          },
        ],
      },
    ],
    variants: [
      {
        sku: "HN-B-M",
        size: "M",
        color: "Be",
        colorId: "c",
        stock: 0,
        stockOrigin: "VERIFIED",
        priceOverride: null,
      },
    ],
  }) as unknown as QualityProduct;
describe("Phase 5 quality", () => {
  it("READY does not require positive stock", () =>
    expect(productQuality(valid()).status).toBe("READY"));
  it("missing content is INCOMPLETE", () => {
    const p = valid();
    p.care = "";
    expect(productQuality(p).status).toBe("INCOMPLETE");
  });
  it("unverified imagery needs review", () => {
    const p = valid();
    p.merchandiseVerified = false;
    expect(productQuality(p).status).toBe("NEEDS REVIEW");
  });
  it("rejects price 0 and sale above base", () => {
    const p = valid();
    p.price = 0;
    expect(productQuality(p).status).toBe("INVALID");
    p.price = 100;
    p.salePrice = 101;
    expect(productQuality(p).invalid).toContain("price");
  });
  it("detects duplicate SKU/configuration", () => {
    const p = valid();
    p.variants.push(p.variants[0]);
    expect(productQuality(p).invalid).toContain("variant.sku");
  });
  it("detects cross-color image mismatch", () => {
    const p = valid();
    p.colors[0].images[0].mediaAsset!.colorId = "other";
    expect(productQuality(p).invalid).toContain("image.mapping");
  });
  it("missing files incomplete", () =>
    expect(
      productQuality(valid(), new Set(["/images/test.jpg"])).missing,
    ).toContain("image.file"));
});
describe("Phase 5 security", () => {
  it("preserves local query context", () =>
    expect(safeReturnTo("/trang-phuc?color=Be")).toBe("/trang-phuc?color=Be"));
  it("blocks open redirect/control/loop", () => {
    for (const v of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/a\nb",
      "/dang-nhap",
      "/api/session",
    ])
      expect(safeReturnTo(v)).toBeUndefined();
  });
  it("accepts nested assets but no traversal", () => {
    expect(localImagePattern.test("/images/lsoul/products/a.webp")).toBe(true);
    for (const v of [
      "/images/../secret.png",
      "/images/a/../../b.jpg",
      "/uploads/a.html",
      "https://x/a.png",
    ])
      expect(localImagePattern.test(v)).toBe(false);
  });
  it("validates existing fallback bytes", async () =>
    expect((await inspectLocalImage("/images/awaiting-photo.svg")).format).toBe(
      "svg",
    ));
  it("rejects missing file", async () =>
    await expect(inspectLocalImage("/uploads/missing.png")).rejects.toThrow());
  it("logs only explicit safe values", () => {
    const r = JSON.stringify(
      safeLogRecord(
        "password=secret",
        "email@example.com",
        "token=secret",
        "token=secret",
      ),
    );
    expect(r).not.toMatch(/secret|example/);
    expect(JSON.parse(r).code).toBe("UNKNOWN_ERROR");
  });
});
