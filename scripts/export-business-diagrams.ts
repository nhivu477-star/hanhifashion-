import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import sharp from "sharp";
const root = "docs/diagrams/";
type Column = [number, string, string, number, unknown, number];
type ForeignKey = [number, number, string, string, string, string, string, string];
type Table = {
  columns: Column[];
  fks: ForeignKey[];
  uniqueKeys: string[][];
};
// Compile the checked-in datamodel, never open the owner's database. SQLite
// introspection below runs against an in-memory schema with no business rows.
const require = createRequire(import.meta.url);
const ddl = execFileSync(
  process.execPath,
  [
    join(dirname(require.resolve("prisma/package.json")), "build/index.js"),
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datamodel",
    "prisma/schema.prisma",
    "--script",
  ],
  {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: "file:diagram-generation-only.db" },
    maxBuffer: 8 * 1024 * 1024,
  },
);
const schema: Record<string, Table> = JSON.parse(
  execFileSync(
    "python3",
    [
      "-c",
      `import sqlite3,json,sys
c=sqlite3.connect(':memory:')
c.executescript(sys.stdin.read())
def quoted(name):
    return '"' + name.replace('"','""') + '"'
tables=[r[0] for r in c.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' and name!='_prisma_migrations' order by name")]
schema={}
for table in tables:
    columns=[list(r) for r in c.execute('pragma table_info('+quoted(table)+')')]
    unique_keys=[[r[2] for r in c.execute('pragma index_info('+quoted(i[1])+')')] for i in c.execute('pragma index_list('+quoted(table)+')').fetchall() if i[2] and not i[4]]
    primary=[r[1] for r in sorted(columns,key=lambda r:r[5]) if r[5]]
    if primary and primary not in unique_keys:
        unique_keys.append(primary)
    schema[table]={'columns':columns,'fks':[list(r) for r in c.execute('pragma foreign_key_list('+quoted(table)+')')],'uniqueKeys':unique_keys}
print(json.dumps(schema))`,
    ],
    { encoding: "utf8", input: ddl, maxBuffer: 8 * 1024 * 1024 },
  ),
);
const groups = [
  { title: "Tài khoản & địa chỉ", tables: ["User", "Account", "Session", "PasswordReset", "Address", "ShopperPreference"] },
  { title: "Danh mục & sản phẩm", tables: ["Category", "Product", "ProductVariant", "ProductColor", "Collection", "CollectionProduct", "SizeChart"] },
  { title: "Hình ảnh & phối đồ", tables: ["MediaAsset", "ProductImage", "ColorImage", "OutfitCombination", "OutfitItem"] },
  { title: "Giỏ hàng & ưu đãi", tables: ["Cart", "CartItem", "Wishlist", "WishlistItem", "Coupon", "CouponRedemption"] },
  { title: "Đơn hàng & thanh toán", tables: ["Order", "OrderItem", "Payment", "OrderStatusHistory"] },
  { title: "Giao nhận & đối soát COD", tables: ["Shipment", "ShipmentEvent", "DeliveryAttempt", "CODCollection", "CODRemittance", "CODReconciliation"] },
  { title: "Đổi trả & hoàn tiền", tables: ["ReturnRequest", "ReturnItem", "ReturnInspection", "ExchangeItem", "ReturnEvidence", "ReturnHistory", "MockRefund"] },
  { title: "Kho & giá vốn", tables: ["InventoryMovement", "ProductCostHistory", "Stocktake", "StocktakeLine"] },
  { title: "Chăm sóc & nội dung", tables: ["Inquiry", "InquiryReply", "ProductReview", "ReviewReply", "Newsletter", "Banner"] },
  { title: "Hành vi & phân tích", tables: ["VisitorSession", "AnalyticsEvent", "OrderAttribution", "CartAnalyticsCycle", "OrderLineAnalytics"] },
  { title: "Quản trị & nguồn dữ liệu", tables: ["AuditLog", "StoreSetting", "SyntheticBatch", "SyntheticRecord"] },
].map((group) => ({ ...group, tables: group.tables.filter((table) => schema[table]) }));
const assigned = new Set(groups.flatMap((group) => group.tables));
const unassigned = Object.keys(schema).filter((table) => !assigned.has(table));
if (unassigned.length) groups.push({ title: "Bảng khác", tables: unassigned });
const panels = groups.filter((group) => group.tables.length);
const panelOf = new Map(
  panels.flatMap((group, i) => group.tables.map((table) => [table, String(i + 1).padStart(2, "0")] as const)),
);
const foreignKeys = (table: Table) => {
  const keys = new Map<number, ForeignKey[]>();
  for (const fk of table.fks) {
    const members = keys.get(fk[0]) ?? [];
    members.push(fk);
    keys.set(fk[0], members);
  }
  return [...keys.values()].map((members) => members.sort((a, b) => a[1] - b[1]));
};
const cardinality = (table: Table, key: ForeignKey[]) => {
  const columns = key.map((fk) => fk[3]);
  const required = columns.every((name) => table.columns.some((column) => column[1] === name && column[3]));
  const unique = table.uniqueKeys.some((members) => members.every((name) => columns.includes(name)));
  return { parent: required ? "1" : "0..1", child: unique ? "0..1" : "0..N" };
};
const flags = (table: Table, column: Column) => [
  ...(column[5] ? ["PK"] : []),
  ...(table.fks.some((fk) => fk[3] === column[1]) ? ["FK"] : []),
  ...(table.uniqueKeys.some((key) => key.length === 1 && key[0] === column[1]) && !column[5] ? ["UK"] : []),
];
const mermaidType = (type: string) => {
  const name = type.toUpperCase();
  if (name.includes("INT")) return "int";
  if (name.includes("BOOL")) return "boolean";
  if (name.includes("DATE") || name.includes("TIME")) return "datetime";
  if (/REAL|FLOA|DOUB/.test(name)) return "float";
  if (/DEC|NUM/.test(name)) return "decimal";
  if (name.includes("BLOB")) return "blob";
  return "string";
};
let er = "erDiagram\n";
for (const [i, group] of panels.entries()) {
  er += `  %% ${String(i + 1).padStart(2, "0")} — ${group.title}\n`;
  for (const name of group.tables) {
    const table = schema[name];
    er += `  ${name} {\n`;
    for (const column of table.columns) {
      const keys = flags(table, column);
      er += `    ${mermaidType(column[2])} ${column[1]}${keys.length ? " " + keys.join(", ") : ""} "${column[2]}${column[3] ? "; NOT NULL" : "; nullable"}"\n`;
    }
    er += "  }\n";
    for (const key of table.uniqueKeys.filter((members) => members.length > 1)) {
      er += `  %% ${name} UNIQUE (${key.join(", ")})\n`;
    }
    for (const key of foreignKeys(table)) {
      const counts = cardinality(table, key);
      er += `  ${key[0][2]} ${counts.parent === "1" ? "||" : "|o"}..${counts.child === "0..1" ? "o|" : "o{"} ${name} : "${key.map((fk) => fk[3]).join(", ")} → ${key.map((fk) => fk[4]).join(", ")}"\n`;
    }
  }
}
writeFileSync(root + "sql-relationships.mmd", er);
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
// Key-focused atlas: every table and every declared key is visible. Local FK
// references replace crossing edges; the Mermaid file retains every column.
const cardWidth = 488;
const panelWidth = 1032;
const gap = 24;
const margin = 32;
const canvasWidth = margin * 2 + panelWidth * 3 + gap * 2;
const lineHeight = 21;
const wrap = (value: string, width = 52) => {
  const lines: string[] = [];
  let rest = value;
  while (rest.length > width) {
    const space = rest.lastIndexOf(" ", width);
    const end = space > width / 2 ? space : width;
    lines.push(rest.slice(0, end));
    rest = rest.slice(end).trimStart();
  }
  if (rest) lines.push(rest);
  return lines;
};
type CardLine = { text: string; kind: "key" | "reference" | "note" };
const cardLines = (table: Table): CardLine[] => {
  const lines: CardLine[] = [];
  const add = (text: string, kind: CardLine["kind"]) =>
    lines.push(...wrap(text).map((part) => ({ text: part, kind })));
  for (const column of table.columns) {
    const keys = flags(table, column);
    if (keys.length) add(`${keys.join("/")} ${column[1]}${column[3] ? "" : " ?"} · ${column[2]}`, "key");
  }
  for (const key of table.uniqueKeys.filter((members) => members.length > 1)) {
    add(`UNIQUE (${key.join(", ")})`, "key");
  }
  for (const key of foreignKeys(table)) {
    const counts = cardinality(table, key);
    add(`FK ${key.map((fk) => fk[3]).join(", ")} →`, "reference");
    add(`  [${panelOf.get(key[0][2])}] ${key[0][2]}.${key.map((fk) => fk[4]).join(", ")}`, "reference");
    add(`  cha ${counts.parent} · con ${counts.child}`, "note");
  }
  if (!table.fks.length) add("Không có FK khai báo trong Prisma schema", "note");
  add(`${table.columns.length} cột · ${foreignKeys(table).length} FK`, "note");
  return lines;
};
const text = (x: number, y: number, value: string, size: number, attrs = "") =>
  `<text x="${x}" y="${y}" font-size="${size}" ${attrs}>${esc(value)}</text>`;
