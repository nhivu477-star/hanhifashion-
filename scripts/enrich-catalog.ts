import { PrismaClient } from "@prisma/client";
import { normalize } from "../src/lib/catalog";
import { sampleChart } from "../src/lib/sizing";
import { expandedDesigns } from "./catalog-expansion";
import { fashionColors } from "../src/lib/fashion-colors";
// Every entry describes a distinct sample cut. These are illustrations, not verified merchandise.
const designs: Record<string, string[]> = {
  "ao-so-mi": [
    "satin cổ đức tay dài",
    "cotton cổ trụ dáng suông",
    "cổ nơ tay bồng",
    "cổ V vạt chéo",
    "chiết eo tay lỡ",
    "oversized túi ngực",
    "satin cổ thuyền",
    "cổ đức nút ngọc trai",
    "sọc dọc cổ trụ",
    "cổ sen tay ngắn",
    "cổ nhọn nẹp giấu",
    "xếp ly ngực tay dài",
    "cổ bèo tay bo",
    "vạt lệch cổ V",
    "cotton vai rơi",
    "cổ tàu tay xắn",
    "túi hộp tay lỡ",
    "cổ nơ vạt dài",
    "cổ vuông tay phồng",
    "cổ đức lưng xếp ly",
    "satin tay cánh dơi",
    "nẹp đôi cổ trụ",
    "cổ tim chiết eo",
    "cổ tròn khuy sau",
  ],
  "ao-kieu": [
    "cổ vuông tay phồng",
    "cổ bèo chiffon hai lớp",
    "peplum cổ V",
    "cổ thuyền tay lỡ",
    "sát nách xếp ly",
    "cổ tim tay bo",
    "cổ nơ lệch",
    "xếp ly vai tay dài",
    "phối ren cổ tròn",
    "chiffon hai lớp tay rủ",
    "chiết eo cổ đức",
    "vạt chéo thắt bên",
    "cổ đổ satin",
    "cánh tiên cổ vuông",
    "tay tulip cổ tim",
    "nút bọc cổ trụ",
    "cổ sen phối viền",
    "tay raglan dáng suông",
    "túi ngực cổ tròn",
    "vai xếp nếp tay lỡ",
    "cổ chữ U vạt cong",
    "thắt nơ eo tay ngắn",
  ],
  "ao-vest-blazer": [
    "một nút dáng gọn",
    "hai hàng nút dáng dài",
    "không cổ túi viền",
    "cropped cổ ve",
    "tweed cổ tròn",
    "suông tay xắn",
    "chiết eo ve nhọn",
    "linen một hàng nút",
    "gile cổ V",
    "túi hộp thắt đai",
    "ve sam dáng dài",
    "tay lỡ xẻ gấu",
    "kẻ nhỏ hai nút",
    "vạt tròn cổ ve",
    "tweed viền tương phản",
    "vai mềm dáng rộng",
    "peplum cổ ve",
    "gile dài xẻ bên",
  ],
  "quan-tay": [
    "ống đứng cạp cao",
    "ống suông ly trước",
    "ống rộng lưng thun sau",
    "culottes xếp ly",
    "ống loe nhẹ",
    "slim cạp liền",
    "baggy ly đôi",
    "ống đứng gấu lật",
    "ống suông đai rời",
    "ống rộng cạp chéo",
    "cạp cao túi viền",
    "ống lửng xẻ gấu",
    "cạp đính nút lệch",
    "ly giữa ống đứng",
    "ống suông túi chéo",
    "culottes cạp bản",
    "ống rộng ly hộp",
    "baggy cạp cao",
    "ống loe xẻ trước",
    "slim mắt cá",
    "ống đứng nẹp bên",
    "cạp xếp nếp ống suông",
    "ống rộng lưng phẳng",
    "ống lửng gấu bản",
    "ống suông nút bọc",
  ],
  "chan-vay": [
    "chữ A nút trước",
    "bút chì xẻ sau",
    "midi xếp ly",
    "đuôi cá cạp cao",
    "xẻ trước dáng suông",
    "tweed chữ A",
    "vạt chéo thắt bên",
    "midi ly hộp",
    "bút chì túi viền",
    "chữ A đai rời",
    "xếp ly lệch",
    "dáng suông nút bọc",
    "midi cạp bản",
    "đuôi cá xẻ bên",
    "tweed viền nổi",
    "vạt chéo cạp đôi",
    "chữ A túi chéo",
    "bút chì gấu lệch",
    "midi xếp nếp eo",
    "suông xẻ sau",
    "ly quạt cạp cao",
    "chữ A nẹp nút",
    "tulip vạt chéo",
    "midi ly đôi",
    "bút chì thắt đai",
  ],
  "dam-cong-so": [
    "chữ A cổ tròn",
    "midi cổ V",
    "sơ mi thắt đai",
    "chiết eo tay lỡ",
    "cổ vuông tay phồng",
    "xếp ly cổ tim",
    "dáng suông cổ thuyền",
    "vest hai hàng nút",
    "đuôi cá cổ V",
    "tweed cổ tròn",
    "phối màu cổ đức",
    "cổ nơ tay dài",
    "vạt chéo thắt bên",
    "chữ A túi viền",
    "midi ly hộp",
    "sơ mi nút bọc",
    "cổ sen tay ngắn",
    "peplum dáng bút chì",
    "sát nách cổ vuông",
    "cổ đổ satin",
    "tweed viền nổi",
    "suông tay raglan",
    "chiết eo nẹp giấu",
    "midi xếp nếp vai",
    "vest cổ ve sam",
    "chữ A vạt lệch",
    "cổ tàu xẻ bên",
    "cổ tim tay tulip",
    "midi đai bản",
    "sơ mi lưng xếp ly",
  ],
  "set-cong-so": [
    "áo sơ mi và chân váy chữ A",
    "áo kiểu và quần ống đứng",
    "blazer và quần ly trước",
    "blazer và chân váy bút chì",
    "blazer gile và quần tây",
    "gile và quần ống rộng",
    "áo tweed và chân váy",
    "áo peplum và chân váy",
    "áo sát nách và blazer",
    "áo cổ thuyền và quần suông",
    "sơ mi cổ nơ và váy midi",
    "áo cổ vuông và quần culottes",
    "blazer cropped và váy chữ A",
    "blazer đai rời và quần suông",
    "gile dài và quần slim",
    "áo chiffon và váy xếp ly",
    "áo satin và quần cạp chéo",
    "áo cổ tim và váy đuôi cá",
    "áo tweed viền và quần đứng",
    "sơ mi tay lỡ và váy vạt chéo",
    "áo peplum và quần ống loe",
    "blazer cổ tròn và váy midi",
    "áo kiểu xếp ly và quần baggy",
    "gile cổ V và váy chữ A",
  ],
  "ao-khoac-len": [
    "cardigan cổ V nút bọc",
    "cardigan cổ tròn tay dài",
    "len cổ thuyền tay lỡ",
    "len gân cổ tim",
    "cardigan dáng ngắn",
    "len sát nách cổ V",
    "cardigan đai rời",
    "len cổ lọ mỏng",
    "cardigan túi nổi",
    "len tay raglan",
    "cardigan viền tương phản",
    "len cổ polo tay ngắn",
  ],
};
for (const [category, additions] of Object.entries(expandedDesigns))
  designs[category].push(...additions);
