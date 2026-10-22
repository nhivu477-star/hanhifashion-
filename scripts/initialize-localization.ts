import { db } from "../src/lib/db";
import { defaultCurrencyConfig } from "../src/lib/localization/config";
import { operationalAudit } from "../src/lib/authorization";
await db.$transaction(async (tx) => {
  const key = "localization.currencies";
  if (await tx.storeSetting.findUnique({ where: { key } })) return;
  const actor = await tx.user.findFirstOrThrow({
    where: { role: "SUPER_ADMIN", active: true },
  });
  await tx.storeSetting.create({
    data: { key, value: JSON.stringify(defaultCurrencyConfig) },
  });
  await operationalAudit(
    tx,
    actor.id,
    "CURRENCY_REFERENCE_INITIALIZED",
    "SETTINGS",
    key,
    null,
    defaultCurrencyConfig,
    "Khởi tạo bảng tham chiếu hiển thị local; không đổi dữ liệu giao dịch",
  );
});
await db.$disconnect();
console.log(
  "Local currency reference initialized without replacing existing settings.",
);
