import { catalogPriceBounds } from "./catalog-filter-rules";
import { Prisma } from "@prisma/client";
import { publicationFilter } from "./publication";
import { db } from "./db";
import { normalize } from "./catalog";
const cardSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  price: true,
  salePrice: true,
  active: true,
  isNew: true,
  featured: true,
  createdAt: true,
  categoryId: true,
  images: {
    orderBy: { position: "asc" as const },
    take: 2,
    include: { mediaAsset: { select: { focalX: true, focalY: true } } },
  },
  variants: {
    where: { OR: [{ colorId: null }, { colorRecord: { active: true } }] },
  },
  category: true,
} satisfies Prisma.ProductSelect;
export const PAGE_SIZE = 24;
export type Params = Record<string, string | string[] | undefined>;
export const scalar = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : (v ?? "");
export async function catalogQuery(
  params: Params,
  category?: string,
  collection?: string,
) {
  const pageSize = scalar(params.suggest) === "1" ? 4 : PAGE_SIZE;
  const q = scalar(params.q).trim();
  const cat = scalar(params.category) || category;
  const selectedCategory = cat
    ? await db.category.findUnique({
        where: { slug: cat },
        select: { parentId: true },
      })
    : null;
  const {
    min,
    max,
    error: filterError,
  } = catalogPriceBounds({ min: scalar(params.min), max: scalar(params.max) });
  if (filterError) return { products: [], count: 0, page: 1, filterError };
  const where: Prisma.ProductWhereInput = {
    active: true,
    ...publicationFilter(),
    category: { active: true },
    ...(cat
      ? selectedCategory?.parentId
        ? { subcategory: { slug: cat } }
        : { category: { slug: cat, active: true } }
      : {}),
    ...(params.subcategory
      ? { subcategory: { slug: scalar(params.subcategory) } }
      : {}),
    ...(collection
      ? { collections: { some: { collection: { slug: collection } } } }
      : {}),
    ...(q
      ? {
          AND: normalize(q)
            .split(/\s+/)
            .filter(Boolean)
            .map((t) => ({ searchText: { contains: t } })),
        }
      : {}),
    OR: [
      { salePrice: { gte: min, lte: max } },
      { salePrice: null, price: { gte: min, lte: max } },
    ],
  };
  for (const key of ["material", "fit", "occasion", "style"] as const)
    if (params[key]) where[key] = scalar(params[key]);
  if (params.size || params.color || params.stock)
    where.variants = {
      some: {
        OR: [{ colorId: null }, { colorRecord: { active: true } }],
        ...(params.size ? { size: scalar(params.size) } : {}),
        ...(params.color ? { color: scalar(params.color) } : {}),
        ...(params.stock ? { stock: { gt: 0 } } : {}),
      },
    };
  if (params.sale) where.salePrice = { not: null };
  if (params.new) where.isNew = true;
  if (params.featured) where.featured = true;
  const sort = scalar(params.sort);
  const requestedPage = Number(scalar(params.page));
  const page = Math.max(
    1,
    Math.min(
      100000,
      Math.floor(Number.isFinite(requestedPage) ? requestedPage || 1 : 1),
    ),
  );
  // Price sorting uses a SQL CASE so discounted prices determine the actual order.
  let products: Prisma.ProductGetPayload<{
    select: typeof cardSelect;
  }>[];
  if (sort === "price-asc" || sort === "price-desc" || sort === "popular") {
    const ids = (
      await db.product.findMany({ where, select: { id: true } })
    ).map((p) => p.id);
    if (ids.length) {
      const rows = await db.$queryRaw<{ id: string }[]>(
        sort === "popular"
          ? Prisma.sql`SELECT p.id FROM Product p LEFT JOIN (SELECT i.productId,SUM(i.quantity) AS sold FROM OrderItem i JOIN "Order" o ON o.id=i.orderId WHERE o.status IN ('DELIVERED','COMPLETED') GROUP BY i.productId) r ON r.productId=p.id WHERE p.id IN (${Prisma.join(ids)}) ORDER BY COALESCE(r.sold,0) DESC,p.createdAt DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`
          : Prisma.sql`SELECT id FROM Product WHERE id IN (${Prisma.join(ids)}) ORDER BY COALESCE(salePrice,price) ${sort === "price-asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      );
      const list = await db.product.findMany({
        where: { id: { in: rows.map((r) => r.id) } },
        select: cardSelect,
      });
      const byId = new Map(list.map((p) => [p.id, p]));
      products = rows.map((r) => byId.get(r.id)!);
    } else products = [];
  } else
    products = await db.product.findMany({
      where,
      orderBy:
        sort === "name"
          ? [{ name: "asc" }, { id: "asc" }]
          : [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: cardSelect,
    });
  const chosenColors = scalar(params.color)
    ? await db.productColor.findMany({
        where: {
          active: true,
          productId: { in: products.map((p) => p.id) },
          name: scalar(params.color),
        },
        include: {
          images: {
            orderBy: { position: "asc" },
            take: 2,
            include: { mediaAsset: { select: { focalX: true, focalY: true } } },
          },
        },
      })
    : [];
  const displayProducts = products.map((p) => {
    const c = chosenColors.find((c) => c.productId === p.id);
    return {
      ...p,
      images: c ? c.images : p.images,
      selectedColorId: c?.id,
    };
  });
  return {
    products: displayProducts,
    count: await db.product.count({ where }),
    page,
    filterError: null,
  };
}
