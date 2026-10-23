import { db } from "./db";
import { normalize } from "./catalog";
/** Refresh denormalized text after editorial changes; filtering still runs in SQL. */
export async function refreshSearch(ids?: string[]) {
  const products = await db.product.findMany({
    where: ids ? { id: { in: ids } } : {},
    select: {
      id: true,
      name: true,
      sku: true,
      description: true,
      searchText: true,
      sleeveType: true,
      length: true,
      styleTags: true,
      material: true,
      style: true,
      fit: true,
      occasion: true,
      category: { select: { name: true } },
      variants: { select: { color: true }, distinct: ["color"] },
      subcategory: { select: { name: true } },
      collections: { select: { collection: { select: { name: true } } } },
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
        ...p.variants.map((v) => v.color),
        ...p.collections.map((c) => c.collection.name),
      ].join(" "),
    );
    if (searchText !== p.searchText)
      await db.product.update({ where: { id: p.id }, data: { searchText } });
  }
}
