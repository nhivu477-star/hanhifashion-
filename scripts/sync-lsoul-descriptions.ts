import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";

const db = new PrismaClient();
const manifest = JSON.parse(await readFile("scripts/data/lsoul-manifest.json", "utf8"));
const missing: string[] = [];
let updated = 0;
try {
  await db.$transaction(async (tx) => {
    for (const row of manifest.designs) {
      const source = row.sourceDescription?.trim();
      if (!source) { missing.push(row.slug); continue; }
      const details = source.replace(/^Description\s*/i, "")
        .replace(/\s*(Product materials:|Model is )/g, "\n\n$1");
      const product = await tx.product.findUnique({ where: { slug: row.slug } });
      if (!product || product.details === details) continue;
      await tx.product.update({ where: { id: product.id }, data: { details } });
      await tx.auditLog.create({ data: {
        actorId: "local-catalog-maintenance", action: "PRODUCT_DESCRIPTION_SYNC",
        resourceType: "PRODUCT", targetId: product.id,
        beforeJson: JSON.stringify({ details: product.details }),
        afterJson: JSON.stringify({ details }),
        detail: JSON.stringify({ sourceUrl: row.sourceUrl, source: "saved-lsoul-manifest" }),
      } });
      updated++;
    }
  });
  console.log(JSON.stringify({ updated, missingSourceDescriptions: missing }, null, 2));
} finally { await db.$disconnect(); }
