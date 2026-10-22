import { qualityInclude, productQuality } from "./product-quality";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { ReportFilter, conversionRate, reportFilter } from "./analytics-rules";
import { can } from "./rbac";
export type Row = Record<string, string | number | null>;
export type Report = {
  metrics: { label: string; value: number | null; unit?: string }[];
  rows: Row[];
  count: number;
  chart: Row[];
  extra: { title: string; rows: Row[] }[];
  notes: string[];
};
const normalizeRows = (rows: Record<string, unknown>[]): Row[] =>
  rows.map(
    (row) =>
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [
          k,
          typeof v === "bigint"
            ? Number(v)
            : v instanceof Date
              ? v.toISOString()
              : v,
        ]),
      ) as Row,
  );
async function query(sql: Prisma.Sql) {
  return normalizeRows(await db.$queryRaw<Record<string, unknown>[]>(sql));
}
const scope = (f: ReportFilter) =>
  Prisma.sql`o.createdAt >= ${f.from.getTime()} AND o.createdAt < ${f.to.getTime()} ${f.status ? Prisma.sql`AND o.status=${f.status}` : Prisma.empty}`;
const productScope = (f: ReportFilter) =>
  Prisma.sql`${f.category ? Prisma.sql`AND p.categoryId=${f.category}` : Prisma.empty} ${f.product ? Prisma.sql`AND p.id=${f.product}` : Prisma.empty} ${f.q ? Prisma.sql`AND (p.name LIKE ${"%" + f.q + "%"} OR p.sku LIKE ${"%" + f.q + "%"})` : Prisma.empty}`;
export function lineCte(f: ReportFilter) {
  return Prisma.sql`WITH refund AS (
 SELECT ri.orderItemId, SUM(ri.amount) amount FROM ReturnItem ri JOIN MockRefund r ON r.requestId=ri.requestId WHERE r.status='SIMULATED_COMPLETED' GROUP BY ri.orderItemId
), returned AS (
 SELECT ri.orderItemId,SUM(ri.quantity) units,SUM(CASE WHEN ri.restocked=1 THEN ri.quantity ELSE 0 END) restocked FROM ReturnItem ri WHERE ri.disposition IN ('SELLABLE','DAMAGED') GROUP BY ri.orderItemId
), lines AS (
 SELECT i.id,i.orderId,i.productId,i.variantId,i.name,i.sku,i.color,i.size,i.quantity,COALESCE(i.originalQuantity,i.quantity)-i.quantity partialCanceledUnits,COALESCE(i.originalQuantity,i.quantity) originalUnits,i.unitPrice,o.userId,o.status,o.paymentStatus,o.createdAt,p.categoryId,c.name category,p.merchandiseVerified,p.publicationStatus,p.price,p.active,
 i.unitPrice*i.quantity gross,a.netAmount beforeRefund,COALESCE(r.amount,0) refunded,COALESCE(ret.units,0) returnedUnits,COALESCE(ret.restocked,0) restockedUnits,a.unitCost,
 CASE WHEN o.status IN ('DELIVERED','COMPLETED') THEN 1 ELSE 0 END fulfilled,
 CASE WHEN o.status IN ('DELIVERED','COMPLETED') THEN COALESCE(a.netAmount,0)-COALESCE(r.amount,0) ELSE 0 END net,
 CASE WHEN o.status IN ('DELIVERED','COMPLETED') AND a.unitCost IS NOT NULL THEN a.unitCost*(i.quantity-COALESCE(ret.restocked,0)) ELSE NULL END cogs
 FROM OrderItem i JOIN "Order" o ON o.id=i.orderId JOIN Product p ON p.id=i.productId JOIN Category c ON c.id=p.categoryId
 LEFT JOIN OrderLineAnalytics a ON a.orderItemId=i.id LEFT JOIN refund r ON r.orderItemId=i.id LEFT JOIN returned ret ON ret.orderItemId=i.id
 WHERE ${scope(f)} ${productScope(f)}
), selectedOrders AS (SELECT o.* FROM "Order" o WHERE ${scope(f)} AND EXISTS(SELECT 1 FROM lines l WHERE l.orderId=o.id))`;
}
const totals = (f: ReportFilter) =>
  Prisma.sql`${lineCte(f)} SELECT COALESCE(SUM(CASE WHEN fulfilled=1 THEN gross ELSE 0 END),0) gross,COALESCE(SUM(CASE WHEN fulfilled=1 THEN gross-beforeRefund ELSE 0 END),0) discount,COALESCE(SUM(net),0) net,COALESCE(SUM(CASE WHEN fulfilled=1 THEN refunded ELSE 0 END),0) refunds,COALESCE(SUM(CASE WHEN fulfilled=1 AND paymentStatus='PAID' THEN net ELSE 0 END),0) paidSales,COUNT(DISTINCT orderId) orders,COUNT(DISTINCT CASE WHEN fulfilled=1 THEN orderId END) completed,COUNT(DISTINCT CASE WHEN status='CANCELLED' THEN orderId END) canceled,COALESCE(SUM(CASE WHEN fulfilled=1 THEN quantity ELSE 0 END),0) units,COUNT(CASE WHEN fulfilled=1 AND unitCost IS NOT NULL THEN 1 END) costKnown,COUNT(CASE WHEN fulfilled=1 THEN 1 END) costLines,COALESCE(SUM(cogs),0) knownCogs,COALESCE(SUM(CASE WHEN fulfilled=1 AND unitCost IS NOT NULL THEN net ELSE 0 END),0) knownNet,COUNT(CASE WHEN beforeRefund IS NULL THEN 1 END) missingSnapshots FROM lines`;
