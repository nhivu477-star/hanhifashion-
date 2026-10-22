import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { readFile, writeFile, access } from 'node:fs/promises';
import sharp from 'sharp';
const db = new PrismaClient();
const manifestPath = 'scripts/data/lsoul-manifest.json';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const source = JSON.parse(await readFile('scripts/data/lsoul-source.json', 'utf8'));
const overrides = JSON.parse(await readFile('scripts/data/lsoul-color-overrides.json', 'utf8'));
let previousFailures: {url: string; path: string}[] = [];
try { previousFailures = JSON.parse(await readFile('verification/lsoul-full-gallery-report.json', 'utf8')).failures ?? []; } catch {}
const jobs: any[] = [];
for (const product of manifest.designs) {
  for (const color of product.colors) {
    if (color.name === "Nguyên bản" && overrides[product.slug]) color.hex = overrides[product.slug].hex;
    const rows = source.rows.filter((r: any) => r.sourceUrl === color.sourceUrl);
    const urls: string[] = [];
    for (const row of rows) {
      if (row.colorways?.length) {
        for (const c of row.colorways)
          if (c.name.toLowerCase() === color.sourceColor.toLowerCase()) urls.push(...c.images);
      } else urls.push(...(row.images || []));
    }
    for (const url of new Set(urls)) {
      if (!color.images.includes(url)) {
        const base = color.localImages[0].replace(/-\d+\.webp$/, '');
        color.localImages.push(previousFailures.find(f => f.url === url)?.path ?? `${base}-extra-${createHash('sha256').update(url).digest('hex').slice(0, 12)}.webp`);
        color.images.push(url);
      }
    }
    for (let i = 0; i < color.images.length; i++)
      jobs.push({ product, color, url: color.images[i], path: color.localImages[i], position: i });
  }
}
console.log(`Gallery source contains ${jobs.length} images across ${manifest.designs.length} products.`);
let next = 0, downloaded = 0, cached = 0;
const failures: any[] = [];
try {
  await Promise.all(Array.from({length: 40}, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      try { await access('public' + job.path); await sharp('public' + job.path).metadata(); cached++; }
      catch {
        try {
          let output: Buffer | undefined;
          const candidates = [job.url, job.url.replace(/\/cache\/[^/]+\//, '/'), job.url + '?gallery=full'];
          for (let attempt = 0; attempt < candidates.length; attempt++) {
            try {
              const response = await fetch(candidates[attempt], {signal: AbortSignal.timeout(40000)});
              if (!response.ok) throw Error(`HTTP ${response.status}`);
              const bytes = Buffer.from(await response.arrayBuffer());
              output = await sharp(bytes).rotate().resize({width: 1200, withoutEnlargement: true}).webp({quality: 87, effort: 0}).toBuffer();
              break;
            } catch (error) { if (attempt === candidates.length - 1) throw error; }
          }
          await writeFile('public' + job.path, output!);
          downloaded++;
        } catch (error) { failures.push({path: job.path, url: job.url, error: String(error)}); job.failed = true; }
      }
      if ((cached + downloaded + failures.length) % 100 === 0)
        console.log(`Processed ${cached + downloaded + failures.length}/${jobs.length}; downloaded ${downloaded}; failed ${failures.length}`);
    }
  }));
  let added = 0;
  for (const job of jobs) {
    if (job.failed) continue;
    const actualProduct = await db.product.findUnique({where: {slug: job.product.slug}});
    if (!actualProduct) continue;
    const color = await db.productColor.findUnique({where: {productId_name: {productId: actualProduct.id, name: job.color.name}}});
    if (!color) continue;
    if (await db.colorImage.findFirst({where: {colorId: color.id, url: job.path}})) continue;
    await db.$transaction(async tx => {
      const lastImage = await tx.colorImage.aggregate({where: {colorId: color.id}, _max: {position: true}});
      const position = (lastImage._max.position ?? -1) + 1;
      const media = await tx.mediaAsset.upsert({where: {localPath: job.path}, update: {}, create: {
        localPath: job.path, originalSourceUrl: job.url, creator: 'LSOUL', licenseType: 'REFERENCE_ONLY', licenseReference: job.color.sourceUrl,
        authorizedUse: 'LOCAL_REFERENCE_DEMO', role: 'DEVELOPMENT', reviewStatus: 'PENDING', productId: actualProduct.id,
        verificationNotes: `Original source gallery photograph; ${job.product.sourceName}; ${job.color.sourceColor}.`,
      }});
      await tx.colorImage.create({data: {colorId: color.id, url: job.path, alt: `${job.product.title} — ${color.name} — ảnh ${job.position + 1}`, position, mediaAssetId: media.id}});
    });
    added++;
  }
  // Keep only successfully downloaded source images in the reusable manifest.
  for (const product of manifest.designs) for (const color of product.colors) {
    const kept = color.images.map((url: string, i: number) => ({url, path: color.localImages[i]})).filter((x: any) => !failures.some(f => f.path === x.path));
    color.images = kept.map((x: any) => x.url); color.localImages = kept.map((x: any) => x.path);
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const report = {total: jobs.length, cached, downloaded, galleryImagesAdded: added, failures};
  await writeFile('verification/lsoul-full-gallery-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await db.$disconnect(); }
