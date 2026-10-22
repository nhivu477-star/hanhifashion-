import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
const db = new PrismaClient();
const output = "verification/catalog-cleanup";
mkdirSync(output, { recursive: true });
try {
  const products = await db.product.findMany({
    include: {
      mediaAssets: true,
      variants: {
        include: {
          _count: {
            select: { movements: true, exchanges: true, cartItems: true },
          },
        },
      },
      _count: { select: { orderItems: true, costHistory: true } },
    },
  });
  const keep = products.filter(
    (p) =>
      p.slug.startsWith("ls-") &&
      p.mediaAssets.some(
        (a) =>
          a.creator.trim().toUpperCase() === "LSOUL" ||
          /https?:\/\/([^/]+\.)?lsoul\.com\//i.test(a.originalSourceUrl) ||
          /https?:\/\/([^/]+\.)?lsoul\.com\//i.test(a.licenseReference),
      ),
  );
  const selected = products.filter((p) => !keep.some((k) => k.id === p.id));
  const protectedProducts = selected.filter(
    (p) =>
      p._count.orderItems ||
      p._count.costHistory ||
      p.variants.some((v) => v._count.movements || v._count.exchanges),
  );
  const plan = {
    kept: keep.map((p) => ({ id: p.id, name: p.name })),
    delete: selected
      .filter((p) => !protectedProducts.includes(p))
      .map((p) => ({ id: p.id, name: p.name })),
    archive: protectedProducts.map((p) => ({ id: p.id, name: p.name })),
  };
  writeFileSync(output + "/plan.json", JSON.stringify(plan, null, 2));
  if (!process.argv.includes("--apply")) {
    console.log(
      JSON.stringify({
        keep: plan.kept.length,
        delete: plan.delete.length,
        archive: plan.archive.length,
      }),
    );
    process.exitCode = 0;
  } else {
    if (process.env.DATABASE_URL !== "file:./dev.db")
      throw Error("Use the explicitly selected local main database only");
    const ids = plan.delete.map((p) => p.id),
      allIds = selected.map((p) => p.id);
    const variants = selected
      .filter((p) => ids.includes(p.id))
      .flatMap((p) => p.variants.map((v) => v.id));
    const existingKeep = await db.product.findMany({
      where: { id: { in: keep.map((p) => p.id) } },
      include: { variants: true, images: true },
    });
    const before = {
      orders: await db.order.count(),
      payments: await db.payment.count(),
      shipments: await db.shipment.count(),
      refunds: await db.mockRefund.count(),
      movements: await db.inventoryMovement.count(),
    };
    const result = await db.$transaction(
      async (tx) => {
        // Recheck all historical relations inside the write transaction.
        if (
          (await tx.orderItem.count({ where: { productId: { in: ids } } })) ||
          (await tx.inventoryMovement.count({
            where: { variantId: { in: variants } },
          })) ||
          (await tx.exchangeItem.count({
            where: { variantId: { in: variants } },
          })) ||
          (await tx.productCostHistory.count({
            where: { productId: { in: ids } },
          }))
        )
          throw Error("A historical relation appeared; abort deletion");
        await tx.cartItem.deleteMany({
          where: { variantId: { in: variants } },
        });
        await tx.wishlistItem.deleteMany({
          where: { productId: { in: allIds } },
        });
        await tx.outfitItem.deleteMany({ where: { productId: { in: ids } } });
        await tx.outfitCombination.deleteMany({
          where: { color: { productId: { in: ids } } },
        });
        await tx.colorImage.deleteMany({
          where: { color: { productId: { in: ids } } },
        });
        await tx.productImage.deleteMany({ where: { productId: { in: ids } } });
        const media = await tx.mediaAsset.deleteMany({
          where: { productId: { in: ids } },
        });
        const orphanCandidates = await tx.mediaAsset.findMany({
          where: {
            creator: { not: "LSOUL" },
            productId: null,
            productImages: { none: {} },
            colorImages: { none: {} },
          },
          select: { id: true, localPath: true },
        });
        const orphanMedia = await tx.mediaAsset.deleteMany({
          where: {
            id: {
              in: orphanCandidates
                .filter((a) => !/brand|logo/i.test(a.localPath))
                .map((a) => a.id),
            },
          },
        });
        await tx.productVariant.deleteMany({
          where: { productId: { in: ids } },
        });
        await tx.productColor.deleteMany({ where: { productId: { in: ids } } });
        const deleted = await tx.product.deleteMany({
          where: { id: { in: ids } },
        });
        if (protectedProducts.length)
          await tx.product.updateMany({
            where: { id: { in: plan.archive.map((p) => p.id) } },
            data: {
              active: false,
              publicationStatus: "DRAFT",
              featured: false,
              isNew: false,
            },
          });
        await tx.auditLog.create({
          data: {
            actorId: "LOCAL_CATALOG_CLEANUP",
            action: "CATALOG_REMOVE_NON_LSOUL",
            targetId: "local-catalog",
            resourceType: "PRODUCT",
            reason: "User requested removal of products outside LSOUL",
            beforeJson: JSON.stringify({
              products: products.length,
              ...before,
            }),
            afterJson: JSON.stringify({
              kept: keep.length,
              deleted: deleted.count,
              archived: protectedProducts.length,
              media: media.count + orphanMedia.count,
            }),
            detail:
              "Local backup created before cleanup. Historical transaction records and LSOUL products preserved.",
          },
        });
        return {
          deleted: deleted.count,
          archived: protectedProducts.length,
          media: media.count + orphanMedia.count,
        };
      },
      { timeout: 60000 },
    );
    const after = {
      orders: await db.order.count(),
      payments: await db.payment.count(),
      shipments: await db.shipment.count(),
      refunds: await db.mockRefund.count(),
      movements: await db.inventoryMovement.count(),
    };
    const afterKeep = await db.product.findMany({
      where: { id: { in: keep.map((p) => p.id) } },
      include: { variants: true, images: true },
    });
    const normalize = (values: unknown[]) =>
      JSON.stringify(
        values.slice().sort((a: any, b: any) => a.id.localeCompare(b.id)),
      );
    if (
      JSON.stringify(before) !== JSON.stringify(after) ||
      normalize(existingKeep) !== normalize(afterKeep)
    )
      throw Error("Preservation verification failed");
    const foreignKeys = await db.$queryRawUnsafe("PRAGMA foreign_key_check");
    const integrity = await db.$queryRawUnsafe("PRAGMA integrity_check");
    if ((foreignKeys as unknown[]).length)
      throw Error("Foreign key verification failed");
    writeFileSync(
      output + "/results.json",
      JSON.stringify(
        {
          ...result,
          kept: keep.length,
          before,
          after,
          lsoulRowsUnchanged: true,
          foreignKeys,
          integrity,
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        ...result,
        kept: keep.length,
        historyUnchanged: true,
        lsoulRowsUnchanged: true,
        foreignKeys,
        integrity,
      }),
    );
  }
} finally {
  await db.$disconnect();
}