export async function analyticsRows(
  f: ReportFilter,
  role: string,
  limit = 24,
  offset = (f.page - 1) * 24,
): Promise<{ rows: Row[]; count: number }> {
  let sql: Prisma.Sql;
  const order =
    f.sort === "name"
      ? Prisma.sql`name ASC`
      : f.sort === "units"
        ? Prisma.sql`units DESC,name ASC`
        : Prisma.sql`value DESC,name ASC`;
  if (["overview", "sales", "reports"].includes(f.section))
    sql = Prisma.sql`${lineCte(f)} SELECT strftime('%Y-%m-%d',createdAt/1000,'unixepoch','+7 hours') name,COUNT(DISTINCT orderId) orders,COALESCE(SUM(CASE WHEN fulfilled=1 THEN quantity ELSE 0 END),0) units,COALESCE(SUM(CASE WHEN fulfilled=1 THEN gross ELSE 0 END),0) gross,COALESCE(SUM(net),0) value FROM lines GROUP BY 1`;
  else if (f.section === "products")
    sql = Prisma.sql`${lineCte(f)} SELECT productId id,name,MAX(merchandiseVerified) verified,MAX(publicationStatus) publication,MAX(price) catalogPrice,SUM(CASE WHEN fulfilled=1 THEN quantity-returnedUnits ELSE 0 END) units,SUM(net) value,SUM(CASE WHEN fulfilled=1 THEN returnedUnits ELSE 0 END) returnedUnits,SUM(CASE WHEN status='CANCELLED' THEN quantity ELSE 0 END+partialCanceledUnits) canceledUnits,SUM(originalUnits) orderedUnits FROM lines GROUP BY productId`;
  else if (f.section === "customers") {
    if (can(role, "analytics.finance.read"))
      sql = Prisma.sql`${lineCte(f)} SELECT 'KH-'||substr(l.userId,-8) name,COUNT(DISTINCT l.orderId) orders,SUM(CASE WHEN l.fulfilled=1 THEN l.quantity ELSE 0 END) units,SUM(CASE WHEN l.paymentStatus='PAID' THEN l.net ELSE 0 END) value FROM lines l WHERE l.userId IS NOT NULL GROUP BY l.userId`;
    else
      sql = Prisma.sql`${lineCte(f)} SELECT CASE WHEN (SELECT COUNT(*) FROM "Order" h WHERE h.userId=l.userId AND h.status IN ('DELIVERED','COMPLETED') AND h.createdAt<${f.from.getTime()})>0 THEN 'Khách quay lại' ELSE 'Người mua lần đầu trong kỳ' END name,COUNT(DISTINCT l.userId) customers,COUNT(DISTINCT l.orderId) orders,SUM(l.quantity) units,SUM(l.net) value FROM lines l WHERE l.userId IS NOT NULL AND l.fulfilled=1 GROUP BY 1`;
  } else if (f.section === "inventory")
    sql = Prisma.sql`WITH costs AS (SELECT v.id,v.sku name,p.name product,p.merchandiseVerified verified,v.stock units,v.stockOrigin,(SELECT h.unitCost FROM ProductCostHistory h WHERE h.productId=p.id AND (h.variantId=v.id OR h.variantId IS NULL) AND h.effectiveFrom<=${f.now.getTime()} ORDER BY (h.variantId IS NOT NULL) DESC,h.effectiveFrom DESC,h.id DESC LIMIT 1) unitCost FROM ProductVariant v JOIN Product p ON p.id=v.productId WHERE p.active=1 ${productScope(f)}) SELECT id,name,product,verified,stockOrigin,units,${can(role, "analytics.profit.read") ? Prisma.sql`unitCost,CASE WHEN stockOrigin='VERIFIED' AND verified=1 THEN units*unitCost ELSE NULL END` : Prisma.sql`units`} value FROM costs`;
  else if (f.section === "profit")
    sql = Prisma.sql`${lineCte(f)} SELECT id,name,sku,quantity units,net value,unitCost,cogs,CASE WHEN cogs IS NULL THEN NULL ELSE net-cogs END grossProfit FROM lines WHERE fulfilled=1`;
  else if (f.section === "finance")
    sql = Prisma.sql`${lineCte(f)} SELECT o.code name,1 orders,0 units,s.status shipmentStatus,s.expectedCOD expected,s.collectedCOD collected,s.remittedCOD remitted,s.outstandingCOD outstanding,s.reconciliationStatus,COALESCE((SELECT SUM(r.amount)FROM MockRefund r WHERE r.orderId=o.id AND r.status='SIMULATED_COMPLETED'),0) refunds,s.collectedCOD value FROM selectedOrders o JOIN Shipment s ON s.orderId=o.id`;
  else if (f.section === "marketing")
    sql = Prisma.sql`${lineCte(f)} SELECT COALESCE(a.source,'Chưa thu thập')||' / '||COALESCE(a.campaign,'') name,COUNT(DISTINCT l.orderId) orders,SUM(CASE WHEN l.fulfilled=1 THEN l.quantity ELSE 0 END) units,SUM(l.net) value FROM lines l LEFT JOIN OrderAttribution a ON a.orderId=l.orderId GROUP BY 1`;
  else if (f.section === "carts") {
    sql = Prisma.sql`WITH eligible AS (SELECT c.*,SUM(CAST(json_extract(j.value,'$.quantity')AS INTEGER)*CAST(json_extract(j.value,'$.unitPrice')AS INTEGER)) value,SUM(CAST(json_extract(j.value,'$.quantity')AS INTEGER)) units FROM CartAnalyticsCycle c JOIN json_each(c.snapshotJson)j WHERE c.firstSeenAt>=${f.from.getTime()} AND c.firstSeenAt<${f.to.getTime()} GROUP BY c.id) SELECT id name,units,value,CASE WHEN orderId IS NOT NULL THEN 'Đã chuyển đổi' WHEN lastActivityAt<${f.now.getTime() - f.inactivity * 3600000} THEN 'Bỏ dở' ELSE 'Đang hoạt động' END state,datetime(lastActivityAt/1000,'unixepoch','+7 hours')lastActivity FROM eligible`;
  } else
    sql = Prisma.sql`SELECT type name,COUNT(DISTINCT visitorId) units,COUNT(*) value FROM AnalyticsEvent WHERE createdAt>=${f.from.getTime()} AND createdAt<${f.to.getTime()} GROUP BY type`;
  const [rows, count] = await Promise.all([
    query(
      Prisma.sql`SELECT * FROM (${sql}) ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`,
    ),
    query(Prisma.sql`SELECT COUNT(*) count FROM (${sql})`),
  ]);
  return { rows, count: Number(count[0]?.count ?? 0) };
}
export async function analyticsReport(
  f: ReportFilter,
  role: string,
): Promise<Report> {
  if (
    ["funnel", "carts"].includes(f.section) &&
    (f.category || f.product || f.status || f.q)
  )
    throw Error("Báo cáo phiên/giỏ chỉ hỗ trợ ngày, sắp xếp và ngưỡng giỏ.");
  const page = await analyticsRows(f, role);
  const t = (await query(totals(f)))[0];
  const report: Report = {
    ...page,
    metrics: [],
    chart: [],
    extra: [],
    notes: [
      "Số liệu được tổng hợp từ sổ đơn hàng, giao nhận và hoàn tiền.",
      "Báo cáo doanh số theo nhóm đơn tạo trong kỳ, trạng thái/hoàn tiền hiện tại. Doanh số ghi nhận chỉ gồm DELIVERED/COMPLETED.",
    ],
  };
  const metric = (label: string, value: number | null, unit = "") =>
    report.metrics.push({ label, value, unit });
  const num = (key: string) => Number(t[key] ?? 0);
  if (
    [
      "overview",
      "sales",
      "products",
      "reports",
      "customers",
      "marketing",
    ].includes(f.section)
  ) {
    metric("Doanh số hàng trước giảm", num("gross"), "VND");
    metric("Doanh số hàng ròng", num("net"), "VND");
    metric("Doanh số hàng đã thanh toán", num("paidSales"), "VND");
    metric("Số đơn trong nhóm", num("orders"));
    metric("Đơn đã giao/hoàn tất", num("completed"));
    metric("Đơn đã hủy", num("canceled"));
    metric("Hoàn hàng đã hoàn tất", num("refunds"), "VND");
    metric(
      "AOV hàng ròng đã giao",
      num("completed") ? Math.round(num("net") / num("completed")) : null,
      "VND",
    );
    report.chart = await query(
      Prisma.sql`${lineCte(f)} SELECT strftime('%Y-%m-%d',createdAt/1000,'unixepoch','+7 hours') name,SUM(net) value,COUNT(DISTINCT orderId) orders,SUM(CASE WHEN fulfilled=1 THEN quantity ELSE 0 END) units FROM lines GROUP BY 1 ORDER BY 1`,
    );
  }
  if (f.section === "overview") {
    const today = (
      await query(
        totals(reportFilter({ period: "today", section: "overview" }, f.now)),
      )
    )[0];
    metric("Doanh số hàng ròng hôm nay", Number(today.net ?? 0), "VND");
    metric("Đơn hàng hôm nay", Number(today.orders ?? 0));
    report.notes.push(
      "Hai chỉ số hôm nay theo ngày Việt Nam, độc lập bộ lọc kỳ; tồn kho là số dư hiện tại.",
    );
    const summary = (
      await query(
        Prisma.sql`${lineCte(f)} SELECT COUNT(DISTINCT userId) customers FROM selectedOrders`,
      )
    )[0];
    metric("Khách hàng trong kỳ", Number(summary.customers ?? 0));
    if (can(role, "inventory.read")) {
      const inventory = await db.productVariant.aggregate({
        _sum: { stock: true },
        _count: true,
      });
      metric("Tồn kho hiện tại", inventory._sum.stock ?? 0);
      metric(
        "Biến thể sắp hết",
        await db.productVariant.count({ where: { stock: { lt: 5 } } }),
      );
    }
    if (can(role, "analytics.finance.read")) {
      const cod = (
        await query(
          Prisma.sql`${lineCte(f)} SELECT COALESCE(SUM(s.collectedCOD),0) collected,COALESCE(SUM(s.outstandingCOD),0) outstanding FROM selectedOrders o JOIN Shipment s ON s.orderId=o.id`,
        )
      )[0];
      metric("COD đã thu trong nhóm", Number(cod.collected), "VND");
      metric("COD còn phải đối soát", Number(cod.outstanding), "VND");
    }
    if (can(role, "orders.read"))
      report.extra.unshift({
        title: "Đơn hàng gần đây trong kỳ",
        rows: await query(
          Prisma.sql`${lineCte(f)} SELECT code name,status state,total value,datetime(createdAt/1000,'unixepoch','+7 hours') time FROM selectedOrders ORDER BY createdAt DESC LIMIT 10`,
        ),
      });
  }
  if (
    f.section === "sales" ||
    f.section === "overview" ||
    f.section === "products"
  ) {
    for (const [title, dimension] of [
      ["Theo danh mục", Prisma.sql`category`],
      ["Theo biến thể", Prisma.sql`sku`],
      ["Theo màu", Prisma.sql`color`],
      ["Theo kích cỡ", Prisma.sql`size`],
    ] as const) {
      report.extra.push({
        title,
        rows: await query(
          Prisma.sql`${lineCte(f)} SELECT ${dimension} name,SUM(CASE WHEN fulfilled=1 THEN quantity ELSE 0 END) units,SUM(net) value FROM lines GROUP BY ${dimension} ORDER BY value DESC,name LIMIT 20`,
        ),
      });
    }
    report.extra.push({
      title: "Theo bộ sưu tập (phân bổ đều, giữ tổng VND)",
      rows: await query(
        Prisma.sql`${lineCte(f)}, memberships AS(SELECT l.id,l.net,COALESCE(c.name,'Chưa xếp bộ sưu tập') name,COUNT(cp.collectionId) OVER(PARTITION BY l.id) members,ROW_NUMBER()OVER(PARTITION BY l.id ORDER BY c.id)rn FROM lines l LEFT JOIN CollectionProduct cp ON cp.productId=l.productId LEFT JOIN Collection c ON c.id=cp.collectionId),allocated AS(SELECT name,CASE WHEN members=0 THEN net ELSE CAST(net/members AS INTEGER)+CASE WHEN rn<=ABS(net%members) THEN CASE WHEN net<0 THEN -1 ELSE 1 END ELSE 0 END END value FROM memberships)SELECT name,SUM(value)value FROM allocated GROUP BY name ORDER BY value DESC LIMIT 20`,
      ),
    });
  }
  if (f.section === "products") {
    report.notes.push(
      "Đơn vị bán chỉ tính đã giao; tỷ lệ trả = số lượng kiểm hàng SELLABLE/DAMAGED / số đã giao. Hủy = số lượng đơn hủy / toàn bộ số lượng đặt. Catalog chưa xác minh và giá 0 được giữ nguyên, gắn nhãn rà soát.",
    );
    report.extra.push({
      title: "Thiết kế chậm luân chuyển (có tồn, không bán trong kỳ)",
      rows: await query(
        Prisma.sql`${lineCte(f)} SELECT p.sku name,p.name product,SUM(v.stock) stock,p.merchandiseVerified verified,p.publicationStatus,p.price FROM Product p JOIN ProductVariant v ON v.productId=p.id WHERE p.active=1 ${productScope(f)} AND NOT EXISTS(SELECT 1 FROM lines l WHERE l.productId=p.id AND l.fulfilled=1) GROUP BY p.id ORDER BY stock DESC LIMIT 20`,
      ),
    });
  }
  if (f.section === "customers") {
    const stats = (
      await query(
        Prisma.sql`${lineCte(f)}, buyers AS(SELECT l.userId,COUNT(DISTINCT l.orderId) purchases FROM lines l WHERE l.fulfilled=1 AND l.userId IS NOT NULL GROUP BY l.userId) SELECT COUNT(*) buyers,COALESCE(SUM(CASE WHEN purchases>1 THEN 1 ELSE 0 END),0) repeatBuyers,COALESCE(SUM(purchases),0) purchases FROM buyers`,
      )
    )[0];
    const fresh = await db.user.count({
      where: { role: "CUSTOMER", createdAt: { gte: f.from, lt: f.to } },
    });
    metric("Khách đăng ký mới", fresh);
    metric("Người mua trong kỳ", Number(stats.buyers));
    metric(
      "Tỷ lệ mua lặp trong kỳ",
      conversionRate(Number(stats.repeatBuyers), Number(stats.buyers)),
      "%",
    );
    metric(
      "Tần suất đơn/người mua",
      Number(stats.buyers)
        ? Math.round((Number(stats.purchases) / Number(stats.buyers)) * 100) /
            100
        : null,
    );
    report.extra.push({
      title: "LTV hàng đã thu — toàn thời gian (ẩn danh)",
      rows: can(role, "analytics.finance.read")
        ? await query(
            Prisma.sql`WITH rr AS(SELECT r.orderId,SUM(r.amount-r.shippingAmount)amount FROM MockRefund r WHERE r.status='SIMULATED_COMPLETED'GROUP BY r.orderId) SELECT 'KH-'||substr(o.userId,-8)name,COUNT(*)orders,SUM(o.subtotal-o.discount-COALESCE(rr.amount,0))value FROM "Order"o LEFT JOIN rr ON rr.orderId=o.id WHERE o.userId IN(SELECT DISTINCT userId FROM "Order"o WHERE ${scope(f)} AND userId IS NOT NULL)AND o.status IN('DELIVERED','COMPLETED')AND o.paymentStatus='PAID'GROUP BY o.userId ORDER BY value DESC LIMIT 20`,
          )
        : [],
    });
    report.extra.push({
      title: "Cohort người mua theo tháng đầu (đơn đã giao)",
      rows: await query(
        Prisma.sql`WITH purchase AS(SELECT userId,strftime('%Y-%m',createdAt/1000,'unixepoch','+7 hours')month FROM "Order"WHERE userId IS NOT NULL AND status IN('DELIVERED','COMPLETED')),first AS(SELECT userId,MIN(month)cohort FROM purchase GROUP BY userId) SELECT f.cohort name,p.month activityMonth,COUNT(DISTINCT p.userId)customers,(SELECT COUNT(*)FROM first base WHERE base.cohort=f.cohort)cohortSize FROM purchase p JOIN first f ON f.userId=p.userId WHERE p.month>=${f.fromDay.slice(0, 7)}AND p.month<=${f.toDay.slice(0, 7)} GROUP BY f.cohort,p.month ORDER BY f.cohort,p.month LIMIT 36`,
      ),
    });
  }
  if (f.section === "funnel") {
    const rows = await query(
      Prisma.sql`WITH steps AS(SELECT visitorId,MIN(CASE WHEN type='SESSION_STARTED'THEN createdAt END)s,MIN(CASE WHEN type='PRODUCT_VIEWED'THEN createdAt END)v,MIN(CASE WHEN type='ADD_TO_CART_ATTEMPTED'THEN createdAt END)a,MIN(CASE WHEN type='ADD_TO_CART_SUCCEEDED'THEN createdAt END)c,MIN(CASE WHEN type='CHECKOUT_STARTED'THEN createdAt END)k,MIN(CASE WHEN type='ORDER_PLACED'THEN createdAt END)o FROM AnalyticsEvent WHERE visitorId IN(SELECT id FROM VisitorSession WHERE startedAt>=${f.from.getTime()}AND startedAt<${f.to.getTime()})GROUP BY visitorId) SELECT COUNT(*) sessions,SUM(CASE WHEN v>=s THEN 1 ELSE 0 END)views,SUM(CASE WHEN a>=v AND v>=s THEN 1 ELSE 0 END)attempts,SUM(CASE WHEN c>=a AND a>=v AND v>=s THEN 1 ELSE 0 END)carts,SUM(CASE WHEN k>=c AND c>=a AND a>=v AND v>=s THEN 1 ELSE 0 END)checkouts,SUM(CASE WHEN o>=k AND k>=c AND c>=a AND a>=v AND v>=s THEN 1 ELSE 0 END)orders FROM steps`,
    );
    const r = rows[0];
    for (const [key, label] of [
      ["sessions", "Phiên mới"],
      ["views", "Xem sản phẩm"],
      ["attempts", "Thử thêm giỏ"],
      ["carts", "Thêm giỏ thành công"],
      ["checkouts", "Bắt đầu thanh toán"],
      ["orders", "Đã đặt đơn"],
    ])
      metric(label, Number(r[key] ?? 0));
    metric(
      "Chuyển đổi phiên→đơn",
      conversionRate(Number(r.orders ?? 0), Number(r.sessions ?? 0)),
      "%",
    );
    report.chart = report.metrics
      .slice(0, 6)
      .map((m) => ({ name: m.label, value: m.value }));
    report.notes.push(
      "Funnel có thứ tự trong phiên 30 phút; không đồng nhất hành vi với thanh toán. Không dựng dữ liệu lịch sử.",
    );
  }
  if (f.section === "carts") {
    const r = (
      await query(
        Prisma.sql`WITH cohort AS(SELECT *,EXISTS(SELECT 1 FROM json_each(snapshotJson))valid FROM CartAnalyticsCycle WHERE firstSeenAt>=${f.from.getTime()}AND firstSeenAt<${f.to.getTime()}) SELECT COUNT(CASE WHEN valid=1 THEN 1 END)eligible,COUNT(CASE WHEN orderId IS NOT NULL AND valid=1 THEN 1 END)converted,COUNT(CASE WHEN orderId IS NULL AND valid=1 AND lastActivityAt<${f.now.getTime() - f.inactivity * 3600000} THEN 1 END)abandoned FROM cohort`,
      )
    )[0];
    for (const [k, l] of [
      ["eligible", "Giỏ đủ điều kiện"],
      ["converted", "Giỏ đã đặt đơn"],
      ["abandoned", "Giỏ bỏ dở"],
    ])
      metric(l, Number(r[k]));
    metric(
      "Tỷ lệ bỏ dở trong cohort",
      conversionRate(Number(r.abandoned), Number(r.eligible)),
      "%",
    );
    report.chart = await query(
      Prisma.sql`SELECT strftime('%Y-%m-%d',firstSeenAt/1000,'unixepoch','+7 hours')name,COUNT(*)value FROM CartAnalyticsCycle WHERE orderId IS NULL AND lastActivityAt<${f.now.getTime() - f.inactivity * 3600000}AND firstSeenAt>=${f.from.getTime()}AND firstSeenAt<${f.to.getTime()}AND json_array_length(snapshotJson)>0 GROUP BY name ORDER BY name`,
    );
    report.extra.push({
      title: "Sản phẩm bỏ dở nhiều nhất (ước tính)",
      rows: await query(
        Prisma.sql`SELECT json_extract(j.value,'$.name')name,SUM(json_extract(j.value,'$.quantity'))units,SUM(json_extract(j.value,'$.quantity')*json_extract(j.value,'$.unitPrice'))value FROM CartAnalyticsCycle c,json_each(c.snapshotJson)j WHERE c.orderId IS NULL AND c.lastActivityAt<${f.now.getTime() - f.inactivity * 3600000}AND c.firstSeenAt>=${f.from.getTime()}AND c.firstSeenAt<${f.to.getTime()} GROUP BY json_extract(j.value,'$.productId')ORDER BY value DESC LIMIT 20`,
      ),
    });
    report.extra.push({
      title: "Phân bố giá trị giỏ (ước tính)",
      rows: await query(
        Prisma.sql`WITH valuesByCart AS(SELECT c.id,SUM(json_extract(j.value,'$.quantity')*json_extract(j.value,'$.unitPrice'))amount FROM CartAnalyticsCycle c,json_each(c.snapshotJson)j WHERE c.orderId IS NULL AND c.lastActivityAt<${f.now.getTime() - f.inactivity * 3600000}AND c.firstSeenAt>=${f.from.getTime()}AND c.firstSeenAt<${f.to.getTime()}GROUP BY c.id)SELECT CASE WHEN amount<500000 THEN 'Dưới 500.000'WHEN amount<1000000 THEN '500.000–999.999'ELSE 'Từ 1.000.000'END name,COUNT(*)carts,SUM(amount)value FROM valuesByCart GROUP BY 1`,
      ),
    });
    report.notes.push(
      "Cohort theo lần hoạt động mới của giỏ, mặc định 24 giờ. Giỏ trước khi bật tracking không có mốc hoạt động đáng tin nên không tự gắn nhãn bỏ dở. Giá trị là ước tính, không phải doanh thu.",
    );
  }
  if (f.section === "inventory") {
    const r = (
      await query(
        Prisma.sql`SELECT SUM(v.stock)stock,COUNT(CASE WHEN v.stock=0 THEN 1 END)empty,COUNT(CASE WHEN v.stock>0 AND v.stock<5 THEN 1 END)low,COUNT(CASE WHEN v.stockOrigin!='VERIFIED'THEN 1 END)unverified FROM ProductVariant v JOIN Product p ON p.id=v.productId WHERE p.active=1 ${productScope(f)}`,
      )
    )[0];
    metric("Tồn hiện tại", Number(r.stock ?? 0));
    metric("SKU hết hàng", Number(r.empty));
    metric("SKU tồn thấp (1–4)", Number(r.low));
    metric("SKU tồn chưa xác minh", Number(r.unverified));
    report.extra.push({
      title: "Biến động kho trong kỳ (chỉ đọc)",
      rows: await query(
        Prisma.sql`SELECT m.id name,v.sku,datetime(m.createdAt/1000,'unixepoch','+7 hours')time,m.delta units,m.reason FROM InventoryMovement m JOIN ProductVariant v ON v.id=m.variantId JOIN Product p ON p.id=v.productId WHERE m.createdAt>=${f.from.getTime()}AND m.createdAt<${f.to.getTime()} ${productScope(f)}ORDER BY m.createdAt DESC LIMIT 30`,
      ),
    });
    report.notes.push(
      "Sell-through chưa tính khi không có tồn đầu kỳ và nhập kho được xác minh đầy đủ. Không coi tồn SAMPLE/UNVERIFIED là kho thực đã kiểm.",
    );
  }
  if (f.section === "profit") {
    const complete =
      num("costLines") > 0 && num("costKnown") === num("costLines");
    metric("Dòng đã giao có giá vốn", num("costKnown"));
    metric("Tổng dòng đã giao", num("costLines"));
    metric(
      "Độ phủ giá vốn",
      conversionRate(num("costKnown"), num("costLines")),
      "%",
    );
    metric(
      "Giá vốn đã biết",
      num("costKnown") ? num("knownCogs") : null,
      "VND",
    );
    metric(
      "Lãi gộp phần có giá vốn",
      num("costKnown") ? num("knownNet") - num("knownCogs") : null,
      "VND",
    );
    metric(
      "Lãi gộp toàn nhóm",
      complete ? num("net") - num("knownCogs") : null,
      "VND",
    );
    metric(
      "Biên lãi gộp toàn nhóm",
      complete && num("net")
        ? Math.round(((num("net") - num("knownCogs")) / num("net")) * 10000) /
            100
        : null,
      "%",
    );
    metric("Chi phí giảm giá đã biết", num("discount"), "VND");
    const ship = (
      await query(
        Prisma.sql`${lineCte(f)}SELECT SUM(s.shippingFee)cost,COUNT(s.id)known,COUNT(o.id)total,SUM(o.shipping)charged FROM selectedOrders o LEFT JOIN Shipment s ON s.orderId=o.id WHERE o.status IN('DELIVERED','COMPLETED')`,
      )
    )[0];
    metric(
      "Phí giao thực tế đã ghi nhận",
      Number(ship.known) ? Number(ship.cost) : null,
      "VND",
    );
    report.notes.push(
      "Chưa đủ dữ liệu giá vốn khi độ phủ <100%; chi phí thiếu không được coi là 0. Giá vốn mới không hồi tố, chỉ snapshot mới hoặc nguồn lịch sử đã xác minh. Lãi gộp hàng không gồm phí giao; hàng DAMAGED vẫn chịu giá vốn, chỉ SELLABLE/restocked giảm giá vốn.",
    );
  }
  if (f.section === "finance") {
    const r = (
      await query(
        Prisma.sql`${lineCte(f)}SELECT COALESCE(SUM(s.expectedCOD),0)expected,COALESCE(SUM(s.collectedCOD),0)collected,COALESCE(SUM(s.remittedCOD),0)remitted,COALESCE(SUM(s.outstandingCOD),0)outstanding,COALESCE(SUM(CASE WHEN s.reconciliationStatus='RECONCILED'THEN s.remittedCOD ELSE 0 END),0)reconciled,COALESCE(SUM(CASE WHEN s.reconciliationStatus='DISPUTED'THEN ABS(s.collectedCOD-s.expectedCOD)+ABS(s.remittedCOD-s.collectedCOD)ELSE 0 END),0)disputed FROM selectedOrders o JOIN Shipment s ON s.orderId=o.id`,
      )
    )[0];
    for (const [k, l] of [
      ["expected", "COD kỳ vọng"],
      ["collected", "Khách đã trả COD"],
      ["remitted", "COD đã chuyển về"],
      ["outstanding", "COD còn phải chuyển"],
      ["reconciled", "COD đã đối soát"],
      ["disputed", "Chênh lệch đang tranh chấp"],
    ])
      metric(l, Number(r[k]), "VND");
    const refunds = (
      await query(
        Prisma.sql`${lineCte(f)}SELECT COALESCE(SUM(CASE WHEN r.status='SIMULATED_COMPLETED'THEN r.amount ELSE 0 END),0)completed,COALESCE(SUM(CASE WHEN r.status IN('PENDING','APPROVED')THEN r.amount ELSE 0 END),0)pending FROM MockRefund r JOIN selectedOrders o ON o.id=r.orderId`,
      )
    )[0];
    metric("Hoàn đã hoàn tất", Number(refunds.completed), "VND");
    metric("Hoàn đang chờ", Number(refunds.pending), "VND");
  }
  if (f.section === "marketing") {
    report.extra.push({
      title: "Phiên và checkout theo nguồn thu thập",
      rows: await query(
        Prisma.sql`SELECT v.source name,COUNT(DISTINCT v.id)sessions,COUNT(DISTINCT CASE WHEN e.type='CHECKOUT_STARTED'THEN v.id END)checkouts,COUNT(DISTINCT CASE WHEN e.type='ORDER_PLACED'THEN v.id END)orders FROM VisitorSession v LEFT JOIN AnalyticsEvent e ON e.visitorId=v.id WHERE v.startedAt>=${f.from.getTime()}AND v.startedAt<${f.to.getTime()}GROUP BY v.source ORDER BY sessions DESC`,
      ),
    });
    report.notes.push(
      "First-touch trong phiên 30 phút; không suy đoán UTM đơn cũ. Tag không chứa email/URL/điện thoại, không Google Analytics/Meta Pixel.",
    );
  }
  const quality = await query(
    Prisma.sql`${lineCte(f)}SELECT COUNT(DISTINCT CASE WHEN merchandiseVerified=0 OR publicationStatus!='READY'THEN productId END)unverified,COUNT(DISTINCT CASE WHEN price<=0 THEN productId END)invalidPrice,COUNT(CASE WHEN refunded>COALESCE(beforeRefund,0)OR returnedUnits>quantity THEN 1 END)badReturns FROM lines`,
  );
  if (num("missingSnapshots"))
    report.notes.push(
      "CẢNH BÁO: " +
        num("missingSnapshots") +
        " dòng chưa phân bổ giảm giá; cần chạy analytics:backfill trước khi tin tổng ròng.",
    );
  if (Number(quality[0].badReturns))
    report.notes.push(
      "CẢNH BÁO: dữ liệu trả/hoàn vượt số mua; cần điều tra, không tự sửa.",
    );
  if (["overview", "reports"].includes(f.section))
    report.extra.push({
      title: "Kiểm tra tính nhất quán (không tự sửa bản ghi)",
      rows: await analyticsConsistency(f),
    });
  if (f.section === "products") {
    report.rows = report.rows.map((r) => ({
      ...r,
      returnRate: conversionRate(
        Number(r.returnedUnits),
        Number(r.units) + Number(r.returnedUnits),
      ),
      cancellationRate: conversionRate(
        Number(r.canceledUnits),
        Number(r.orderedUnits),
      ),
    }));
    const catalog = await db.product.findMany({ include: qualityInclude });
    const readiness = catalog.reduce<Record<string, number>>(
      (counts, product) => {
        const status = productQuality(product).status;
        counts[status] = (counts[status] ?? 0) + 1;
        return counts;
      },
      {},
    );
    metric("Catalog cần xác minh (toàn bộ)", readiness["NEEDS REVIEW"] ?? 0);
    metric("Catalog lỗi cần rà soát (toàn bộ)", readiness.INVALID ?? 0);
    report.notes.push(
      "Readiness catalog dùng cùng bộ kiểm tra với quản trị Phase 5 và áp dụng toàn catalog, độc lập bộ lọc doanh số. Không tự thay đổi giá, tồn hay trạng thái công bố.",
    );
  }
  if (f.section === "customers") {
    const segments = await query(
      Prisma.sql`${lineCte(f)} SELECT CASE WHEN EXISTS(SELECT 1 FROM "Order"h WHERE h.userId=l.userId AND h.status IN('DELIVERED','COMPLETED')AND h.createdAt<${f.from.getTime()})THEN 'Khách quay lại' ELSE 'Mua lần đầu'END name,COUNT(DISTINCT l.userId)customers,COUNT(DISTINCT l.orderId)orders,SUM(l.net)value,CAST(SUM(l.net)/COUNT(DISTINCT l.orderId) AS INTEGER)aov FROM lines l WHERE l.fulfilled=1 AND l.userId IS NOT NULL GROUP BY 1`,
    );
    report.extra.push({
      title: "Phân khúc và AOV hàng ròng trong kỳ",
      rows: segments,
    });
  }
  if (f.section === "carts") {
    const total = (
      await query(
        Prisma.sql`SELECT COALESCE(SUM(json_extract(j.value,'$.quantity')*json_extract(j.value,'$.unitPrice')),0)value FROM CartAnalyticsCycle c,json_each(c.snapshotJson)j WHERE c.orderId IS NULL AND c.lastActivityAt<${f.now.getTime() - f.inactivity * 3600000}AND c.firstSeenAt>=${f.from.getTime()}AND c.firstSeenAt<${f.to.getTime()}`,
      )
    )[0];
    metric("Giá trị giỏ bỏ dở ước tính", Number(total.value), "VND");
  }
  if (f.section === "inventory" && can(role, "analytics.profit.read")) {
    const value = (
      await query(
        Prisma.sql`WITH priced AS(SELECT v.stock,v.stockOrigin,p.merchandiseVerified,(SELECT h.unitCost FROM ProductCostHistory h WHERE h.productId=p.id AND(h.variantId=v.id OR h.variantId IS NULL)AND h.effectiveFrom<=${f.now.getTime()}ORDER BY(h.variantId IS NOT NULL)DESC,h.effectiveFrom DESC,h.id DESC LIMIT 1)cost FROM ProductVariant v JOIN Product p ON p.id=v.productId WHERE p.active=1 ${productScope(f)})SELECT SUM(CASE WHEN stockOrigin='VERIFIED'AND merchandiseVerified=1 THEN stock*cost END)value,SUM(CASE WHEN cost IS NOT NULL AND stockOrigin='VERIFIED'AND merchandiseVerified=1 THEN stock ELSE 0 END)known,SUM(CASE WHEN stockOrigin='VERIFIED'AND merchandiseVerified=1 THEN stock ELSE 0 END)total FROM priced`,
      )
    )[0];
    metric(
      "Giá trị tồn phần có vốn",
      value.value === null ? null : Number(value.value),
      "VND",
    );
    metric(
      "Độ phủ vốn theo lượng tồn",
      conversionRate(Number(value.known), Number(value.total)),
      "%",
    );
  }
  if (f.section === "marketing") {
    const source = report.extra.find((e) =>
      e.title.startsWith("Phiên và checkout"),
    );
    if (source)
      source.rows = source.rows.map((r) => ({
        ...r,
        checkoutConversion: conversionRate(
          Number(r.orders),
          Number(r.checkouts),
        ),
      }));
    report.extra.push({
      title: "Người mua quay lại theo nguồn đơn trong kỳ",
      rows: await query(
        Prisma.sql`${lineCte(f)}SELECT COALESCE(a.source,'Chưa thu thập')name,COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM "Order"h WHERE h.userId=o.userId AND h.status IN('DELIVERED','COMPLETED')AND h.createdAt<o.createdAt)THEN o.userId END)returningCustomers FROM selectedOrders o LEFT JOIN OrderAttribution a ON a.orderId=o.id WHERE o.status IN('DELIVERED','COMPLETED')GROUP BY 1`,
      ),
    });
  }
  return report;
}
export async function analyticsConsistency(f: ReportFilter) {
  return query(Prisma.sql`SELECT 'Tổng đơn lệch dòng hàng/phí/giảm giá' name,COUNT(*)value FROM "Order"o WHERE ${scope(f)}AND (o.subtotal!=(SELECT COALESCE(SUM(i.quantity*i.unitPrice),0)FROM OrderItem i WHERE i.orderId=o.id)OR o.total!=o.subtotal-o.discount+o.shipping)
 UNION ALL SELECT 'Hoàn giữ/hoàn tất vượt tiền đã thu',COUNT(*)FROM "Order"o LEFT JOIN Shipment s ON s.orderId=o.id WHERE ${scope(f)}AND (SELECT COALESCE(SUM(r.amount),0)FROM MockRefund r WHERE r.orderId=o.id AND r.status IN('PENDING','APPROVED','SIMULATED_COMPLETED'))>CASE WHEN s.id IS NOT NULL THEN s.collectedCOD WHEN o.paymentStatus='PAID'THEN o.total ELSE 0 END
 UNION ALL SELECT 'COD snapshot lệch ledger',COUNT(*)FROM Shipment s JOIN "Order"o ON o.id=s.orderId WHERE ${scope(f)}AND (s.collectedCOD!=(SELECT COALESCE(SUM(c.amount),0)FROM CODCollection c WHERE c.shipmentId=s.id)OR s.remittedCOD!=(SELECT COALESCE(SUM(c.amount),0)FROM CODRemittance c WHERE c.shipmentId=s.id)OR s.outstandingCOD!=MAX(s.collectedCOD-s.remittedCOD,0))
 UNION ALL SELECT 'Đã ghi thu COD nhưng payment chưa PAID hoặc ngược lại',COUNT(*)FROM Shipment s JOIN "Order"o ON o.id=s.orderId WHERE ${scope(f)}AND ((s.collectedCOD>=s.expectedCOD AND o.paymentStatus!='PAID')OR(s.collectedCOD<s.expectedCOD AND o.paymentStatus='PAID'))
 UNION ALL SELECT 'Lượng trả vượt lượng mua',COUNT(*)FROM OrderItem i JOIN "Order"o ON o.id=i.orderId WHERE ${scope(f)}AND (SELECT COALESCE(SUM(r.quantity),0)FROM ReturnItem r WHERE r.orderItemId=i.id AND r.disposition IN('SELLABLE','DAMAGED'))>i.quantity
 UNION ALL SELECT 'Tồn âm',COUNT(*)FROM ProductVariant WHERE stock<0
 UNION ALL SELECT 'Snapshot phân bổ giảm giá chưa khớp',COUNT(*)FROM "Order"o WHERE ${scope(f)}AND o.subtotal-o.discount!=(SELECT COALESCE(SUM(a.netAmount),0)FROM OrderItem i JOIN OrderLineAnalytics a ON a.orderItemId=i.id WHERE i.orderId=o.id)`);
}
