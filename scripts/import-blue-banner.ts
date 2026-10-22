import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
const db = new PrismaClient();
const source = "https://www.glamour.com/story/one-easy-makeup-move-you-can-s";
const path = "/images/hero-miranda-blue.webp";
await sharp(
  execFileSync(
    "curl",
    [
      "-f",
      "-L",
      "-s",
      "--max-time",
      "30",
      "https://media.glamour.com/photos/5695e84e16d0dc3747ee9c8f/master/w_1600%2Cc_limit/beauty-2014-07-miranda-kerr-filled-in-eyebrows-makeup-trick-main.jpg",
    ],
    { maxBuffer: 20 * 1024 * 1024 },
  ),
)
  .rotate()
  .resize({ width: 1500, withoutEnlargement: true })
  .webp({ quality: 88 })
  .toFile("public" + path);
await db.mediaAsset.upsert({
  where: { localPath: path },
  update: {},
  create: {
    localPath: path,
    originalSourceUrl: source,
    creator: "Glamour / original photographer credited by source",
    licenseType: "UNKNOWN",
    licenseReference: source,
    authorizedUse: "LOCAL_REFERENCE_DEMO",
    role: "DEVELOPMENT",
    reviewStatus: "PENDING",
    garmentVerified: false,
    verificationNotes:
      "Real photograph of Miranda Kerr wearing a blue shirt, identified in linked Glamour article. User-requested local style reference only. No HÀ NHI endorsement asserted; commercial use not cleared.",
  },
});
const old = await db.banner.findFirst({ where: { active: true } });
const data = {
  title: "Thanh lịch trong sắc xanh",
  subtitle: "Nhẹ nhàng cho nhịp sống công sở.",
  image: path,
  href: "/hang-moi",
  active: true,
};
await db.$transaction(async (tx) => {
  await tx.banner.updateMany({ data: { active: false } });
  if (old) await tx.banner.update({ where: { id: old.id }, data });
  else await tx.banner.create({ data });
});
console.log("Updated powder-blue campaign banner");
await db.$disconnect();