const prefixes: Record<string, string> = {
  "ao-so-mi": "Áo sơ mi",
  "ao-kieu": "Áo kiểu",
  "ao-vest-blazer": "Blazer",
  "quan-tay": "Quần tây",
  "chan-vay": "Chân váy",
  "dam-cong-so": "Đầm",
  "set-cong-so": "Set",
  "ao-khoac-len": "Áo",
};
const kindOf = (slug: string) =>
  slug === "quan-tay" || slug === "chan-vay"
    ? "bottom"
    : slug === "dam-cong-so"
      ? "dress"
      : slug === "set-cong-so"
        ? "set"
        : slug === "ao-khoac-len"
          ? "knit"
          : "top";
export async function enrichCatalog(db: PrismaClient, refreshOutfits = false) {
  let next =
    Math.max(
      100,
      ...(
        await db.product.findMany({
          where: { sku: { startsWith: "HN" } },
          select: { sku: true },
        })
      ).map((p) => (/^HN\d+$/.test(p.sku) ? Number(p.sku.slice(2)) : 0)),
    ) + 1;
  // Seed the original 180 first so fresh databases preserve the upgraded SKU mapping.
  for (const catalogPass of [0, 1]) {
    for (const [slug, fullList] of Object.entries(designs)) {
      const originalCount = fullList.length - expandedDesigns[slug].length;
      const list = catalogPass === 0 ? fullList.slice(0, originalCount) : fullList;
      const category = await db.category.findUniqueOrThrow({ where: { slug } });
      const kind = kindOf(slug);
      const chart = sampleChart(kind);
      await db.sizeChart.upsert({
        where: { categoryId: category.id },
        update: {},
        create: {
          categoryId: category.id,
          kind,
          notes: chart.notes,
          rowsJson: JSON.stringify(chart.rows),
          matrixJson: JSON.stringify(chart.matrix),
        },
      });
      const existing = await db.product.findMany({
        where: {
          categoryId: category.id,
          sku: { startsWith: "HN" },
          OR: [
            { enrichmentVersion: { gte: 1 } },
            {
              sku: {
                in: Array.from(
                  { length: 100 },
                  (_, i) => `HN${String(i + 1).padStart(3, "0")}`,
                ),
              },
            },
          ],
        },
        orderBy: { sku: "asc" },
      });
      for (const [i, design] of list.entries()) {
        if (catalogPass === 1 && i < originalCount) continue;
        const old = existing[i];
        const sku = old?.sku ?? `HN${String(next++).padStart(3, "0")}`;
        const title = `${prefixes[slug]} ${design}`;
        const count = 2 + (i % 4);
        // Weighted primary colors; variants expand cool and accent options without tinting the site.
        const primary = [
          8, 6, 9, 7, 0, 4, 2, 5, 13, 15, 14, 10, 11, 12, 8, 6, 9, 0, 3, 16,
        ][i % 20];
        const palette = [
          primary,
          ...Array.from({ length: 16 }, (_, n) => (primary + 3 + n * 7) % 17),
        ]
          .filter((n, k, a) => a.indexOf(n) === k)
          .slice(0, count);
        const material = /cotton/.test(design)
          ? "Cotton"
          : /tweed/.test(design)
            ? "Tweed"
            : /linen/.test(design)
              ? "Linen"
              : /satin/.test(design)
                ? "Satin"
                : /chiffon/.test(design)
                  ? "Chiffon"
                  : slug === "ao-khoac-len"
                    ? "Vải dệt kim"
                    : kind === "bottom"
                      ? "Viscose"
                      : "Polyester Blend";
        const fitClass = /chiết eo|slim|bút chì/.test(design)
          ? "slim"
          : /oversized/.test(design)
            ? "oversized"
            : /suông|rộng/.test(design)
              ? "relaxed"
              : "regular";
        const sleeve = /sát nách|gile/.test(design)
          ? "Không tay"
          : /tay lỡ/.test(design)
            ? "Tay lỡ"
            : /ngắn|cánh tiên/.test(design)
              ? "Tay ngắn"
              : "Tay dài";
        const included =
          slug === "set-cong-so"
            ? `Bộ gồm ${design.replace(/^blazer gile và quần (.*)/, "1 blazer, 1 gile và 1 quần $1")}. Các phụ kiện không đi kèm.`
            : "";
        const description = `${title} nổi bật với ${/ly|nếp/.test(design) ? "những nếp gấp tạo nhịp chuyển động" : "đường nét gọn gàng và cách xử lý phom nhẹ nhàng"}. Chất liệu ${material.toLowerCase()} cùng dáng ${fitClass === "slim" ? "ôm nhẹ" : fitClass === "oversized" ? "rộng" : fitClass === "relaxed" ? "suông thoải mái" : "vừa vặn"} phù hợp ${i % 2 ? "những buổi gặp gỡ và lịch làm việc cần sự chỉn chu" : "ngày làm việc thường nhật, dễ kết hợp với các tông màu dịu"}.`;
        const details = `${included}\nChất liệu chính: ${material}. ${/chiffon/.test(design) ? "Hai lớp vải, lớp trong đồng màu." : "Không bố trí lớp lót riêng trong cấu hình mẫu."}\nBề mặt: ${/tweed/.test(design) ? "dệt nổi" : slug === "ao-khoac-len" ? "dệt kim" : /satin/.test(design) ? "bóng nhẹ" : "dệt mịn"}.\nThiết kế: ${design}. ${kind === "bottom" ? "Cạp cố định, khóa kéo bên hông; gấu hoàn thiện gập trong." : `Tay: ${sleeve.toLowerCase()}; ${/nẹp giấu/.test(design) ? "nẹp nút giấu" : "khuy cài đồng màu"}; gấu gập trong.`}\nPhom ${fitClass === "slim" ? "ôm nhẹ, nên đối chiếu số đo phần rộng nhất" : fitClass === "oversized" ? "rộng, không cần tự động tăng size" : "thoải mái vừa phải"}. Không có thông tin độ co giãn đã xác nhận.`;
        const data = {
          name: title,
          description,
          details,
          care:
            slug === "ao-khoac-len"
              ? "Giặt tay nhẹ bằng nước mát, không vặn xoắn; đặt phẳng khi phơi. Đối chiếu nhãn chăm sóc trước khi giặt."
              : material === "Tweed"
                ? "Ưu tiên làm sạch nhẹ từng vùng, tránh ngâm lâu và chà xát bề mặt. Đối chiếu nhãn chăm sóc trước khi giặt."
                : "Giặt nhẹ bằng nước mát, phân loại theo màu; tránh chất tẩy mạnh, phơi nơi thoáng mát và ủi nhiệt thấp theo nhãn chăm sóc.",
          styling:
            "Khám phá các kết hợp cùng sản phẩm được liên kết bên dưới; từng thiết kế được bán riêng.",
          material,
          fitClass,
          fit:
            fitClass === "slim"
              ? "Slim Fit"
              : fitClass === "relaxed" || fitClass === "oversized"
                ? "Relaxed Fit"
                : "Regular Fit",
          sleeveType: kind === "bottom" ? "Không áp dụng" : sleeve,
          length: /midi/.test(design)
            ? "Midi"
            : /cropped|ngắn|lửng/.test(design)
              ? "Dáng ngắn"
              : "Theo phom thiết kế",
          styleTags:
            design + (/blazer gile/.test(design) ? " · bộ ba món" : ""),
          searchText: normalize(`${title} ${sku} ${material} ${category.name}`),
          enrichmentVersion: 0,
        };
        const children = await db.category.findMany({
          where: { parentId: category.id },
        });
        const words = normalize(title).split(/\s+/);
        const matchingChild = children
          .map((c) => ({
            c,
            score: normalize(c.name)
              .split(/\s+/)
              .filter((w) => w.length > 2 && words.includes(w)).length,
          }))
          .sort((a, b) => b.score - a.score)[0]?.c;
        const p =
          old ??
          (await db.product.create({
            data: {
              ...data,
              slug: normalize(title).replace(/[^a-z0-9]+/g, "-"),
              sku,
              categoryId: category.id,
              subcategoryId: matchingChild?.id,
              publicationStatus: "PENDING_ASSETS",
              style: "Thanh lịch",
              occasion: "Daily Office",
              price:
                kind === "set"
                  ? 1690000
                  : kind === "dress"
                    ? 1090000
                    : slug === "ao-vest-blazer"
                      ? 1290000
                      : 590000 + (i % 4) * 50000,
              isNew: i < 5,
              featured: i < 3,
            },
          }));
        const initialized = old ? old.enrichmentVersion > 0 : false;
        if (!initialized)
          await db.product.update({ where: { id: p.id }, data });
        if (initialized) continue;
        const oldVariants = await db.productVariant.findMany({
          where: { productId: p.id },
          orderBy: { sku: "asc" },
        });
        const oldNames = [...new Set(oldVariants.map((v) => v.color))];
        // Retain every existing variant id/SKU and stock; rename through collision-free temporary names.
        for (const [ci, name] of oldNames.entries())
          await db.productVariant.updateMany({
            where: { productId: p.id, color: name },
            data: { color: `__migration_${ci}` },
          });
        for (const [ci, n] of palette.entries()) {
          const [name, hex] = fashionColors[n];
          const c = await db.productColor.upsert({
            where: { productId_name: { productId: p.id, name } },
            update: {},
            create: { productId: p.id, name, hex, position: ci },
          });
          if (ci < oldNames.length)
            await db.productVariant.updateMany({
              where: { productId: p.id, color: `__migration_${ci}` },
              data: { color: name, colorHex: hex, colorId: c.id },
            });
          for (const [si, size] of ["XS", "S", "M", "L", "XL", "XXL"].entries())
            await db.productVariant.upsert({
              where: {
                productId_size_color: { productId: p.id, size, color: name },
              },
              update: {},
              create: {
                productId: p.id,
                colorId: c.id,
                sku: `${sku}-C${ci}-${size}`,
                size,
                color: name,
                colorHex: hex,
                stock: 8 + ((i + si) % 12),
                stockOrigin: "SAMPLE",
              },
            });
        }
        // Legacy catalogs originally have two colors. Refuse to drop unexpected extra inventory.
        await db.product.update({
          where: { id: p.id },
          data: { enrichmentVersion: 1 },
        });
        if (oldNames.length > palette.length)
          throw new Error(
            `Review legacy colors for ${sku}; no inventory was removed.`,
          );
      }
    }
  }
  const products = await db.product.findMany({
    where: { enrichmentVersion: 1, active: true },
    include: { category: true, colors: { include: { variants: true } } },
  });
  const neutral = [8, 9, 6, 7, 13, 14, 15];
  for (const p of products)
    for (const c of p.colors) {
      const previous = await db.outfitCombination.findMany({
        where: { colorId: c.id },
        include: { items: true },
      });
      if (previous.length && !refreshOutfits) continue;
      const kind = kindOf(p.category.slug);
      const targets =
        kind === "bottom"
          ? ["ao-so-mi", "ao-kieu", "ao-vest-blazer"]
          : kind === "set"
            ? /blazer/.test(p.name) && !/quần|váy/.test(p.name)
              ? ["quan-tay", "chan-vay", "quan-tay"]
              : /blazer|gile/.test(p.name)
                ? ["ao-so-mi", "ao-kieu", "ao-kieu"]
                : ["ao-vest-blazer", "ao-khoac-len", "ao-vest-blazer"]
            : kind === "dress"
              ? ["ao-vest-blazer", "ao-khoac-len", "ao-khoac-len"]
              : [
                  "quan-tay",
                  "chan-vay",
                  p.category.slug === "ao-vest-blazer" || kind === "knit"
                    ? "ao-so-mi"
                    : "ao-vest-blazer",
                ];
      const ci = fashionColors.findIndex((a) => a[0] === c.name);
      const preferred =
        ci === 10 || ci === 11 || ci === 12
          ? [13, 8, 9]
          : ci === 8 || ci === 9
            ? [15, 3, 14]
            : neutral;
      for (const [i, target] of targets.entries()) {
        const priority = [...preferred.slice(i), ...preferred.slice(0, i)];
        const candidate = products
          .filter((a) => a.category.slug === target && a.id !== p.id)
          .flatMap((a) =>
            a.colors
              .filter(
                (color) =>
                  color.variants.some((v) => v.stock > 0) &&
                  preferred.some((n) => fashionColors[n][0] === color.name),
              )
              .map((color) => ({ product: a, color })),
          )
          .sort(
            (a, b) =>
              priority.findIndex((n) => fashionColors[n][0] === a.color.name) -
              priority.findIndex((n) => fashionColors[n][0] === b.color.name),
          )[i];
        if (!candidate) continue;
        const prior = previous.find(
          (o) =>
            o.position === i &&
            [
              "Thanh lịch đầu tuần",
              "Nhẹ nhàng nơi công sở",
              "Chỉn chu cho cuộc hẹn",
            ].includes(o.title),
        );
        if (prior) {
          if (prior.items.length === 1)
            await db.outfitItem.update({
              where: { id: prior.items[0].id },
              data: {
                productId: candidate.product.id,
                colorId: candidate.color.id,
              },
            });
          continue;
        }
        await db.outfitCombination.create({
          data: {
            colorId: c.id,
            title: [
              "Thanh lịch đầu tuần",
              "Nhẹ nhàng nơi công sở",
              "Chỉn chu cho cuộc hẹn",
            ][i],
            position: i,
            items: {
              create: {
                productId: candidate.product.id,
                colorId: candidate.color.id,
              },
            },
          },
        });
      }
    }
  console.log(
    `Catalog enrichment: ${products.length} sample designs; existing IDs, stock and historical snapshots retained.`,
  );
}
if (process.argv[1]?.endsWith("enrich-catalog.ts")) {
  const db = new PrismaClient();
  enrichCatalog(db, process.argv.includes("--refresh-outfits"))
    .finally(() => db.$disconnect());
}
