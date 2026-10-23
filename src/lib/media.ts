import { z } from "zod";
import { inspectLocalImage, localImagePattern } from "./local-images";
import { Prisma } from "@prisma/client";
import { orderTransaction } from "./order-lifecycle";
import { operationalAudit, requireActorPermission } from "./authorization";
import { adminSnapshot } from "./admin-audit";
import { assertProductReady } from "./publication";
const optionalId = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.string().nullable(),
);
async function saveMediaAssetData(
  input: unknown,
  db: Prisma.TransactionClient,
) {
  const usingClient = async <T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ) => fn(db);
  const d = z
    .object({
      id: z.string().optional(),
      localPath: z.string().regex(localImagePattern),
      originalSourceUrl: z.string().url(),
      creator: z.string().max(200).default(""),
      licenseType: z.string().min(3).max(120),
      licenseReference: z.string().min(3).max(1000),
      authorizedUse: z.enum([
        "EDITORIAL_CAMPAIGN",
        "PRODUCT_SALE",
        "LOCAL_PREVIEW_ONLY",
      ]),
      role: z.enum(["EDITORIAL", "PRODUCT", "DEVELOPMENT"]),
      reviewStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "DEVELOPMENT"]),
      verificationNotes: z.string().max(5000).default(""),
      garmentVerified: z.boolean().default(false),
      productId: optionalId,
      colorId: optionalId,
      focalX: z.coerce.number().min(0).max(100).default(50),
      focalY: z.coerce.number().min(0).max(100).default(50),
    })
    .parse(input);
  await inspectLocalImage(d.localPath);
  if (d.colorId) {
    const c = await db.productColor.findUniqueOrThrow({
      where: { id: d.colorId },
    });
    if (c.productId !== d.productId)
      throw new Error("Màu không thuộc sản phẩm đã chọn.");
  }
  if (d.reviewStatus === "APPROVED") {
    if (
      d.role === "PRODUCT" &&
      (d.localPath.endsWith(".svg") ||
        ["LOCAL_DEVELOPMENT", "UNKNOWN"].includes(d.licenseType))
    )
      throw new Error(
        "Ảnh sản phẩm cần ảnh chụp hàng thật và bằng chứng quyền sử dụng hợp lệ.",
      );
    if (
      d.role === "DEVELOPMENT" ||
      d.authorizedUse === "LOCAL_PREVIEW_ONLY" ||
      d.verificationNotes.trim().length < 20
    )
      throw new Error(
        "Ảnh phát triển không thể duyệt thương mại; cần ghi rõ bằng chứng quyền sử dụng.",
      );
    if (
      d.role === "PRODUCT" &&
      (!d.productId ||
        !d.colorId ||
        !d.garmentVerified ||
        d.authorizedUse !== "PRODUCT_SALE")
    )
      throw new Error(
        "Cần xác minh ảnh khớp đúng sản phẩm, màu và quyền dùng để bán hàng.",
      );
    if (d.role === "EDITORIAL" && d.authorizedUse !== "EDITORIAL_CAMPAIGN")
      throw new Error("Ảnh cảm hứng chỉ được duyệt cho nội dung bộ sưu tập.");
  }
  const { id, ...data } = d;
  return usingClient(async (tx) => {
    const old = id
      ? await tx.mediaAsset.findUniqueOrThrow({ where: { id } })
      : null;
    const asset = id
      ? await tx.mediaAsset.update({
          where: { id },
          data: { ...data, reviewedAt: new Date() },
        })
      : await tx.mediaAsset.create({
          data: {
            ...data,
            reviewedAt: d.reviewStatus === "APPROVED" ? new Date() : null,
          },
        });
    if (d.productId)
      await tx.product.update({
        where: { id: d.productId },
        data: { publicationStatus: "PENDING_ASSETS" },
      });
    if (old?.productId && old.productId !== d.productId)
      await tx.product.update({
        where: { id: old.productId },
        data: { publicationStatus: "PENDING_ASSETS" },
      });
    // Relink only existing image slots. Gallery editing stays explicit in the product editor.
    await tx.colorImage.updateMany({
      where: { mediaAssetId: asset.id },
      data: { mediaAssetId: null },
    });
    await tx.productImage.updateMany({
      where: { mediaAssetId: asset.id },
      data: { mediaAssetId: null },
    });
    if (d.role === "PRODUCT" && d.productId && d.colorId) {
      await tx.colorImage.updateMany({
        where: { colorId: d.colorId, url: d.localPath },
        data: { mediaAssetId: asset.id },
      });
      await tx.productImage.updateMany({
        where: { productId: d.productId, url: d.localPath },
        data: { mediaAssetId: asset.id },
      });
    }
    return asset.id;
  });
}
async function savePublicationData(
  input: unknown,
  db: Prisma.TransactionClient,
) {
  const d = z
    .object({
      productId: z.string(),
      merchandiseVerified: z.boolean(),
      publicationStatus: z.enum(["DRAFT", "PENDING_ASSETS", "READY"]),
    })
    .parse(input);
  if (d.publicationStatus === "READY")
    await assertProductReady(d.productId, d.merchandiseVerified, db);
  await db.product.update({
    where: { id: d.productId },
    data: {
      merchandiseVerified: d.merchandiseVerified,
      publicationStatus: d.publicationStatus,
    },
  });
  return d.productId;
}

