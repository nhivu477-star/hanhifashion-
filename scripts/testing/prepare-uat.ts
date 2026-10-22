import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { rolePermissions } from "../../src/lib/rbac";

const database = process.env.DATABASE_URL;
if (!/^file:\.\/final-uat-browser-[\w-]+\.db$/.test(database ?? ""))
  throw Error("Final UAT requires a named isolated browser database");
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
const category = await db.category.findUniqueOrThrow({ where: { slug: "ao" } });
const image = "/images/lsoul/products/dam-ricci-dress-nguyen-ban-1.webp";
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
    categoryId: category.id,
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
await writeFile(
  "verification/final-uat/fixtures.json",
  JSON.stringify({
    database,
    accounts,
    product: {
      id: product.id,
      slug: product.slug,
      variantId: variant.id,
      initialStock: variant.stock,
    },
  }),
  { mode: 0o600 },
);
await db.$disconnect();
console.log(
  "Final UAT: isolated accounts and one synthetic test product prepared.",
);
