import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
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
const esc = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
export function drawing(
  slug: string,
  title: string,
  color: string,
  i: number,
  view: string,
) {
  const outline = "#746f68",
    stroke = `stroke="${outline}" stroke-width="2" stroke-linejoin="round"`;
  const pencil = /bút chì|slim/.test(title),
    wide = /rộng|culottes/.test(title),
    short = /cropped|dáng ngắn/.test(title),
    pleat = /ly|nếp/.test(title),
    bow = /nơ/.test(title),
    vneck = /cổ V|cổ tim|cổ đổ/.test(title),
    sleeveless = /sát nách|gile/.test(title),
    puff = /phồng|bồng/.test(title);
  let shape = "";
  const y = short ? 380 : 450,
    neck = vneck ? 260 : 205;
  function top(x = 0, scale = 1, blazer = false) {
    const shortSleeve = /tay ngắn|cánh tiên|tulip/.test(title),
      halfSleeve = /tay lỡ/.test(title);
    const left = sleeveless
      ? "174 270 188 230"
      : puff
        ? "97 280 138 332 178 266"
        : shortSleeve
          ? "112 280 157 300 182 245"
          : halfSleeve
            ? "106 337 153 352 182 267"
            : "99 401 149 415 182 267";
    const right = sleeveless
      ? "324 230 338 270"
      : puff
        ? "374 332 415 280"
        : shortSleeve
          ? "330 245 355 300 400 280"
          : halfSleeve
            ? "359 352 406 337"
            : "363 415 413 401";
    const collar = /cổ vuông/.test(title)
      ? "M221 176V232H291V176"
      : /cổ thuyền/.test(title)
        ? "M209 180Q256 208 303 180"
        : /cổ trụ|cổ tàu|cổ lọ/.test(title)
          ? "M228 178V163H284V178M228 178Q256 198 284 178"
          : /cổ đức|cổ nhọn|polo/.test(title)
            ? "M221 176L256 211 238 235 214 190M291 176L256 211 274 235 298 190"
            : `M221 176Q256 ${neck + 30} 291 176`;
    const hem = /peplum/.test(title)
      ? `176 325 158 ${y}H354L336 325 330 267`
      : /chiết eo/.test(title)
        ? `191 326 176 ${y}H336L321 326 330 267`
        : /vạt lệch|vạt chéo/.test(title)
          ? `176 ${y}L336 ${y - 28} 330 267`
          : `176 ${y}H336L330 267`;

    return `<g transform="translate(${x} 0) scale(${scale})"><path d="M188 168L${puff ? 115 : 137} 195 ${left} ${hem} ${right} 375 195 324 168 291 190H221Z" fill="${color}" ${stroke}/><path d="${collar}${/khuy sau/.test(title) ? "" : `M256 ${neck}V${y}`}" fill="none" ${stroke}/>${blazer ? `<path d="M221 178L208 259 250 312 232 349M291 178L304 259 262 312 280 349M195 369H237M275 369H317" fill="none" ${stroke}/>` : ""}${bow ? `<path d="M256 219Q198 178 216 239L256 225 295 239Q314 178 256 219L237 291M256 225L277 291" fill="${color}" ${stroke}/>` : ""}${/khuy sau|nẹp giấu/.test(title) ? "" : Array.from({ length: blazer ? (/hai/.test(title) ? 2 : 1) : 4 }, (_, b) => `<circle cx="${/hai hàng/.test(title) ? 238 : 256}" cy="${blazer ? 330 + b * 40 : 275 + b * 36}" r="3" fill="${outline}"/>${/hai hàng/.test(title) ? `<circle cx="274" cy="${330 + b * 40}" r="3" fill="${outline}"/>` : ""}`).join("")}${pleat ? '<path d="M204 235V402M219 235V402M293 235V402M308 235V402" fill="none" stroke="#746f68" opacity=".4"/>' : ""}${/túi/.test(title) ? '<path d="M285 270H318V315H285Z" fill="none" stroke="#746f68"/>' : ""}</g>`;
  }
  function trousers() {
    return `<path d="M179 150H333L347 270 ${wide ? "363 548H269L256 315 243 548H149" : pencil ? "319 548H268L256 315 244 548H193" : "339 548H270L256 315 242 548H173"}L165 270Z" fill="${color}" ${stroke}/><path d="M179 176H333M256 176V315M193 190L179 246M319 190L333 246" fill="none" ${stroke}/>${pleat ? '<path d="M213 190L204 529M299 190L308 529" fill="none" stroke="#746f68" opacity=".5"/>' : ""}`;
  }
  function skirt() {
    return `<path d="M184 165H328L${pencil ? 342 : 382} 529H${pencil ? 170 : 130}Z" fill="${color}" ${stroke}/><path d="M184 191H328" ${stroke}/>${pleat ? Array.from({ length: 9 }, (_, n) => `<path d="M${190 + n * 16} 195L${146 + n * 28} 517" stroke="#746f68" opacity=".4"/>`).join("") : ""}${/xẻ/.test(title) ? '<path d="M289 529L281 437" stroke="#746f68"/>' : ""}${/vạt chéo/.test(title) ? '<path d="M211 190L343 529" stroke="#746f68"/>' : ""}`;
  }
  if (slug === "quan-tay") shape = trousers();
  else if (slug === "chan-vay") shape = skirt();
  else if (slug === "dam-cong-so")
    shape = `<path d="M212 130L170 156 141 253 184 270 204 215 211 303 ${pencil ? "178" : "133"} 547H${pencil ? "334" : "379"}L301 303 308 215 328 270 371 253 342 156 300 130 279 155H233Z" fill="${color}" ${stroke}/><path d="M233 149Q256 ${vneck ? 233 : 196} 279 149M211 303H301" fill="none" ${stroke}/>${pleat ? Array.from({ length: 7 }, (_, n) => `<path d="M${219 + n * 12} 310L${156 + n * 33} 532" stroke="#746f68" opacity=".4"/>`).join("") : ""}${/đai/.test(title) ? '<path d="M211 304H301L277 323H236Z" fill="none" stroke="#746f68"/>' : ""}`;
  else if (slug === "set-cong-so")
    shape = `<g transform="translate(-28 30) scale(.66)">${top(0, 1, /blazer/.test(title))}</g><g transform="translate(196 172) scale(.64)">${/váy/.test(title) ? skirt() : /quần/.test(title) ? trousers() : top(0, 1, true)}</g>${/gile và quần/.test(title) && /blazer/.test(title) ? `<g transform="translate(138 5) scale(.36)">${top()}</g>` : ""}`;
  else shape = top(0, 1, slug === "ao-vest-blazer");
  const striped = /sọc|kẻ/.test(title),
    tweed = /tweed/.test(title),
    knit = slug === "ao-khoac-len";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view === "detail" ? "170 150 170 210" : "0 0 512 683"}"><defs><pattern id="texture" width="${striped ? 14 : 8}" height="8" patternUnits="userSpaceOnUse"><path d="${striped ? "M3 0V8" : tweed ? "M0 0L8 8M0 8L8 0" : knit ? "M2 0L6 4 2 8" : "M1 1H2"}" stroke="${outline}" opacity=".16" fill="none"/></pattern><filter id="t"><feFlood flood-color="${outline}" flood-opacity=".04"/><feComposite in2="SourceGraphic" operator="in"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode/></feMerge></filter></defs><rect width="512" height="683" fill="#f5f3ef"/><g${view === "back" ? ' transform="translate(512 0) scale(-1 1)"' : ""} filter="url(#t)">${shape}${shape.replaceAll(`fill="${color}"`, 'fill="url(#texture)"')}</g><text visibility="hidden" x="256" y="620" text-anchor="middle" font-family="Arial" font-size="12" fill="#716c64">${esc(title)}</text><text visibility="hidden" x="256" y="644" text-anchor="middle" font-family="Arial" font-size="11" fill="#716c64">${view === "back" ? "GÓC ĐỐI DIỆN" : view === "detail" ? "CHI TIẾT" : "HÌNH MINH HỌA TRANG PHỤC"}</text></svg>`;
}
export async function enrichCatalog(db: PrismaClient, refreshOutfits = false) {
  await mkdir("public/images", { recursive: true });
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
  // Seed the original 180 first so fresh test databases preserve the same SKU/asset mapping as upgraded stores.
  for (const phase of [0, 1]) {
    for (const [slug, fullList] of Object.entries(designs)) {
      const originalCount = fullList.length - expandedDesigns[slug].length;
      const list = phase === 0 ? fullList.slice(0, originalCount) : fullList;
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
        if (phase === 1 && i < originalCount) continue;
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
          const images = [];
          for (const [position, view] of [
            "front",
            "back",
            "detail",
          ].entries()) {
            const url = `/images/${sku.toLowerCase()}-${ci}-${view}.svg`;
            await writeFile(`public${url}`, drawing(slug, title, hex, i, view));
            images.push({
              url,
              alt: `${title} — ${name}, ${view === "front" ? "mặt trước" : view === "back" ? "góc đối diện" : "chi tiết minh họa"}`,
              position,
            });
          }
          await db.colorImage.createMany({
            data: images.map((img) => ({ ...img, colorId: c.id })),
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
          if (ci === 0) {
            const current = await db.productImage.findMany({
              where: { productId: p.id },
              orderBy: { position: "asc" },
            });
            for (const [position, img] of images.entries())
              if (current[position])
                await db.productImage.update({
                  where: { id: current[position].id },
                  data: img,
                });
              else
                await db.productImage.create({
                  data: { ...img, productId: p.id },
                });
          }
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
  (process.argv.includes("--assets-only")
    ? rebuildSampleAssets(db)
    : enrichCatalog(db, process.argv.includes("--refresh-outfits"))
  ).finally(() => db.$disconnect());
}

export async function rebuildSampleAssets(db: PrismaClient) {
  const products = await db.product.findMany({
    where: { enrichmentVersion: { gte: 1 } },
    include: { category: true, colors: { include: { images: true } } },
  });
  for (const p of products)
    for (const c of p.colors)
      for (const image of c.images) {
        if (!/^\/images\/hn\d+-\d+-(front|back|detail)\.svg$/.test(image.url))
          continue;
        const view = image.url.split("-").at(-1)!.replace(".svg", "");
        await writeFile(
          "public" + image.url,
          drawing(p.category.slug, p.name, c.hex, 0, view),
        );
      }
  console.log("Rebuilt sample SVG assets; database and inventory untouched.");
}
