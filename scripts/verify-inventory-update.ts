import assert from "node:assert/strict";
if (!process.env.DATABASE_URL?.includes("pilot.db"))
  throw Error("Use isolated pilot.db");
const { db } = await import("../src/lib/db");
const { moveStock } = await import("../src/lib/inventory-operations");
const actor = await db.user.findFirstOrThrow({
  where: { role: "SUPER_ADMIN", active: true },
});
const buyer = await db.user.findFirstOrThrow({
  where: { role: "CUSTOMER", active: true },
});
const v = await db.productVariant.findFirstOrThrow();
const input = {
  sku: v.sku,
  kind: "IN",
  quantity: 3,
  date: new Date().toISOString(),
  supplier: "Nhà cung cấp kiểm thử",
  reason: "Kiểm tra nhập kho",
  notes: "",
  eventKey: crypto.randomUUID(),
};
await moveStock(input, actor);
await moveStock(input, actor);
assert.equal(
  (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock,
  v.stock + 3,
);
await assert.rejects(moveStock({ ...input, quantity: 4 }, actor));
await assert.rejects(
  moveStock({ ...input, eventKey: crypto.randomUUID() }, buyer),
);
await assert.rejects(
  moveStock(
    { ...input, kind: "OUT", quantity: 100000, eventKey: crypto.randomUUID() },
    actor,
  ),
);
await assert.rejects(
  moveStock({ ...input, quantity: -1, eventKey: crypto.randomUUID() }, actor),
);
await assert.rejects(
  moveStock(
    {
      ...input,
      date: new Date(Date.now() + 86400000).toISOString(),
      eventKey: crypto.randomUUID(),
    },
    actor,
  ),
);
await moveStock(
  { ...input, kind: "OUT", eventKey: crypto.randomUUID() },
  actor,
);
assert.equal(
  (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock,
  v.stock,
);
await moveStock(
  { ...input, quantity: 1, eventKey: crypto.randomUUID() },
  actor,
);
const concurrent = await Promise.allSettled(
  [1, 2].map(() =>
    moveStock(
      {
        ...input,
        kind: "OUT",
        quantity: v.stock + 1,
        eventKey: crypto.randomUUID(),
      },
      actor,
    ),
  ),
);
assert.equal(concurrent.filter((r) => r.status === "fulfilled").length, 1);
assert.equal(
  (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock,
  0,
);
if (v.stock)
  await moveStock(
    { ...input, quantity: v.stock, eventKey: crypto.randomUUID() },
    actor,
  );
console.log(
  "PASS inventory: in/out, idempotency, collision, buyer denial, negative prevention, invalid quantity/date, concurrent outbound single winner, baseline restored",
);
await db.$disconnect();