const columnBottoms = [250, 250, 250];
let atlas = "";
for (const [index, group] of panels.entries()) {
  const column = columnBottoms.indexOf(Math.min(...columnBottoms));
  const x = margin + column * (panelWidth + gap);
  const y = columnBottoms[column];
  const cardBottoms = [y + 72, y + 72];
  let cards = "";
  for (const name of group.tables) {
    const table = schema[name];
    const lines = cardLines(table);
    const slot = cardBottoms.indexOf(Math.min(...cardBottoms));
    const cx = x + 20 + slot * (cardWidth + 16);
    const cy = cardBottoms[slot];
    const height = 62 + lines.length * lineHeight;
    cards += `<g data-table="${esc(name)}"><rect x="${cx}" y="${cy}" width="${cardWidth}" height="${height}" rx="8" fill="white" stroke="#bacbd4"/><path d="M ${cx + 1} ${cy + 42} H ${cx + cardWidth - 1}" stroke="#dce5eb"/>`;
    cards += text(cx + 14, cy + 28, name, 20, 'font-weight="700"');
    lines.forEach((line, i) => {
      const color = line.kind === "reference" ? "#145d82" : line.kind === "note" ? "#586b79" : "#213847";
      cards += text(cx + 14, cy + 65 + i * lineHeight, line.text, 14, `font-family="monospace" fill="${color}" xml:space="preserve"`);
    });
    cards += "</g>";
    cardBottoms[slot] = cy + height + 16;
  }
  const height = Math.max(...cardBottoms) - y + 4;
  atlas += `<g data-panel="${index + 1}"><rect x="${x}" y="${y}" width="${panelWidth}" height="${height}" rx="12" fill="#edf3f6" stroke="#bdced8"/>`;
  atlas += text(x + 20, y + 34, `${String(index + 1).padStart(2, "0")}  ${group.title}`, 24, 'font-weight="700"');
  atlas += text(x + panelWidth - 20, y + 34, `${group.tables.length} bảng`, 16, 'text-anchor="end" fill="#586b79"');
  atlas += cards + "</g>";
  columnBottoms[column] = y + height + gap;
}
const canvasHeight = Math.max(...columnBottoms) + 36;
const tableCount = Object.keys(schema).length;
const fkCount = Object.values(schema).reduce((count, table) => count + foreignKeys(table).length, 0);
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" role="img" aria-labelledby="sql-title sql-description"><title id="sql-title">HÀ NHI FASHION — bản đồ khóa SQL</title><desc id="sql-description">${tableCount} bảng và ${fkCount} khóa ngoại từ prisma/schema.prisma, chia thành ${panels.length} nhóm nghiệp vụ. Tất cả PK, FK và khóa duy nhất đều được hiển thị; toàn bộ cột có trong Mermaid. Không đọc database, không gồm trigger chỉ có trong migration.</desc><rect width="100%" height="100%" fill="#fafbf9"/><g font-family="Arial,sans-serif" fill="#213847">`;
svg += text(margin, 53, "HÀ NHI FASHION — BẢN ĐỒ KHÓA SQL", 34, 'font-weight="700"');
svg += text(margin, 90, `Nguồn: prisma/schema.prisma · ${tableCount} bảng · ${fkCount} FK · ${panels.length} nhóm nghiệp vụ · không cần database`, 21);
svg += text(margin, 127, "PK = khóa chính · FK = khóa ngoại · UK = duy nhất một cột · UNIQUE (…) = khóa duy nhất ghép · ? = cho phép NULL", 19);
svg += text(margin, 160, "Mỗi FK ghi bảng.cột đích và [số nhóm]; cha = số bản ghi đích mỗi con, con = số bản ghi con mỗi cha (theo ràng buộc SQLite).", 19);
svg += text(margin, 193, "Không suy diễn FK từ tên cột. Không nối chéo panel. Mermaid kèm theo chứa toàn bộ cột, khóa và quan hệ; phóng to SVG/PNG để đọc.", 19);
svg += atlas;
svg += text(margin, canvasHeight - 20, "Các panel là nhóm nghiệp vụ, không phải schema tách biệt. Quan hệ tự tham chiếu và khóa ghép được giữ nguyên.", 17, 'fill="#586b79"');
svg += "</g></svg>";
writeFileSync(root + "sql-relationships.svg", svg);
await sharp(Buffer.from(svg)).png().toFile(root + "sql-relationships.png");
const rows = [
  [
    "Đăng nhập & phân quyền",
    "Đăng nhập / quản lý tài khoản",
    "auth + RBAC / service guards",
    "User · Session · AuditLog",
  ],
  [
    "Danh mục & lựa chọn hàng",
    "Storefront / sản phẩm / giỏ",
    "catalog + pricing + cart",
    "Product · ProductVariant · Cart",
  ],
  [
    "Đặt & xử lý đơn",
    "Checkout / Admin đơn hàng",
    "order lifecycle / atomic stock decrement",
    "Order · OrderItem · InventoryMovement",
  ],
  [
    "Giao nhận & thu COD",
    "Vận chuyển / theo dõi đơn",
    "shipping + COD / đối soát",
    "Shipment · Payment · CODCollection",
  ],
  [
    "Đối soát khoản thu",
    "Sổ thu & chuyển về",
    "recordCOD / reconcileCOD",
    "CODRemittance · CODReconciliation",
  ],
  [
    "Đổi trả lỗi trong 72 giờ",
    "Yêu cầu / kiểm hàng / hoàn",
    "returns / refundLimit / restock",
    "ReturnRequest · ReturnItem · MockRefund",
  ],
  [
    "Nhập & xuất kho",
    "SKU / số lượng / nhà cung cấp",
    "moveStock / CAS / idempotency",
    "ProductVariant · InventoryMovement",
  ],
  [
    "Phân tích & dữ liệu tổng hợp",
    "KPI / biểu đồ / bộ lọc",
    "analyticsReport / SQL aggregate",
    "OrderLineAnalytics · SyntheticBatch",
  ],
];
let flow = "flowchart LR\n";
let ba =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1940" height="1230"><rect width="100%" height="100%" fill="#fafaf8"/><g font-family="Arial,sans-serif" fill="#222"><text x="30" y="45" font-size="30">HÀ NHI FASHION — Nghiệp vụ → Chức năng → Backend → SQL</text>';
["NGHIỆP VỤ", "CHỨC NĂNG / GIAO DIỆN", "XỬ LÝ BACKEND", "BẢNG SQL"].forEach(
  (h, j) =>
    (ba += `<text x="${30 + j * 480}" y="95" font-size="19" font-weight="bold">${h}</text>`),
);
rows.forEach((row, i) =>
  row.forEach((label, j) => {
    const id = `n${i}_${j}`;
    flow += `  ${id}["${label}"]\n`;
    if (j) flow += `  n${i}_${j - 1} --> ${id}\n`;
    const x = 25 + j * 480,
      y = 120 + i * 130;
    ba += `<rect x="${x}" y="${y}" width="445" height="95" rx="5" fill="${j === 3 ? "#e8eff2" : "white"}" stroke="#879aa3"/><text x="${x + 14}" y="${y + 39}" font-size="18">${esc(label.split(" / ")[0])}</text><text x="${x + 14}" y="${y + 67}" font-size="16">${esc(label.split(" / ").slice(1).join(" / "))}</text>`;
    if (j < 3)
      ba += `<text x="${x + 449}" y="${y + 54}" font-size="25">→</text>`;
  }),
);
ba +=
  '<text x="30" y="1200" font-size="17">Toàn bộ thao tác chỉ local; thanh toán / giao nhận không gọi dịch vụ thật. SyntheticRecord lưu nguồn gốc nội bộ.</text></g></svg>';
writeFileSync(root + "business-processes.mmd", flow);
writeFileSync(root + "business-processes.svg", ba);
await sharp(Buffer.from(ba))
  .png()
  .toFile(root + "business-processes.png");
console.log("Exported business + SQL diagrams: Mermaid, SVG, PNG");
