import { z } from "zod";
import { customerAddressSchema } from "./localization/config";
import { orderTransaction } from "./order-lifecycle";
import { operationalAudit } from "./authorization";
export async function saveCustomerAddress(
  input: Record<string, unknown>,
  actor: { id: string },
) {
  const operation = z
    .object({
      id: z.string().optional(),
      delete: z.boolean().optional(),
      makeDefault: z.boolean().optional(),
      isDefault: z.boolean().optional(),
    })
    .parse(input);
  return orderTransaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: actor.id } });
    if (!user.active) throw Error("Tài khoản không hoạt động.");
    const old = operation.id
      ? await tx.address.findFirst({
          where: { id: operation.id, userId: user.id },
        })
      : null;
    if (operation.id && !old)
      throw Error("Địa chỉ không tồn tại hoặc không thuộc tài khoản này.");
    if (operation.delete) {
      if (!old) throw Error("Cần chọn địa chỉ cần xóa.");
      await tx.address.delete({ where: { id: old.id } });
      if (old.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "asc" },
        });
        if (next)
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
      }
      await operationalAudit(
        tx,
        user.id,
        "ADDRESS_DELETED",
        "ADDRESS",
        old.id,
        null,
        { deleted: true },
        "Xóa địa chỉ cá nhân",
      );
      return { id: old.id };
    }
    if (operation.makeDefault) {
      if (!old) throw Error("Cần chọn địa chỉ mặc định.");
      await tx.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
      await tx.address.update({
        where: { id: old.id },
        data: { isDefault: true },
      });
      await operationalAudit(
        tx,
        user.id,
        "ADDRESS_DEFAULT",
        "ADDRESS",
        old.id,
        null,
        { isDefault: true },
        "Chọn địa chỉ mặc định",
      );
      return { id: old.id };
    }
    const {
      email: _email,
      notes: _notes,
      ...data
    } = customerAddressSchema.parse({ ...input, email: user.email });
    const existingDefault = await tx.address.findFirst({
      where: { userId: user.id, isDefault: true },
    });
    const isDefault =
      operation.isDefault === true ||
      !existingDefault ||
      existingDefault.id === old?.id;
    if (isDefault)
      await tx.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    const saved = old
      ? await tx.address.update({
          where: { id: old.id },
          data: { ...data, isDefault },
        })
      : await tx.address.create({
          data: { ...data, isDefault, userId: user.id },
        });
    await operationalAudit(
      tx,
      user.id,
      "ADDRESS_SAVED",
      "ADDRESS",
      saved.id,
      null,
      { isDefault },
      "Lưu địa chỉ cá nhân",
    );
    return { id: saved.id };
  });
}
