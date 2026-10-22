import { PrismaClient } from "@prisma/client";
import { normalize } from "../src/lib/catalog";
import { subcategories, officialContacts } from "../src/lib/taxonomy";
const db = new PrismaClient();
export async function applyTaxonomy() {
  const initializeOrder =
    (await db.category.count({ where: { parentId: { not: null } } })) === 0;
  await db.category.upsert({
    where: { slug: "ao-khoac-len" },
    update: {},
    create: {
      slug: "ao-khoac-len",
      name: "Áo khoác & Len",
      description:
        "Những lớp trang phục nhẹ nhàng, ấm áp và thanh lịch cho nàng công sở.",
      image: "/images/blazer.png",
      sortOrder: 7,
    },
  });
  for (const [i, [root, names]] of Object.entries(subcategories).entries()) {
    const parent = await db.category.findUnique({ where: { slug: root } });
    if (!parent) continue;
    if (initializeOrder)
      await db.category.update({
        where: { id: parent.id },
        data: { sortOrder: i },
      });
    for (const [j, name] of names.entries()) {
      const slug = normalize(name).replace(/[^a-z0-9]+/g, "-");
      const child = await db.category.upsert({
        where: { slug },
        update: {},
        create: {
          name,
          slug,
          parentId: parent.id,
          sortOrder: j,
          image: parent.image,
          description: `Khám phá ${name.toLowerCase()} trong tủ đồ công sở HÀ NHI.`,
        },
      });
      const products = await db.product.findMany({
        where: { categoryId: parent.id, subcategoryId: null },
        orderBy: { sku: "asc" },
        take: Math.ceil(100 / names.length),
      });
      // Add taxonomy metadata without changing IDs, prices, inventory or existing editorial content.
      const allotment =
        j === names.length - 1
          ? products
          : products.slice(
              0,
              Math.ceil(
                (await db.product.count({ where: { categoryId: parent.id } })) /
                  names.length,
              ),
            );
      for (const p of allotment)
        await db.product.update({
          where: { id: p.id },
          data: {
            subcategoryId: child.id,
            sleeveType:
              p.sleeveType ||
              (/tay ngắn|sát nách/i.test(name)
                ? "Tay ngắn"
                : /ao|dam|set/.test(root)
                  ? "Tay dài"
                  : ""),
            length: p.length || (/midi/i.test(name) ? "Midi" : "Tiêu chuẩn"),
            styleTags: p.styleTags || p.style,
          },
        });
    }
  }
  for (const [key, value] of Object.entries(officialContacts)) {
    const old = await db.storeSetting.findUnique({ where: { key } });
    // Replace only initial placeholder settings; preserve subsequent admin edits.
    if (!old || ["hello@hanhi.local", "Chưa thiết lập"].includes(old.value))
      await db.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
  }
  await db.$disconnect();
}
if (process.argv[1]?.endsWith("apply-taxonomy.ts"))
  await applyTaxonomy().finally(() => db.$disconnect());
