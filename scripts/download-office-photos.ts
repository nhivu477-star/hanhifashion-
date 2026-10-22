import sharp from "sharp";
import { readFile, mkdir, access, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const rows = JSON.parse(
  await readFile("scripts/data/office-photo-sources.json", "utf8"),
);
await mkdir("public/images/office-demo", { recursive: true });
const jobs: any[] = [];
for (const r of rows)
  for (const [ci, c] of r.colors.entries()) {
    for (const [i, url] of c.images.entries())
      jobs.push({
        r,
        c,
        i,
        url,
        path: `/images/office-demo/${r.id}-${ci}-${i}.webp`,
        field: "localImages",
      });
    for (const [i, url] of (c.detailImages ?? []).entries())
      jobs.push({
        r,
        c,
        i,
        url,
        path: `/images/office-demo/${r.id}-${ci}-detail-${i}.webp`,
        field: "localDetailImages",
      });
  }
let next = 0;
await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (next < jobs.length) {
      const j = jobs[next++];
      try {
        await access("public" + j.path);
      } catch {
        const buffer = execFileSync(
          "curl",
          ["-f", "-L", "-s", "--max-time", "30", j.url],
          { maxBuffer: 20 * 1024 * 1024 },
        );
        await sharp(buffer)
          .rotate()
          .resize({ width: 1600, withoutEnlargement: true })
          .webp({ quality: 90 })
          .toFile("public" + j.path);
      }
      if (!j.c[j.field]) j.c[j.field] = [];
      j.c[j.field][j.i] = j.path;
    }
  }),
);
await writeFile(
  "scripts/data/office-photo-sources.json",
  JSON.stringify(rows, null, 2) + "\n",
);
console.log(`Downloaded ${jobs.length} photos for ${rows.length} designs`);
