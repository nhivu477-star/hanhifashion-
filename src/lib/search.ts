import { db } from "./db";
import { normalize } from "./catalog";
/** Refresh denormalized text after editorial changes; filtering still runs in SQL. */
export async function refreshSearch(ids?: string[]) {
  const products = await db.product.findMany({
    where: ids ? { id: { in: ids } } : {},
    include: {
      category: true,
      variants: { select: { color: true } },
      subcategory: true,
      collections: { include: { collection: true } },
    },
  });
  for (const p of products) {
    const searchText = normalize(
      [
        p.name,
        p.sku,
        p.description,
        p.category.name,
        p.subcategory?.name,
        p.sleeveType,
        p.length,
        p.styleTags,
        p.material,
        p.style,
        p.fit,
        p.occasion,
        ...new Set(p.variants.map((v) => v.color)),
        ...p.collections.map((c) => c.collection.name),
      ].join(" "),
    );
    await db.product.update({ where: { id: p.id }, data: { searchText } });
  }
}
