import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { hash } from "bcryptjs";
if (!/^file:\.\/business-tests-[\w-]+\.db$/.test(process.env.DATABASE_URL ?? ""))
  throw Error("Isolated business test database required");
const db = new PrismaClient();
const users = [];
for (const [role, name] of [
  ["ADMIN", "admin"],
  ["SELLER", "seller"],
  ["CUSTOMER", "alice"],
  ["CUSTOMER", "bob"],
]) {
  const password = randomBytes(16).toString("hex");
  const user = await db.user.create({
    data: {
      name,
      role,
      email: `${name}@orders.test`,
      phone: "0912345678",
      passwordHash: await hash(password, 10),
    },
  });
  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  users.push({ name, id: user.id, token, password, email: user.email });
}
const cat = await db.category.create({
  data: {
    name: "Trang phục",
    slug: "trang-phuc",
    description: "Dữ liệu kiểm thử đơn hàng",
    image: "/images/lsoul/products/dam-ricci-dress-nguyen-ban-1.webp",
  },
});
const fixtures = [];
for (let i = 0; i < 24; i++) {
  const p = await db.product.create({
    data: {
      name: `Thiết kế kiểm thử ${i}`,
      slug: `qa-order-${i}`,
      sku: `QA-ORDER-${i}`,
      description: "Sản phẩm chỉ sử dụng trong kiểm thử đơn hàng",
      material: "Cotton",
      style: "Thời trang",
      fit: "regular",
      occasion: "Test",
      searchText: "kiem thu",
      price: 600000,
      salePrice: 540000,
      categoryId: cat.id,
      isNew: true,
      images: { create: { url: cat.image, alt: "Ảnh kiểm thử" } },
      variants: {
        create: {
          sku: `QA-V-${i}`,
          size: "M",
          color: "Trắng",
          colorHex: "#ffffff",
          stock: 10,
        },
      },
    },
    include: { variants: true },
  });
  fixtures.push({ id: p.id, slug: p.slug, variantId: p.variants[0].id });
}
await db.coupon.create({
  data: {
    code: "ORDERTEST",
    type: "PERCENT",
    value: 10,
    minimum: 0,
    maximum: 100000,
    usageLimit: 100,
    expiresAt: new Date(Date.now() + 86400000),
  },
});
await writeFile(
  "verification/business-fixtures.json",
  JSON.stringify({ users, fixtures }),
  { mode: 0o600 },
);
await db.$disconnect();
console.log("Isolated fixtures created: 24 products, 4 users across 3 roles.");
