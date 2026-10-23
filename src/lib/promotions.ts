import { z } from "zod";
import { orderTransaction } from "./order-lifecycle";
import { operationalAudit, requireActorPermission } from "./authorization";

export function promotionDate(value: unknown, end = false): Date | null {
  if (value === "" || value == null) return null;
  const text = String(value);
  if (
    !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(text) ||
    !Number.isFinite(new Date(text.slice(0, 10) + "T00:00:00Z").getTime()) ||
    new Date(text.slice(0, 10) + "T00:00:00Z").toISOString().slice(0, 10) !==
      text.slice(0, 10)
  )
    throw Error("Ngày mã giảm giá không hợp lệ.");
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(text)
      ? text + (end ? "T23:59:59.999+07:00" : "T00:00:00+07:00")
      : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)
        ? text + ":00+07:00"
        : text,
  );
  if (!Number.isFinite(date.getTime()))
    throw Error("Thời gian mã giảm giá không hợp lệ.");
  return date;
}
export const promotionInput = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .transform((v) => v.toUpperCase()),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.coerce.number().int().positive().max(100000000),
    minimum: z.coerce.number().int().nonnegative().max(1000000000),
    maximum: z.preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z.number().int().nonnegative().max(1000000000).nullable(),
    ),
    startsAt: z.unknown().transform((v) => promotionDate(v)),
    expiresAt: z
      .unknown()
      .transform((v) => promotionDate(v, true))
      .refine((v) => !!v, "Cần ngày hết hạn"),
    usageLimit: z.coerce.number().int().positive().max(100000000),
    active: z.boolean(),
  })
  .superRefine((d, ctx) => {
    if (d.type === "PERCENT" && d.value > 100)
      ctx.addIssue({
        code: "custom",
        message: "Phần trăm không thể vượt quá 100.",
      });
    if (d.startsAt && d.expiresAt && d.startsAt > d.expiresAt)
      ctx.addIssue({
        code: "custom",
        message: "Ngày bắt đầu phải trước ngày hết hạn.",
      });
  });
export function validPromotion(
  coupon: {
    active: boolean;
    startsAt?: Date | null;
    expiresAt: Date;
    used: number;
    usageLimit: number;
    minimum: number;
  },
  subtotal: number,
  now = new Date(),
) {
  return (
    coupon.active &&
    (!coupon.startsAt || coupon.startsAt <= now) &&
    coupon.expiresAt >= now &&
    coupon.used < coupon.usageLimit &&
    subtotal >= coupon.minimum
  );
}
export async function savePromotion(input: unknown, actor: { id: string; permissionVersion: number }) {
  const d = promotionInput.parse(input);
  const id = z.object({ id: z.string().optional() }).parse(input).id;
  return orderTransaction(async (tx) => {
    await requireActorPermission(tx, actor, "promotions.manage");
    const before = id
      ? await tx.coupon.findUniqueOrThrow({ where: { id } })
      : null;
    if (before && d.usageLimit < before.used)
      throw Error("Giới hạn lượt dùng không được thấp hơn số lượt đã sử dụng.");
    const data = { ...d, expiresAt: d.expiresAt! };
    const saved = id
      ? await tx.coupon.update({ where: { id }, data })
      : await tx.coupon.create({ data });
    await operationalAudit(
      tx,
      actor.id,
      "COUPON",
      "COUPON",
      saved.id,
      before,
      saved,
      "Cập nhật mã giảm giá",
    );
    return saved.id;
  });
}
