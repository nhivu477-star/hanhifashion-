import { z } from "zod";
import { Prisma } from "@prisma/client";
import { orderTransaction } from "./order-lifecycle";
import { operationalAudit, requireActorPermission } from "./authorization";
import { adminSnapshot } from "./admin-audit";
import { Permission } from "./rbac";
export async function saveSupportingEntity(
  target: string,
  b: Record<string, any>,
  admin: { id: string },
) {
  const permission: Record<string, Permission> = {
    category: "products.update",
    collection: "products.update",
    banner: "content.manage",
    inquiry: "inquiries.manage",
    customer: "customers.manage",
  };
  if (!permission[target]) throw Error("Chức năng không hợp lệ.");
  return orderTransaction(async (db) => {
    await requireActorPermission(db, admin, permission[target]);
    const usingClient = async <T>(
      fn: (tx: Prisma.TransactionClient) => Promise<T>,
    ) => fn(db);
    const before = await adminSnapshot(db, target, String(b.id ?? ""));
    let id = "";
    if (target === "category") {
      const d = z
        .object({
          name: z.string().min(2),
          slug: z.string().regex(/^[a-z0-9-]+$/),
          description: z.string().min(5),
          image: z.string().startsWith("/images/"),
          parentId: z.preprocess(
            (v) => (v === "" || v == null ? null : v),
            z.string().nullable(),
          ),
          sortOrder: z.coerce.number().int().min(0).default(0),
          active: z.boolean().default(true),
        })
        .parse(b);
      if (d.parentId) {
        const parent = await db.category.findUnique({
          where: { id: d.parentId },
        });
        if (!parent || parent.parentId || b.id === d.parentId)
          throw new Error("Danh mục cha không hợp lệ.");
        if (
          b.id &&
          ((await db.category.count({ where: { parentId: String(b.id) } })) ||
            (await db.product.count({ where: { categoryId: String(b.id) } })))
        )
          throw new Error(
            "Không thể chuyển danh mục có danh mục con hoặc sản phẩm chính thành danh mục con.",
          );
      }
      if (b.id) {
        const assigned = await db.product.findFirst({
          where: {
            subcategoryId: String(b.id),
            categoryId: { not: d.parentId ?? "" },
          },
        });
        if (assigned)
          throw new Error(
            "Cần chuyển sản phẩm sang đúng danh mục chính trước khi đổi danh mục cha.",
          );
      }
      const r = b.id
        ? await db.category.update({ where: { id: String(b.id) }, data: d })
        : await db.category.create({ data: d });
      id = r.id;
    } else if (target === "collection") {
      const d = z
        .object({
          name: z.string().min(2),
          slug: z.string().regex(/^[a-z0-9-]+$/),
          description: z.string().min(5),
          image: z.string().startsWith("/"),
        })
        .parse(b);
      await usingClient(async (tx) => {
        const r = b.id
          ? await tx.collection.update({
              where: { id: String(b.id) },
              data: d,
            })
          : await tx.collection.create({ data: d });
        id = r.id;
        if (Array.isArray(b.productIds)) {
          await tx.collectionProduct.deleteMany({
            where: { collectionId: id },
          });
          await tx.collectionProduct.createMany({
            data: [...new Set<string>(b.productIds)].map((productId) => ({
              collectionId: id,
              productId,
            })),
          });
        }
      });
    } else if (target === "banner") {
      const d = z
        .object({
          title: z.string().min(2),
          subtitle: z.string(),
          image: z.string().startsWith("/"),
          href: z.string().startsWith("/"),
          active: z.boolean(),
        })
        .parse(b);
      const r = b.id
        ? await db.banner.update({ where: { id: String(b.id) }, data: d })
        : await db.banner.create({ data: d });
      id = r.id;
    } else if (target === "inquiry") {
      const d = z
        .object({
          id: z.string(),
          status: z.enum(["NEW", "READ", "RESOLVED"]),
        })
        .parse(b);
      await db.inquiry.update({
        where: { id: d.id },
        data: { status: d.status },
      });
      id = d.id;
    } else if (target === "customer") {
      const d = z.object({ id: z.string(), active: z.boolean() }).parse(b);
      if (d.id === admin.id)
        throw new Error("Không thể khóa tài khoản đang sử dụng.");
      const customerAccount = await db.user.findUniqueOrThrow({
        where: { id: d.id },
      });
      if (customerAccount.role !== "CUSTOMER")
        throw new Error("Dùng module nhân viên cho tài khoản nội bộ.");
      await usingClient(async (tx) => {
        await tx.user.update({
          where: { id: d.id },
          data: { active: d.active, permissionVersion: { increment: 1 } },
        });
        await tx.session.deleteMany({ where: { userId: d.id } });
      });
      id = d.id;
    }
    await operationalAudit(
      db,
      admin.id,
      target.toUpperCase(),
      target.toUpperCase(),
      id,
      before,
      await adminSnapshot(db, target, id),
      "Cập nhật nội bộ",
    );
    return id;
  });
}
