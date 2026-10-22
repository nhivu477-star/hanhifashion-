import { Prisma } from "@prisma/client";
import { orderTransaction } from "./order-lifecycle";
import { operationalAudit, requireActorPermission } from "./authorization";
import { adminSnapshot } from "./admin-audit";
import { z } from "zod";
import { chartSchema } from "./sizing";
import { inspectLocalImage, localImagePattern } from "./local-images";
const localImage = z.string().regex(localImagePattern);
async function saveFeature(
  target: string,
  b: any,
  db: Prisma.TransactionClient,
): Promise<string> {
  const usingClient = async <T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ) => fn(db);
  if (target === "color") {
    const d = z
      .object({
        id: z.string().optional(),
        productId: z.string(),
        name: z.string().min(1).max(80),
        hex: z.string().regex(/^#[a-fA-F0-9]{6}$/),
        position: z.coerce.number().int().min(0).max(100).default(0),
        imagesText: z.string().max(10000).default(""),
      })
      .parse(b);
    const urls = z
      .array(localImage)
      .max(16)
      .parse([
        ...new Set(
          d.imagesText
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ]);
    await Promise.all(urls.map(inspectLocalImage));
    return usingClient(async (tx) => {
      let c;
      if (d.id) {
        const old = await tx.productColor.findUniqueOrThrow({
          where: { id: d.id },
        });
        if (old.productId !== d.productId)
          throw new Error("Màu không thuộc sản phẩm này.");
        c = await tx.productColor.update({
          where: { id: d.id },
          data: { name: d.name, hex: d.hex, position: d.position },
        });
        await tx.productVariant.updateMany({
          where: {
            productId: d.productId,
            OR: [{ colorId: d.id }, { color: old.name }],
          },
          data: { colorId: c.id, color: d.name, colorHex: d.hex },
        });
      } else
        c = await tx.productColor.create({
          data: {
            productId: d.productId,
            name: d.name,
            hex: d.hex,
            position: d.position,
          },
        });
      await tx.product.update({
        where: { id: d.productId },
        data: { publicationStatus: "PENDING_ASSETS" },
      });
      const product = await tx.product.findUniqueOrThrow({
        where: { id: d.productId },
      });
      await tx.colorImage.deleteMany({ where: { colorId: c.id } });
      await tx.colorImage.createMany({
        data: urls.map((url, position) => ({
          colorId: c.id,
          url,
          alt: `${product.name} — ${d.name}`,
          position,
        })),
      });
      for (const url of urls) {
        const asset = await tx.mediaAsset.findUnique({
          where: { localPath: url },
        });
        if (asset?.productId === d.productId && asset.colorId === c.id)
          await tx.colorImage.updateMany({
            where: { colorId: c.id, url },
            data: { mediaAssetId: asset.id },
          });
      }
      const primary = await tx.productColor.findFirst({
        where: { productId: d.productId },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        include: { images: { orderBy: { position: "asc" } } },
      });
      if (primary?.images.length) {
        await tx.productImage.deleteMany({ where: { productId: d.productId } });
        await tx.productImage.createMany({
          data: primary.images.map((i: any) => ({
            productId: d.productId,
            url: i.url,
            alt: i.alt,
            position: i.position,
            mediaAssetId: i.mediaAssetId,
          })),
        });
      }
      return c.id;
    });
  }
  if (target === "outfit") {
    const d = z
      .object({
        id: z.string().optional(),
        colorId: z.string(),
        productId: z.string(),
        targetColorId: z.string(),
        title: z.string().min(2).max(150),
        remove: z.boolean().optional(),
      })
      .parse(b);
    return usingClient(async (tx) => {
      if (d.id) {
        const old = await tx.outfitCombination.findUniqueOrThrow({
          where: { id: d.id },
        });
        if (old.colorId !== d.colorId)
          throw new Error("Gợi ý không thuộc màu đang sửa.");
        if (d.remove) {
          await tx.outfitCombination.delete({ where: { id: d.id } });
          return d.id;
        }
      }
      const source = await tx.productColor.findUniqueOrThrow({
        where: { id: d.colorId },
      });
      const chosen = await tx.productColor.findUniqueOrThrow({
        where: { id: d.targetColorId },
        include: {
          product: { include: { category: true } },
          variants: true,
          images: true,
        },
      });
      if (
        chosen.productId !== d.productId ||
        source.productId === d.productId ||
        !chosen.product.active ||
        !chosen.product.category.active ||
        !chosen.variants.some((v) => v.stock > 0) ||
        !chosen.images.length
      )
        throw new Error(
          "Hãy chọn thiết kế khác đang hoạt động, có ảnh đúng màu và còn hàng.",
        );
      const data = {
        colorId: d.colorId,
        title: d.title,
        items: { create: { productId: d.productId, colorId: d.targetColorId } },
      };
      if (d.id) {
        await tx.outfitItem.deleteMany({ where: { outfitId: d.id } });
        return (
          await tx.outfitCombination.update({ where: { id: d.id }, data })
        ).id;
      }
      return (await tx.outfitCombination.create({ data })).id;
    });
  }
  const d = z
    .object({
      productId: z.string(),
      categoryId: z.string(),
      scope: z.enum(["product", "category"]),
      kind: z.string(),
      notes: z.string(),
      rowsJson: z.string(),
      matrixJson: z.string().default("[]"),
      inherit: z.boolean().optional(),
    })
    .parse(b);
  const p = await db.product.findUniqueOrThrow({ where: { id: d.productId } });
  if (p.categoryId !== d.categoryId)
    throw new Error("Danh mục không khớp sản phẩm.");
  if (d.inherit) {
    await db.sizeChart.deleteMany({ where: { productId: d.productId } });
    return d.productId;
  }
  let rows, matrix;
  try {
    rows = JSON.parse(d.rowsJson);
    matrix = JSON.parse(d.matrixJson || "[]");
  } catch {
    throw new Error(
      "JSON bảng size chưa hợp lệ. Nàng kiểm tra dấu ngoặc và dấu phẩy nhé.",
    );
  }
  const chart = chartSchema.parse({
    kind: d.kind,
    notes: d.notes,
    rows,
    matrix,
  });
  const data = {
    kind: chart.kind,
    notes: chart.notes,
    rowsJson: JSON.stringify(chart.rows),
    matrixJson: JSON.stringify(chart.matrix),
  };
  const where =
    d.scope === "category"
      ? { categoryId: d.categoryId }
      : { productId: d.productId };
  return (
    await db.sizeChart.upsert({
      where,
      update: data,
      create: { ...where, ...data },
    })
  ).id;
}

export async function saveCatalogFeature(
  target: string,
  b: any,
  actor: { id: string },
) {
  return orderTransaction(async (tx) => {
    await requireActorPermission(tx, actor, "products.update");
    const before = await adminSnapshot(
      tx,
      target,
      String(b.id ?? b.productId ?? ""),
    );
    const id = await saveFeature(target, b, tx);
    await operationalAudit(
      tx,
      actor.id,
      target.toUpperCase(),
      target.toUpperCase(),
      id,
      before,
      await adminSnapshot(tx, target, id),
      "Cập nhật cấu hình sản phẩm",
    );
    return id;
  });
}
