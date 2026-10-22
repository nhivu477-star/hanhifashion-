import { PrismaClient, Prisma } from "@prisma/client";
export async function adminSnapshot(
  db: PrismaClient | Prisma.TransactionClient,
  target: string,
  id: string,
): Promise<unknown> {
  if (!id && target !== "settings") return null;
  switch (target) {
    case "color":
      return db.productColor.findUnique({
        where: { id },
        include: { images: true },
      });
    case "outfit":
      return db.outfitCombination.findUnique({
        where: { id },
        include: { items: true },
      });
    case "size-chart":
      return db.sizeChart.findFirst({
        where: { OR: [{ id }, { productId: id }] },
      });
    case "product":
      return db.product.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          price: true,
          salePrice: true,
          active: true,
          publicationStatus: true,
        },
      });
    case "variant":
    case "stock":
      return db.productVariant.findUnique({
        where: { id },
        select: {
          id: true,
          sku: true,
          stock: true,
          stockOrigin: true,
          size: true,
          color: true,
        },
      });
    case "coupon":
      return db.coupon.findUnique({
        where: { id },
        select: {
          id: true,
          code: true,
          type: true,
          value: true,
          active: true,
          minimum: true,
          maximum: true,
          usageLimit: true,
          expiresAt: true,
        },
      });
    case "banner":
      return db.banner.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          active: true,
          image: true,
          href: true,
        },
      });
    case "customer":
      return db.user.findUnique({
        where: { id },
        select: { id: true, active: true, role: true, permissionVersion: true },
      });
    case "inquiry":
      return db.inquiry.findUnique({
        where: { id },
        select: { id: true, status: true },
      });
    case "category":
      return db.category.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          parentId: true,
          active: true,
          sortOrder: true,
        },
      });
    case "collection":
      return db.collection.findUnique({
        where: { id },
        select: { id: true, name: true, slug: true, image: true },
      });
    case "media-delete":
    case "media":
      return db.mediaAsset.findUnique({
        where: { id },
        select: { id: true, role: true, reviewStatus: true, productId: true },
      });
    case "publication":
      return db.product.findUnique({
        where: { id },
        select: {
          id: true,
          publicationStatus: true,
          merchandiseVerified: true,
        },
      });
    case "settings":
      return {
        keys: (await db.storeSetting.findMany({ select: { key: true } })).map(
          (x) => x.key,
        ),
      };
    default:
      return { id, target };
  }
}
