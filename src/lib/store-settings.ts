import { z } from "zod";
import { orderTransaction } from "./order-lifecycle";
import { operationalAudit, requireActorPermission } from "./authorization";

const fields = {
  announcement: z.string().max(10000),
  brandStory: z.string().max(10000),
  newsletter: z.string().max(10000),
  contactEmail: z.string().email(),
  contactPhone: z.string().regex(/^(\+84|0)[0-9]{9,10}$/),
  facebookUrl: z
    .string()
    .url()
    .refine((v) => new URL(v).protocol === "https:"),
  instagramUrl: z
    .string()
    .url()
    .refine((v) => new URL(v).protocol === "https:"),
  footerAddress: z.string().max(10000),
  salesPolicy: z.string().max(10000),
  returnsInstructions: z.string().max(10000),
  sizeGuide: z
    .string()
    .max(10000)
    .superRefine((value, ctx) => {
      try {
        z.array(
          z.object({
            size: z.string(),
            bust: z.number(),
            waist: z.number(),
            hip: z.number(),
            shoulder: z.number(),
            length: z.number(),
            sleeve: z.number(),
            trouser: z.number(),
            skirt: z.number(),
          }),
        ).parse(JSON.parse(value));
      } catch {
        ctx.addIssue({ code: "custom", message: "Bảng size không hợp lệ." });
      }
    }),
};
export const storeSettingsInput = z.object(fields).partial();
export async function saveStoreSettings(input: unknown, actor: { id: string; permissionVersion: number }) {
  // Validate the entire form before performing the first write.
  const values = storeSettingsInput.parse(input);
  return orderTransaction(async (tx) => {
    await requireActorPermission(tx, actor, "content.manage");
    const keys = Object.keys(values);
    const before = await tx.storeSetting.findMany({
      where: { key: { in: keys } },
    });
    for (const [key, value] of Object.entries(values))
      if (value !== undefined)
        await tx.storeSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
    await operationalAudit(
      tx,
      actor.id,
      "SETTINGS",
      "SETTINGS",
      "store",
      before,
      values,
      "Cập nhật cài đặt cửa hàng",
    );
    return "store";
  });
}
