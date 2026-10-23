import { randomBytes } from "node:crypto";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { demoName, demoWorkspace, regularFile, writePrivate } from "./demo-workspace";

const name = process.env.DEMO_SEED_NAME;
if (!name || demoName([name]) !== name) throw Error("Use setup-demo.ts to provision a new isolated demo; existing accounts cannot be reset.");
const target = await demoWorkspace(name);
await regularFile(target.database);
await regularFile(path.join(target.workspace, "seed-lock.json"));
if (process.env.DATABASE_URL !== `file:${target.database}`) throw Error("Refusing a database outside the reserved demo workspace.");
const db = new PrismaClient();
try {
  if (await db.user.count() || await db.order.count()) throw Error("Existing accounts or orders found; no changes made.");
  const accounts = await Promise.all((["ADMIN", "SELLER", "CUSTOMER"] as const).map(async (role) => {
    const password = randomBytes(24).toString("base64url");
    return { role, email: `${role.toLowerCase()}@example.invalid`, password, passwordHash: await hash(password, 12) };
  }));
  // Exclusive private credential file is written first; an interruption never loses passwords or retries over existing users.
  await writePrivate(path.join(target.workspace, "accounts.json"), {
    notice: "Fictional local preview accounts. Do not publish this file or expose the preview server.",
    accounts: accounts.map(({ role, email, password }) => ({ role, email, password })),
  });
  await db.$transaction(async (tx) => {
    const users = [];
    for (const account of accounts) users.push(await tx.user.create({ data: {
      role: account.role, email: account.email, name: `Demo ${account.role}`, phone: "", passwordHash: account.passwordHash,
    } }));
    const customer = users.find((user) => user.role === "CUSTOMER")!;
    const variants = await tx.productVariant.findMany({ where: { stock: { gte: 2 } }, include: { product: true }, orderBy: { sku: "asc" }, take: 2 });
    if (variants.length !== 2) throw Error("Sample catalog requires two stocked variants.");
    for (const [index, variant] of variants.entries()) {
      const cancelled = index === 1;
      const price = variant.priceOverride ?? variant.product.salePrice ?? variant.product.price;
      const code = `DEMO-${cancelled ? "CANCELLED" : "PENDING"}-001`;
      const order = await tx.order.create({ data: {
        code, accessToken: randomBytes(32).toString("hex"), idempotencyKey: randomBytes(32).toString("hex"), userId: customer.id,
        name: "Khách hàng minh họa", phone: "0000000000", email: customer.email,
        province: "Hà Nội", ward: "Phường minh họa", street: "Địa chỉ hư cấu — không giao hàng", details: "Dữ liệu tổng hợp", notes: "Đơn demo, không giao hàng và không thu tiền.",
        status: cancelled ? "CANCELLED" : "PENDING", subtotal: price, discount: 0, shipping: 30000, total: price + 30000,
        items: { create: { productId: variant.productId, variantId: variant.id, name: variant.product.name, sku: variant.sku,
          size: variant.size, color: variant.color, image: "", quantity: 1, originalQuantity: 1, unitPrice: price } },
        payments: { create: { method: "COD", amount: price + 30000, status: "UNPAID" } },
        history: { create: { status: "PENDING", event: "CREATED", note: "Tạo đơn minh họa; chưa có thanh toán hoặc vận chuyển thực tế." } },
      } });
      await tx.productVariant.update({ where: { id: variant.id }, data: { stock: { decrement: 1 } } });
      await tx.inventoryMovement.create({ data: { variantId: variant.id, orderId: order.id, delta: -1, kind: "ORDER_RESERVATION", reason: "Đặt giữ tồn cho đơn minh họa" } });
      if (cancelled) {
        await tx.productVariant.update({ where: { id: variant.id }, data: { stock: { increment: 1 } } });
        await tx.inventoryMovement.create({ data: { variantId: variant.id, orderId: order.id, delta: 1, kind: "ORDER_CANCELLATION", reason: "Hoàn tồn cho đơn minh họa đã hủy" } });
        await tx.orderStatusHistory.create({ data: { orderId: order.id, previousStatus: "PENDING", status: "CANCELLED", note: "Khách minh họa hủy trước khi xác nhận." } });
      }
    }
  }, { timeout: 30000 });
  console.log("Three generated demo roles and two fictional unpaid orders created. Passwords are stored privately and were not printed.");
} finally { await db.$disconnect(); }
