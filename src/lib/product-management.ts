import { nextProductSku, productSkuPattern, productSkuPrefix } from "./product-sku";
import { z } from "zod";
import { normalize } from "./catalog";
import { inspectLocalImage, localImagePattern } from "./local-images";
import { orderTransaction } from "./order-lifecycle";
import { operationalAudit, requireActorPermission } from "./authorization";
import { adminSnapshot } from "./admin-audit";

export async function saveProduct(
  b: Record<string, unknown>,
  actor: { id: string; permissionVersion: number },
) {
  return orderTransaction(async (db) => {
    await requireActorPermission(
      db,
      actor,
      b.id ? "products.update" : "products.create",
    );
    if (b.active === false)
      await requireActorPermission(db, actor, "products.archive");
    const before = b.id
      ? await adminSnapshot(db, "product", String(b.id))
      : null;
    let id = "";
    const data = z
      .object({
        name: z.string().min(3).max(200),
        slug: z.string().regex(/^[a-z0-9-]+$/),
        sku: z.string().trim().max(80).default(""),
        description: z.string().min(10),
        details: z.string().max(10000).optional(),
        care: z.string().max(5000).optional(),
        styling: z.string().max(5000).optional(),
        fitClass: z
          .enum(["slim", "regular", "relaxed", "oversized"])
          .optional(),
        stretchVerified: z.boolean().optional(),
        stretchAllowance: z.coerce.number().min(0).max(3).optional(),
        categoryId: z.string(),
        subcategoryId: z.preprocess(
          (v) => (v === "" || v == null ? null : v),
          z.string().nullable(),
        ),
        sleeveType: z.string().max(100).default(""),
        length: z.string().max(100).default(""),
        styleTags: z.string().max(500).default(""),
        material: z.string(),
        style: z.string(),
        fit: z.string(),
        occasion: z.string(),
        price: z.coerce.number().int().min(1).max(100000000),
        salePrice: z.preprocess(
          (v) => (v === "" || v == null ? null : Number(v)),
          z.number().int().positive().nullable(),
        ),
        active: z.boolean(),
        featured: z.boolean(),
        isNew: z.boolean(),
      })
      .parse(b);
    if (data.salePrice && data.salePrice >= data.price)
      throw new Error("Giá ưu đãi phải thấp hơn giá gốc.");
    const root = await db.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!root || root.parentId) throw new Error("Hãy chọn một danh mục chính.");
    if (data.subcategoryId) {
      const sub = await db.category.findUnique({
        where: { id: data.subcategoryId },
      });
      if (!sub || sub.parentId !== root.id)
        throw new Error("Danh mục con phải thuộc danh mục chính đã chọn.");
    }
    const storedIdentity = b.id
      ? await db.product.findUnique({
          where: { id: String(b.id) },
          select: { sku: true, categoryId: true },
        })
      : null;
    const unchangedIdentity = storedIdentity &&
      storedIdentity.sku === data.sku && storedIdentity.categoryId === data.categoryId;
    if (!unchangedIdentity) {
      const skuPrefix = productSkuPrefix(root.slug);
      if (!data.sku)
        data.sku = nextProductSku(skuPrefix, await db.product.findMany({ where: { sku: { startsWith: skuPrefix } }, select: { sku: true } }));
      if (!productSkuPattern.test(data.sku) || !data.sku.startsWith(skuPrefix) || data.sku.endsWith("0000"))
        throw new Error(`Mã sản phẩm phải theo dạng ${skuPrefix}0001 và đúng nhóm danh mục.`);
    }
    const searchText = normalize(Object.values(data).join(" "));
    const image = z
      .string()
      .refine((v) => localImagePattern.test(v), "Ảnh phải được lưu trong máy.")
      .parse(b.image);
    const urls = [
      ...new Set([
        image,
        ...String(b.gallery ?? "")
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean),
      ]),
    ];
    z.array(z.string().regex(localImagePattern)).max(16).parse(urls);
    await Promise.all(urls.map(inspectLocalImage));
    const imageData = urls.map((url, position) => ({
      url,
      alt: "Minh họa " + data.name,
      position,
    }));
    if (b.id) {
      id = String(b.id);
      await db.product.update({
        where: { id },
        data: {
          ...data,
          publicationStatus: "PENDING_ASSETS",
          searchText,
          images: { deleteMany: {}, create: imageData },
        },
      });
    } else {
      const product = await db.product.create({
        data: {
          ...data,
          searchText,
          images: { create: imageData },
          variants: {
            create: {
              sku: data.sku + "-M-BE",
              size: "M",
              color: "Be",
              colorHex: "#c7b59d",
              stock: 0,
            },
          },
        },
      });
      id = product.id;
    }

    await operationalAudit(
      db,
      actor.id,
      "PRODUCT",
      "PRODUCT",
      id,
      before,
      await adminSnapshot(db, "product", id),
      "Cập nhật sản phẩm",
    );
    return id;
  });
}
