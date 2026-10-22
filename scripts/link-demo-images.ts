import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const images: Record<string, string> = {
  "chan-vay": "skirt",
  "ao-so-mi": "blouse",
  "ao-kieu": "blouse",
  "ao-vest-blazer": "blazer",
  "quan-tay": "blazer",
  "dam-cong-so": "dress",
  "set-cong-so": "blazer",
};
for (const [slug, image] of Object.entries(images)) {
  await db.category.updateMany({
    where: { slug },
    data: { image: `/images/${image}.png` },
  });
  await db.productImage.updateMany({
    where: {
      position: 0,
      product: { category: { slug }, sku: { startsWith: "HN" } },
    },
    data: { url: `/images/${image}.png` },
  });
}
await db.$disconnect();
