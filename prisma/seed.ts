import { PrismaClient } from "@prisma/client";
import {
  categories,
  colors,
  sizes,
  normalize,
  fits,
  occasions,
  sizeGuide,
} from "../src/lib/catalog";
import { assertSeedTarget } from "../scripts/demo-workspace";
import { applyTaxonomy } from "../scripts/apply-taxonomy";
import { enrichCatalog } from "../scripts/enrich-catalog";
import { supplementColors } from "../scripts/supplement-colors";
import { refreshSearch } from "../src/lib/search";
export async function seedCatalog() {
  await assertSeedTarget();
  const db = new PrismaClient();
  try {
  if (await db.user.count() || await db.product.count() || await db.order.count() || await db.category.count() || await db.storeSetting.count())
    throw Error("Seed requires an empty database; existing data and accounts were not changed.");
  const adjectives = [
    "Thanh Lịch",
    "Dáng Suông",
    "Cổ Điển",
    "Tinh Tế",
    "Hiện Đại",
    "Mềm Mại",
    "Tối Giản",
    "Phối Nút",
    "Cao Cấp",
    "Nhẹ Nhàng",
    "Dáng Dài",
    "Phối Ly",
    "Tay Lỡ",
    "Duyên Dáng",
    "Nếp Gấp",
    "Tôn Dáng",
    "Cổ Đức",
    "Cổ Nơ",
  ];
  let count = 0;
  for (const [slug, name, total, material, base] of categories) {
    const cat = await db.category.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name,
        description: `Những thiết kế ${name.toLowerCase()} với đường cắt tinh tế, dễ phối cho một tuần làm việc tự tin.`,
        image: "",
      },
    });
    for (let i = 0; i < total; i++) {
      count++;
      const sku = `HN${String(count).padStart(3, "0")}`;
      const color =
        colors[
          (i + categories.findIndex((c) => c[0] === slug)) % colors.length
        ];
      const title = `${name} ${material} ${adjectives[i]} ${color[0]}`;
      const pslug = normalize(title).replace(/[^a-z0-9]+/g, "-");
      const price = base + (i % 5) * 50000;
      await db.product.upsert({
        where: { sku },
        update: {},
        create: {
          sku,
          slug: pslug,
          name: title,
          description: `${title} được xây dựng quanh phom dáng cân đối và cảm giác thoải mái. Dễ dàng kết hợp cùng các thiết kế trung tính để đi làm, gặp gỡ đối tác hoặc dạo phố. Sản phẩm và thông số thuộc bộ dữ liệu minh họa, không đại diện cho hàng hóa đang bán.`,
          categoryId: cat.id,
          material,
          style: ["Thanh lịch", "Tối giản", "Hiện đại", "Nữ tính"][i % 4],
          fit: fits[i % fits.length],
          occasion: occasions[i % occasions.length],
          price,
          salePrice: i % 4 === 0 ? price - 100000 : null,
          featured: i < 3,
          isNew: i < 5,
          searchText: normalize(
            `${title} ${sku} ${name} ${material} ${fits[i % fits.length]}`,
          ),
          variants: {
            create: [
              color,
              colors[
                (i + categories.findIndex((c) => c[0] === slug) + 2) %
                  colors.length
              ],
            ].flatMap((c, ci) =>
              sizes.map((size, si) => ({
                sku: `${sku}-${ci}-${size}`,
                size,
                color: c[0],
                colorHex: c[1],
                stock: i === 0 && si === 0 ? 0 : 5 + ((i + si) % 20),
                stockOrigin: "SAMPLE",
              })),
            ),
          },
        },
      });
    }
  }
  for (const [i, name] of [
    "Modern Office",
    "Elegant Woman",
    "Timeless Basics",
    "Monday Elegance",
    "Modern Professional",
    "Friday Chic",
  ].entries()) {
    const slug = normalize(name).replaceAll(" ", "-");
    const collection = await db.collection.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name,
        description:
          "Những kết hợp thanh lịch, từ cuộc hẹn đầu ngày đến khoảnh khắc sau giờ làm.",
        image: "/images/awaiting-photo.svg",
      },
    });
    const products = await db.product.findMany({ skip: i * 8, take: 20 });
    for (const p of products)
      await db.collectionProduct.upsert({
        where: {
          collectionId_productId: {
            collectionId: collection.id,
            productId: p.id,
          },
        },
        update: {},
        create: { collectionId: collection.id, productId: p.id },
      });
  }
  const settings = {
    announcement: "THANH LỊCH MỖI NGÀY CÙNG HÀ NHI",
    brandStory:
      "HÀ NHI FASHION mang đến những thiết kế thời trang công sở thanh lịch, hiện đại và tinh tế, giúp người phụ nữ tự tin thể hiện phong cách riêng.",
    newsletter:
      "Một chút cảm hứng cho tủ đồ của nàng. Nhận tin về thiết kế và bộ sưu tập mới.",
    contactEmail: "",
    contactPhone: "",
    facebookUrl: "",
    instagramUrl: "",
    instagramMessageUrl: "",
    footerAddress: "Cửa hàng demo trên máy tính · Chưa mở bán",
    sizeGuide: JSON.stringify(sizeGuide),
  };
  for (const [key, value] of Object.entries(settings))
    await db.storeSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  if (!(await db.banner.count()))
    await db.banner.create({
      data: {
        title: "Nghệ thuật của sự thanh lịch",
        subtitle: "Thanh lịch từ công sở đến mọi khoảnh khắc.",
        image: "/images/awaiting-photo.svg",
        href: "/bo-suu-tap/modern-office",
      },
    });
  await db.coupon.upsert({
    where: { code: "CHAO10" },
    update: {},
    create: {
      code: "CHAO10",
      type: "PERCENT",
      value: 10,
      minimum: 500000,
      maximum: 200000,
      expiresAt: new Date("2030-01-01"),
      usageLimit: 100,
    },
  });
  await applyTaxonomy(db, false);
  const indexed = await db.product.findMany({
    include: { category: true, collections: { include: { collection: true } } },
  });
  for (const p of indexed)
    await db.product.update({
      where: { id: p.id },
      data: {
        searchText: normalize(
          [
            p.name,
            p.sku,
            p.description,
            p.category.name,
            p.material,
            p.style,
            p.fit,
            p.occasion,
            ...p.collections.map((c) => c.collection.name),
          ].join(" "),
        ),
      },
    });
  // Enrich sample sizes, colors and outfits without importing reference photos or real contacts.
  await enrichCatalog(db);
  await supplementColors(db);
  await enrichCatalog(db);
  await refreshSearch();
  console.log(
    `Seed complete: ${await db.product.count()} local designs, ${await db.category.count({ where: { parentId: null } })} categories, ${await db.collection.count()} collections. No fake orders or customers.`,
  );
  } finally {
    await db.$disconnect();
  }
}
if (process.argv[1]?.endsWith("/seed.ts"))
  await seedCatalog();