// Remove metadata only: never delete files or historical image snapshots.
async function deleteMediaAssetData(
  input: unknown,
  db: Prisma.TransactionClient,
) {
  const usingClient = async <T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ) => fn(db);
  const d = z
    .object({ id: z.string(), reason: z.string().trim().min(10).max(1000) })
    .parse(input);
  return usingClient(async (tx) => {
    const a = await tx.mediaAsset.findUniqueOrThrow({ where: { id: d.id } });
    const counts = await Promise.all([
      tx.productImage.count({
        where: { OR: [{ mediaAssetId: a.id }, { url: a.localPath }] },
      }),
      tx.colorImage.count({
        where: { OR: [{ mediaAssetId: a.id }, { url: a.localPath }] },
      }),
      tx.orderItem.count({ where: { image: a.localPath } }),
      tx.banner.count({ where: { image: a.localPath } }),
      tx.collection.count({ where: { image: a.localPath } }),
      tx.category.count({ where: { image: a.localPath } }),
      tx.storeSetting.count({ where: { value: { contains: a.localPath } } }),
    ]);
    if (counts.some(Boolean))
      throw Error("Ảnh còn được tham chiếu; không thể xóa hồ sơ ảnh.");
    await tx.mediaAsset.delete({ where: { id: a.id } });
    return a.id;
  });
}

async function auditedMedia(
  target: "media" | "publication" | "media-delete",
  input: unknown,
  actor: { id: string; permissionVersion: number },
) {
  const b = z
    .object({ id: z.string().optional(), productId: z.string().optional() })
    .parse(input);
  return orderTransaction(async (tx) => {
    await requireActorPermission(
      tx,
      actor,
      target === "publication" ? "products.publish" : "products.update",
    );
    const before = await adminSnapshot(tx, target, b.id ?? b.productId ?? "");
    const id =
      target === "media"
        ? await saveMediaAssetData(input, tx)
        : target === "publication"
          ? await savePublicationData(input, tx)
          : await deleteMediaAssetData(input, tx);
    await operationalAudit(
      tx,
      actor.id,
      target.toUpperCase(),
      "MEDIA",
      id,
      before,
      await adminSnapshot(tx, target, id),
      "Cập nhật hồ sơ ảnh",
    );
    return id;
  });
}
export const saveMediaAsset = (input: unknown, actor: { id: string; permissionVersion: number }) =>
  auditedMedia("media", input, actor);
export const savePublication = (input: unknown, actor: { id: string; permissionVersion: number }) =>
  auditedMedia("publication", input, actor);
export const deleteMediaAsset = (input: unknown, actor: { id: string; permissionVersion: number }) =>
  auditedMedia("media-delete", input, actor);
