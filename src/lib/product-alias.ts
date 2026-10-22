import { db } from "./db";
/** Old links resolve to the single retained design, preserving a color only if available. */
export async function productAlias(slug: string, colorId?: string) {
  const record = await db.storeSetting.findUnique({
    where: { key: "productAliases" },
  });
  const target: string | undefined = record
    ? JSON.parse(record.value)[slug]
    : undefined;
  if (!target || target === slug) return null;
  let suffix = "";
  if (colorId) {
    const previous = await db.productColor.findUnique({
      where: { id: colorId },
      select: { name: true },
    });
    if (previous) {
      const color = await db.productColor.findFirst({
        where: {
          product: { slug: target, active: true },
          active: true,
          name: previous.name,
        },
        select: { id: true },
      });
      if (color) suffix = "?mau=" + color.id;
    }
  }
  return "/san-pham/" + target + suffix;
}
