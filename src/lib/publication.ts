import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";
export const commercialMode = () =>
  process.env.STORE_MODE === "commercial" ||
  (process.env.NODE_ENV === "production" &&
    process.env.STORE_MODE !== "preview");
export const publicationFilter = () =>
  commercialMode()
    ? { publicationStatus: "READY", merchandiseVerified: true }
    : {};
export async function assertProductReady(
  id: string,
  verified?: boolean,
  client: PrismaClient | Prisma.TransactionClient = db,
) {
  const p = await client.product.findUniqueOrThrow({
    where: { id },
    include: {
      images: { include: { mediaAsset: true } },
      colors: {
        include: { images: { include: { mediaAsset: true } }, variants: true },
      },
    },
  });
  if (!(verified ?? p.merchandiseVerified) || !p.colors.length)
    throw new Error("Cần xác minh hàng hóa thực tế trước khi mở bán.");
  if (
    !p.images.length ||
    p.images.some(
      (i) =>
        !i.mediaAsset ||
        i.mediaAsset.reviewStatus !== "APPROVED" ||
        i.mediaAsset.role !== "PRODUCT" ||
        !i.mediaAsset.garmentVerified ||
        i.mediaAsset.productId !== p.id ||
        i.mediaAsset.localPath !== i.url,
    )
  )
    throw new Error(
      "Ảnh trên thẻ sản phẩm chưa được xác minh khớp với hàng hóa.",
    );
  for (const color of p.colors) {
    if (
      !color.images.length ||
      color.images.some(
        (i) =>
          !i.mediaAsset ||
          i.mediaAsset.reviewStatus !== "APPROVED" ||
          i.mediaAsset.role !== "PRODUCT" ||
          !i.mediaAsset.garmentVerified ||
          i.mediaAsset.productId !== p.id ||
          i.mediaAsset.colorId !== color.id ||
          i.mediaAsset.localPath !== i.url,
      )
    )
      throw new Error(
        "Mỗi màu cần ảnh sản phẩm được duyệt và xác nhận đúng trang phục.",
      );
    if (
      !color.variants.length ||
      color.variants.some((v) => v.stockOrigin !== "VERIFIED")
    )
      throw new Error("Cần xác minh nguồn tồn kho cho từng biến thể.");
  }
  return p;
}
