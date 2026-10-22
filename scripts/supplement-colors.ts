import type { PrismaClient } from "@prisma/client";
import { writeFile } from "node:fs/promises";
import { expandedDesigns } from "./catalog-expansion";
import { drawing } from "./enrich-catalog";
import { fashionColors } from "../src/lib/fashion-colors";
export async function supplementColors(db: PrismaClient) {
  for (const [slug, designs] of Object.entries(expandedDesigns)) {
    const products = await db.product.findMany({
      where: { category: { slug }, enrichmentVersion: 1 },
      include: { colors: true },
    });
    for (let i = 0; i < 3; i++) {
      const p = products.find((p) => p.name.endsWith(designs[i]));
      if (!p) continue;
      const [name, hex] = fashionColors[17 + i];
      if (p.colors.some((c) => c.name === name) || p.colors.length >= 5)
        continue;
      const c = await db.productColor.create({
        data: { productId: p.id, name, hex, position: p.colors.length },
      });
      for (const [position, view] of ["front", "back", "detail"].entries()) {
        const url = `/images/${p.sku.toLowerCase()}-${17 + i}-${view}.svg`;
        await writeFile("public" + url, drawing(slug, p.name, hex, i, view));
        await db.colorImage.create({
          data: { colorId: c.id, url, alt: `${p.name} — ${name}`, position },
        });
      }
      for (const [index, size] of ["XS", "S", "M", "L", "XL", "XXL"].entries())
        await db.productVariant.create({
          data: {
            productId: p.id,
            colorId: c.id,
            color: name,
            colorHex: hex,
            size,
            sku: `${p.sku}-E${17 + i}-${size}`,
            stock: 8 + index,
            stockOrigin: "SAMPLE",
          },
        });
    }
  }
}
