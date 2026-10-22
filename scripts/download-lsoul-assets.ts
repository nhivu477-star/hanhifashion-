import sharp from "sharp";
import { readFile, mkdir, access, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
const manifest = JSON.parse(
  await readFile("scripts/data/lsoul-manifest.json", "utf8"),
);
await mkdir("public/images/lsoul/products", { recursive: true });
const jobs: { url: string; path: string }[] = manifest.designs.flatMap(
  (r: any) =>
    r.colors.flatMap((c: any) =>
      c.images.map((url: string, i: number) => ({
        url,
        path: "public" + c.localImages[i],
      })),
    ),
);
function download(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const p = spawn("curl", [
      "-f",
      "-sSL",
      "--max-time",
      "35",
      "--retry",
      "2",
      "--retry-all-errors",
      url,
    ]);
    const parts: Buffer[] = [];
    let error = "";
    p.stdout.on("data", (b) => parts.push(b));
    p.stderr.on("data", (b) => {
      error += b.toString();
    });
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve(Buffer.concat(parts)) : reject(new Error(error)),
    );
  });
}
let next = 0,
  done = 0;
const errors: any[] = [];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < jobs.length) {
      const j = jobs[next++];
      try {
        await access(j.path);
      } catch {
        try {
          const buffer = await download(j.url);
          await sharp(buffer)
            .rotate()
            .resize({ width: 1200, withoutEnlargement: true })
            .webp({ quality: 87 })
            .toFile(j.path);
        } catch (e) {
          errors.push({ ...j, error: String(e) });
        }
      }
      done++;
      if (done % 50 === 0)
        console.log(`${done}/${jobs.length}; failures=${errors.length}`);
    }
  }),
);
await writeFile(
  "verification/lsoul-download-report.json",
  JSON.stringify(
    { total: jobs.length, completed: done - errors.length, errors },
    null,
    2,
  ),
);
console.log(JSON.stringify({ total: jobs.length, errors: errors.length }));
if (errors.length) process.exitCode = 1;
