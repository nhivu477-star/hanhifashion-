import { publicationFilter } from "@/lib/publication";
import { db } from "@/lib/db";
// Catalog changes belong in the live sitemap, not a build-time database snapshot.
export const dynamic = "force-dynamic";
export default async function sitemap() {
  const products = await db.product.findMany({
    where: { active: true, ...publicationFilter() },
    select: { slug: true, updatedAt: true },
  });
  return [
    { url: "http://localhost:3000", lastModified: new Date() },
    ...products.map((p) => ({
      url: `http://localhost:3000/san-pham/${p.slug}`,
      lastModified: p.updatedAt,
    })),
  ];
}
