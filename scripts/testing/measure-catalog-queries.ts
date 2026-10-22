import { PrismaClient } from "@prisma/client";
import { writeFile } from "node:fs/promises";
import { catalogQuery } from "../../src/lib/queries";
const db = new PrismaClient();
const results = [];
for (const params of [
  {},
  { sort: "price-asc" },
  { sort: "popular" },
  { q: "dress" },
  { color: "White" },
]) {
  await catalogQuery(params);
  const samples = [];
  let bytes = 0;
  for (let i = 0; i < 7; i++) {
    const t = performance.now();
    const r = await catalogQuery(params);
    samples.push(performance.now() - t);
    bytes = Buffer.byteLength(JSON.stringify(r));
  }
  results.push({
    params,
    ms: samples,
    medianMs: [...samples].sort((a, b) => a - b)[3],
    bytes,
  });
}
await writeFile(
  "verification/catalog-query-" +
    (process.argv.includes("--after") ? "after" : "before") +
    ".json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      database: process.env.DATABASE_URL ?? "configured local .env",
      results,
    },
    null,
    2,
  ),
);
console.log(
  results.map((r) => ({
    params: r.params,
    medianMs: r.medianMs,
    bytes: r.bytes,
  })),
);
await db.$disconnect();
process.exit(0);
