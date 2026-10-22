import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const image = "/images/campaigns/hero-office-blue-floral.webp";
await db.mediaAsset.upsert({
  where: { localPath: image },
  update: {},
  create: {
    localPath: image,
    originalSourceUrl: "User supplied banner, 2026-10-18",
    creator: "User supplied artwork; clothing edited with built-in image editor",
    licenseType: "USER_PROVIDED",
    licenseReference: "/images/campaigns/office-blue-original.png",
    authorizedUse: "LOCAL_REFERENCE_DEMO",
    role: "EDITORIAL",
    reviewStatus: "PENDING",
    verificationNotes:
      "User supplied banner edited to ivory office blouse and pastel floral skirt. No banner logo. Original face, pose and blue office composition preserved. Identity of pictured model is not asserted.",
  },
});
const current = await db.banner.findFirst({ where: { active: true } });
const data = {
  image,
  title: "The Art of Office Elegance",
  subtitle: "Thanh lịch từ công sở đến mọi khoảnh khắc.",
  href: "/hang-moi",
  active: true,
};
await db.$transaction(async (tx) => {
  await tx.banner.updateMany({ data: { active: false } });
  if (current) await tx.banner.update({ where: { id: current.id }, data });
  else await tx.banner.create({ data });
});
await db.$disconnect();
console.log("Updated user-supplied campaign banner");
