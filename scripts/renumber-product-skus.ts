import { PrismaClient } from '@prisma/client';
import { productSkuPrefix, productSkuPattern } from '../src/lib/product-sku';
import { refreshSearch } from '../src/lib/search';
import { writeFile } from 'node:fs/promises';
const db = new PrismaClient();
try {
 const products = await db.product.findMany({include: {category: true, variants: true}, orderBy: [{createdAt: 'asc'}, {id: 'asc'}]});
 const counters: Record<string, number> = {};
 const changes: any[] = [];
 // Preserve numbers already assigned using this convention.
 for (const p of products) if (productSkuPattern.test(p.sku)) {
  const prefix = productSkuPrefix(p.category.slug);
  if (p.sku.startsWith(prefix)) counters[prefix] = Math.max(counters[prefix] ?? 0, Number(p.sku.slice(prefix.length)));
 }
 for (const p of products) {
  const prefix = productSkuPrefix(p.category.slug);
  if (productSkuPattern.test(p.sku) && p.sku.startsWith(prefix)) continue;
  const sku = prefix + String(counters[prefix] = (counters[prefix] ?? 0) + 1).padStart(4, '0');
  await db.$transaction(async tx => {
   await tx.product.update({where: {id: p.id}, data: {sku}});
   for (let i = 0; i < p.variants.length; i++) {
    const v = p.variants[i];
    const suffix = v.sku.startsWith(p.sku + '-') ? v.sku.slice(p.sku.length) : `-V${String(i + 1).padStart(3, '0')}`;
    await tx.productVariant.update({where: {id: v.id}, data: {sku: sku + suffix}});
   }
  });
  changes.push({id: p.id, name: p.name, previousSku: p.sku, sku});
 }
 await refreshSearch();
 await writeFile('verification/product-sku-renumbering.json', JSON.stringify({changes, groupLastNumber: counters}, null, 2) + '\n');
 console.log(JSON.stringify({updated: changes.length, groups: counters}));
} finally {await db.$disconnect();}
