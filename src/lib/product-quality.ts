import { Prisma } from "@prisma/client";
export const qualityInclude = {
  category: true,
  subcategory: true,
  collections: true,
  images: { include: { mediaAsset: true } },
  colors: { include: { images: { include: { mediaAsset: true } } } },
  variants: true,
} satisfies Prisma.ProductInclude;
export type QualityProduct = Prisma.ProductGetPayload<{
  include: typeof qualityInclude;
}>;
export type Readiness = "READY" | "NEEDS REVIEW" | "INCOMPLETE" | "INVALID";
export function productQuality(
  p: QualityProduct,
  unavailable: ReadonlySet<string> = new Set(),
) {
  const invalid: string[] = [],
    missing: string[] = [],
    review: string[] = [];
  for (const k of [
    "id",
    "name",
    "slug",
    "sku",
    "description",
    "material",
    "care",
  ] as const)
    if (!p[k]?.trim()) missing.push(k);
  if (!/^[a-z0-9-]+$/.test(p.slug)) invalid.push("slug");
  if (
    !p.category ||
    p.category.parentId ||
    (p.subcategory && p.subcategory.parentId !== p.categoryId)
  )
    invalid.push("category");
  if (!p.collections.length) review.push("collection");
  if (
    !Number.isSafeInteger(p.price) ||
    p.price <= 0 ||
    (p.salePrice !== null &&
      (!Number.isSafeInteger(p.salePrice) ||
        p.salePrice <= 0 ||
        p.salePrice >= p.price))
  )
    invalid.push("price");
  if (!["DRAFT", "PENDING_ASSETS", "READY"].includes(p.publicationStatus))
    invalid.push("publicationStatus");
  if (!p.variants.length) missing.push("variants");
  if (!p.colors.length) missing.push("colors");
  const skus = new Set<string>(),
    configs = new Set<string>();
  for (const v of p.variants) {
    if (!v.sku.trim() || skus.has(v.sku)) invalid.push("variant.sku");
    skus.add(v.sku);
    const key = v.size + "\0" + v.color;
    if (configs.has(key)) invalid.push("variant.configuration");
    configs.add(key);
    if (
      !Number.isInteger(v.stock) ||
      v.stock < 0 ||
      (v.priceOverride !== null &&
        (!Number.isSafeInteger(v.priceOverride) || v.priceOverride <= 0))
    )
      invalid.push("variant.stock/price");
    const c = p.colors.find((c) => c.id === v.colorId);
    if (
      !v.size.trim() ||
      !v.color.trim() ||
      !c ||
      c.name !== v.color ||
      c.productId !== p.id
    )
      invalid.push("variant.color");
    if (v.stockOrigin !== "VERIFIED") review.push("inventory.unverified");
  }
  const checkImages = (
    images:
      QualityProduct["images"] | QualityProduct["colors"][number]["images"],
    colorId?: string,
  ) => {
    if (!images.length) missing.push(colorId ? "color.images" : "images");
    const positions = new Set<number>();
    for (const i of images) {
      if (positions.has(i.position) || i.position < 0)
        invalid.push("image.order");
      positions.add(i.position);
      if (unavailable.has(i.url)) missing.push("image.file");
      if (!i.alt.trim()) missing.push("image.alt");
      const a = i.mediaAsset;
      if (
        a &&
        (a.role === "PRODUCT" || a.reviewStatus === "APPROVED") &&
        (a.localPath !== i.url ||
          a.productId !== p.id ||
          (colorId && a.colorId !== colorId))
      )
        invalid.push("image.mapping");
      if (
        !a ||
        a.reviewStatus !== "APPROVED" ||
        a.role !== "PRODUCT" ||
        !a.garmentVerified ||
        a.authorizedUse !== "PRODUCT_SALE"
      )
        review.push("image.unverified");
    }
  };
  checkImages(p.images);
  for (const c of p.colors) checkImages(c.images, c.id);
  if (!p.merchandiseVerified) review.push("merchandise.unverified");
  if (
    /xem thông tin nguồn|theo thiết kế/i.test(
      p.material + " " + p.description + " " + p.care,
    )
  )
    review.push("copy.unverified");
  const status: Readiness = invalid.length
    ? "INVALID"
    : missing.length
      ? "INCOMPLETE"
      : review.length
        ? "NEEDS REVIEW"
        : "READY";
  return {
    status,
    invalid: [...new Set(invalid)],
    missing: [...new Set(missing)],
    review: [...new Set(review)],
    available:
      p.active && p.category?.active && p.variants.some((v) => v.stock > 0),
  };
}
