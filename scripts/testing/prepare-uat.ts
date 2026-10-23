import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { mkdir, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { regularFile, writePrivate } from "../demo-workspace";
import { rolePermissions } from "../../src/lib/rbac";

const database = process.env.DATABASE_URL;
if (!database || !/^file:\.\/final-uat-browser-[\w-]+\.db$/.test(database))
  throw Error("Final UAT requires a named isolated browser database");
await regularFile(path.resolve("prisma", database.slice("file:./".length)));
const db = new PrismaClient();
const accounts: Record<
  string,
  { id: string; email: string; password: string }
> = {};
for (const role of Object.keys(rolePermissions)) {
  const email = `final-uat-${role.toLowerCase()}@local.test`;
  const password = `Uat-${randomUUID()}`;
  const user = await db.user.create({
    data: {
      name: role === "CUSTOMER" ? "Khách UAT" : `UAT ${role}`,
      email,
      phone: "0912345678",
      role,
      passwordHash: await hash(password, 10),
    },
  });
  accounts[role] = { id: user.id, email, password };
}
const imageName = process.env.UAT_IMAGE_NAME;
if (!imageName || !/^uat-[a-f0-9-]{36}\.webp$/.test(imageName))
  throw Error("UAT requires its own temporary technical image.");
await mkdir("public/uploads", { recursive: true });
if (await realpath("public/uploads") !== path.resolve("public/uploads"))
  throw Error("UAT upload directory must not contain symbolic links.");
const image = "/uploads/" + imageName;
await writeFile("public" + image, await sharp({
  create: { width: 300, height: 400, channels: 3, background: "#e5e7eb" },
}).webp().toBuffer(), { flag: "wx", mode: 0o600 });
const root = await db.category.create({
  data: { slug: "trang-phuc", name: "Trang phục", description: "Danh mục tổng hợp cho nghiệm thu riêng.", image },
});
const category = await db.category.create({
  data: { slug: "ao", name: "Áo", description: "Danh mục con tổng hợp cho nghiệm thu riêng.", parentId: root.id, image },
});
const product = await db.product.create({
  data: {
    name: "Thiết kế UAT local",
    slug: "final-uat-local",
    sku: "FINAL-UAT-LOCAL",
    description: "Dữ liệu tổng hợp chỉ dùng trong database nghiệm thu riêng.",
    material: "Cotton",
    style: "Thời trang",
    fit: "Regular",
    occasion: "UAT",
    searchText: "thiet ke uat local",
    price: 600000,
    categoryId: root.id,
    subcategoryId: category.id,
    active: true,
    isNew: true,
    featured: true,
    images: { create: { url: image, alt: "Sản phẩm tổng hợp kiểm thử UAT" } },
    colors: {
      create: [
        {
          name: "Trắng UAT",
          hex: "#ffffff",
          position: 0,
          images: { create: { url: image, alt: "Ảnh fixture trắng UAT" } },
        },
      ],
    },
  },
  include: { colors: true },
});
for (const size of ["S", "M", "L"])
  await db.productVariant.create({
    data: {
      productId: product.id,
      colorId: product.colors[0].id,
      sku: `FINAL-UAT-${size}`,
      size,
      color: "Trắng UAT",
      colorHex: "#ffffff",
      stock: size === "S" ? 0 : 12,
    },
  });
const variant = await db.productVariant.findUniqueOrThrow({
  where: { sku: "FINAL-UAT-M" },
});
await mkdir("verification/final-uat", { recursive: true });
const privateFixture = `verification/final-uat/fixtures-${randomUUID()}.json`;
await writePrivate(privateFixture, {
    database,
    accounts,
    product: {
      id: product.id,
      slug: product.slug,
      variantId: variant.id,
      initialStock: variant.stock,
      image,
    },
  });
await rename(privateFixture, "verification/final-uat/fixtures.json");
await db.$disconnect();
console.log(
  "Final UAT: isolated accounts and one synthetic test product prepared.",
);
