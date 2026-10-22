import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import sharp from "sharp";
const root = "docs/diagrams/";
const core = [
  "User",
  "Session",
  "Product",
  "ProductVariant",
  "Order",
  "OrderItem",
  "OrderStatusHistory",
  "Payment",
  "Shipment",
  "ShipmentEvent",
  "CODCollection",
  "CODRemittance",
  "CODReconciliation",
  "ReturnRequest",
  "ReturnItem",
  "ReturnInspection",
  "MockRefund",
  "InventoryMovement",
  "AuditLog",
  "OrderLineAnalytics",
  "SyntheticBatch",
  "SyntheticRecord",
];
const schema = JSON.parse(
  execFileSync(
    "python3",
    [
      "-c",
      `import sqlite3,json
c=sqlite3.connect('prisma/dev.db')
ts=[r[0] for r in c.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' and name!='_prisma_migrations'")]
print(json.dumps({t:{'columns':[list(r) for r in c.execute('pragma table_info("'+t+'")')],'fks':[list(r) for r in c.execute('pragma foreign_key_list("'+t+'")')],'uniqueColumns':[list(c.execute('pragma index_info("'+i[1]+'")'))[0][2] for i in c.execute('pragma index_list("'+t+'")').fetchall() if i[2] and len(list(c.execute('pragma index_info("'+i[1]+'")')))==1]} for t in ts}))`,
    ],
    { encoding: "utf8" },
  ),
);
let er = "erDiagram\n";
for (const [t, v] of Object.entries(schema) as [string, any][]) {
  er += `  ${t} {\n`;
  for (const c of v.columns) {
    const fk = v.fks.some((f: any[]) => f[3] === c[1]);
    er += `    ${c[2] === "INTEGER" ? "int" : c[2] === "DATETIME" ? "datetime" : "string"} ${c[1]}${c[5] && fk ? " PK, FK" : c[5] ? " PK" : fk ? " FK" : ""}\n`;
  }
  er += "  }\n";
  for (const f of v.fks) {
    const col = v.columns.find((c: any[]) => c[1] === f[3]);
    const required = Boolean(col?.[3]);
    const one = v.uniqueColumns.includes(f[3]);
    er += `  ${f[2]} ${required ? "||" : "|o"}--${one ? "o|" : "o{"} ${t} : "${f[3]} → ${f[4]}"\n`;
  }
}
writeFileSync(root + "sql-relationships.mmd", er);
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const positions = new Map(
  core.map((t, i) => [
    t,
    { x: 35 + (i % 4) * 470, y: 120 + Math.floor(i / 4) * 300 },
  ]),
);
let svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1900" height="2000"><rect width="100%" height="100%" fill="#fafaf8"/><g font-family="Arial,sans-serif" fill="#222"><text x="35" y="48" font-size="30">HÀ NHI FASHION — SQL / PK / FK</text><text x="35" y="82" font-size="17">Các bảng nghiệp vụ chính • đường nối theo khóa ngoại thật • đầy đủ mọi bảng trong tệp Mermaid</text>';
for (const t of core) {
  const p = positions.get(t)!;
  for (const f of schema[t].fks) {
    const q = positions.get(f[2]);
    if (q)
      svg += `<path d="M ${p.x + 210} ${p.y} L ${q.x + 210} ${q.y + 245}" fill="none" stroke="#b6c6cc" stroke-width="1.4"/>`;
  }
}
for (const t of core) {
  const p = positions.get(t)!;
  const v = schema[t];
  const keys = v.columns.filter(
    (c: any[]) => c[5] || v.fks.some((f: any[]) => f[3] === c[1]),
  );
  const extras = v.columns
    .filter((c: any[]) => !keys.includes(c))
    .slice(0, Math.max(0, 7 - keys.length));
  svg += `<rect x="${p.x}" y="${p.y}" width="435" height="245" rx="5" fill="white" stroke="#637c88"/><rect x="${p.x}" y="${p.y}" width="435" height="40" fill="#e8eff2"/><text x="${p.x + 14}" y="${p.y + 27}" font-size="21" font-weight="bold">${t}</text>`;
  [...keys, ...extras].slice(0, 8).forEach((c: any[], i: number) => {
    const fk = v.fks.find((f: any[]) => f[3] === c[1]);
    svg += `<text x="${p.x + 14}" y="${p.y + 66 + i * 22}" font-size="16">${esc(`${c[5] ? "PK" : fk ? "FK" : "  "} ${c[1]}${fk ? " → " + fk[2] : ""}`)}</text>`;
  });
}
svg += "</g></svg>";
writeFileSync(root + "sql-relationships.svg", svg);
await sharp(Buffer.from(svg))
  .png()
  .toFile(root + "sql-relationships.png");
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
    "order lifecycle / atomic reserve",
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
