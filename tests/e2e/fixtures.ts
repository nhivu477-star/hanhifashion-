import { test as base, expect, type APIRequestContext } from "@playwright/test";
import { PrismaClient, type ProductImage } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

export const credentials: { email: string; password: string; database: string } =
  JSON.parse(readFileSync(".test-credentials.json", "utf8"));
const databasePath = credentials.database?.replace(/^file:/, "");
if (
  typeof credentials.database !== "string" ||
  !credentials.database.startsWith("file:") ||
  !path.isAbsolute(databasePath) ||
  !/^browser-[a-f0-9]{16}$/.test(path.basename(path.dirname(databasePath))) ||
  path.basename(databasePath) !== "demo.db" ||
  path.dirname(path.dirname(databasePath)) !== path.resolve(".local-demo")
) {
  throw new Error("Browser tests require a newly prepared isolated browser demo database.");
}
export const browserDatabase = credentials.database as string;

export async function registerCustomer(request: APIRequestContext) {
  const email = `ui-${randomUUID()}@hanhi.test`;
  const password = `Customer-${randomUUID()}`;
  const response = await request.post("/api/register", {
    data: {
      name: "Khách kiểm thử giao diện",
      email,
      phone: "0912345678",
      password,
      confirmPassword: password,
    },
  });
  expect(response.status()).toBe(200);
  return { email, password };
}

export const test = base.extend<{
  gallery: (productIds: string[]) => Promise<void>;
}>({
  extraHTTPHeaders: async ({}, use) => {
    // Independent simulated clients must not share the production auth limiter.
    const client = randomUUID().replaceAll("-", "");
    const segments = Array.from({ length: 6 }, (_, i) => client.slice(i * 4, i * 4 + 4));
    await use({ "x-forwarded-for": "2001:db8:" + segments.join(":") });
  },
  gallery: async ({}, use) => {
    const db = new PrismaClient({ datasources: { db: { url: browserDatabase } } });
    const files: string[] = [];
    const imageIds: string[] = [];
    const prepared = new Set<string>();
    const originalProductImages: ProductImage[] = [];
    const preparedProducts = new Set<string>();
    try {
      await use(async (productIds) => {
        const styled = await db.outfitItem.findMany({
          where: { outfit: { color: { productId: { in: productIds } } } },
          select: { productId: true },
        });
        const ids = [...new Set([...productIds, ...styled.map((item) => item.productId)])];
        const newIds = ids.filter((id) => !preparedProducts.has(id));
        originalProductImages.push(...await db.productImage.findMany({
          where: { productId: { in: newIds } },
        }));
        for (const id of newIds) preparedProducts.add(id);
        const colors = await db.productColor.findMany({
          where: { productId: { in: ids }, active: true },
          select: { id: true, hex: true },
        });
        await mkdir("public/uploads", { recursive: true });
        for (const color of colors) {
          if (prepared.has(color.id)) continue;
          prepared.add(color.id);
          for (let position = 0; position < 3; position++) {
            const id = "e2e-" + randomUUID();
            const url = `/uploads/${id}.webp`;
            const filename = "public" + url;
            // Explicit test swatches, never garment photographs or demo merchandise.
            const fill = /^#[a-f0-9]{6}$/i.test(color.hex) ? color.hex : "#cccccc";
            const image = await sharp({
              create: { width: 300, height: 400, channels: 3, background: fill },
            }).composite([{
              input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect x="20" y="${20 + position * 75}" width="260" height="60" fill="white"/><text x="30" y="${55 + position * 75}" font-size="18">TEST SWATCH ${position + 1}</text></svg>`),
            }]).webp().toBuffer();
            await writeFile(filename, image, { flag: "wx" });
            files.push(filename);
            await db.colorImage.create({
              data: { id, colorId: color.id, url, position: -3 + position, alt: "Ảnh màu kiểm thử, không phải ảnh sản phẩm" },
            });
            imageIds.push(id);
          }
        }
      });
    } finally {
      try {
        await db.$transaction(async (tx) => {
          await tx.colorImage.deleteMany({ where: { id: { in: imageIds } } });
          await tx.productImage.deleteMany({
            where: { productId: { in: [...preparedProducts] } },
          });
          if (originalProductImages.length) {
            await tx.productImage.createMany({ data: originalProductImages });
          }
        });
      } finally {
        await Promise.all(files.map((filename) => unlink(filename)));
        await db.$disconnect();
      }
    }
  },
});
