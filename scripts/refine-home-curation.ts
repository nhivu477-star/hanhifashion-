import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
const db = new PrismaClient();
const photos = JSON.parse(
  await readFile("verification/thu-thao-photo-sources.json", "utf8"),
);
for (const [index, source] of [
  [1, 6],
  [2, 9],
  [3, 7],
]) {
  const localPath = `/images/campaigns/thu-thao/hero-${index}.webp`;
  const data = {
    originalSourceUrl: photos[source],
    creator: "Ảnh Đặng Thu Thảo / nguồn Báo Quốc tế",
    licenseType: "REFERENCE_ONLY",
    licenseReference:
      "https://baoquocte.vn/hoa-hau-dang-thu-thao-thanh-lich-voi-thoi-trang-cong-so-phong-cach-toi-gian-198889.html",
    authorizedUse: "LOCAL_REFERENCE_DEMO",
    role: "EDITORIAL",
    reviewStatus: "PENDING",
    verificationNotes:
      "Real editorial reference photo. No celebrity endorsement asserted. Commercial permission has not been verified.",
  };
  await db.mediaAsset.upsert({
    where: { localPath },
    update: data,
    create: { localPath, ...data },
  });
}
const groups = [
  {
    slug: "modern-office",
    name: "Chỉn chu nơi công sở",
    description:
      "Áo khoác may đứng phom và quần tây cho những ngày cần sự chuyên nghiệp.",
    categories: ["ao-vest-blazer", "quan-tay"],
    cover: "blazer-co-ve-dang-suong",
  },
  {
    slug: "elegant-woman",
    name: "Nét duyên nữ tính",
    description:
      "Đầm và chân váy với đường nét mềm mại, thanh lịch trong từng bước đi.",
    categories: ["dam-cong-so", "chan-vay"],
    cover: "dam-midi-co-v-tay-ngan",
  },
  {
    slug: "timeless-basics",
    name: "Nhẹ nhàng mỗi ngày",
    description:
      "Sơ mi, áo kiểu và áo len mỏng dễ phối cho nhịp sống hằng ngày.",
    categories: ["ao-so-mi", "ao-kieu", "ao-khoac-len"],
    cover: "ao-blouse-tay-bong-theu-noi",
  },
];
const products = await db.product.findMany({
  where: { active: true },
  include: {
    category: true,
    images: { orderBy: { position: "asc" } },
    colors: {
      where: { active: true },
      orderBy: { position: "asc" },
      include: { images: { orderBy: { position: "asc" } } },
    },
  },
});
await db.$transaction(
  async (tx) => {
    for (const group of groups) {
      const collection = await tx.collection.update({
        where: { slug: group.slug },
        data: {
          name: group.name,
          description: group.description,
          image: products.find((p) => p.slug === group.cover)!.images[0].url,
        },
      });
      await tx.collectionProduct.deleteMany({
        where: { collectionId: collection.id },
      });
      for (const p of products.filter((p) =>
        group.categories.includes(p.category.slug),
      ))
        await tx.collectionProduct.create({
          data: { collectionId: collection.id, productId: p.id },
        });
    }
    const names: Record<string, string> = {
      "monday-elegance": "Thanh lịch đầu tuần",
      "modern-professional": "Diện mạo chuyên nghiệp",
      "friday-chic": "Cảm hứng cuối tuần",
      "soft-elegance": "Thanh lịch dịu dàng",
      "powder-blue-collection": "Sắc xanh dịu mát",
      "neutral-essentials": "Gam màu trung tính",
      "spring-office": "Công sở ngày xuân",
      "elegant-meetings": "Chỉn chu ngày họp",
      "feminine-silhouettes": "Đường nét nữ tính",
      "timeless-workwear": "Công sở vượt thời gian",
    };
    for (const [slug, name] of Object.entries(names))
      await tx.collection.updateMany({ where: { slug }, data: { name } });
    for (const slug of [
      "ao-so-mi",
      "ao-kieu",
      "ao-vest-blazer",
      "quan-tay",
      "chan-vay",
      "dam-cong-so",
    ]) {
      const p = products.find((p) => p.category.slug === slug)!;
      await tx.category.update({
        where: { slug },
        data: { image: p.colors[0].images[0].url },
      });
    }
  },
  { timeout: 30000 },
);
await db.$disconnect();
console.log(
  "Three distinct Vietnamese collections, six category garment photos, three editorial banners registered.",
);
