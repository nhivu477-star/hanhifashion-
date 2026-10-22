import { Prisma } from "@prisma/client";
import { db } from "./db";
import { lineCte } from "./analytics-report";
import { reportFilter, type ReportFilter } from "./analytics-rules";
import { can } from "./rbac";

export async function dashboardSummary(f: ReportFilter, role: string) {
  const aggregate = async (filter: ReportFilter) => {
    const rows = await db.$queryRaw<
      Array<{
        revenue: number;
        orders: number;
        pending: number;
        completed: number;
        customers: number;
      }>
    >(
      Prisma.sql`${lineCte(filter)} SELECT COALESCE((SELECT SUM(net) FROM lines),0) revenue, COUNT(*) orders, COALESCE(SUM(CASE WHEN status='PENDING' THEN 1 ELSE 0 END),0) pending, COALESCE(SUM(CASE WHEN status IN ('DELIVERED','COMPLETED') THEN 1 ELSE 0 END),0) completed, COUNT(DISTINCT userId) customers FROM selectedOrders`,
    );
    return rows[0];
  };
  const today = reportFilter({ period: "today" }, f.now);
  const previousDay = {
    ...today,
    from: new Date(today.from.getTime() - 86400000),
    to: today.from,
  };
  const previous = {
    ...f,
    from: new Date(f.from.getTime() - (f.to.getTime() - f.from.getTime())),
    to: f.from,
  };
  const [current, prior, daily, yesterday, statuses, low, statusDays] =
    await Promise.all([
      aggregate(f),
      aggregate(previous),
      aggregate(today),
      aggregate(previousDay),
      db.$queryRaw<Array<{ name: string; value: number }>>(
        Prisma.sql`${lineCte(f)} SELECT status name,COUNT(*) value FROM selectedOrders GROUP BY status`,
      ),
      can(role, "analytics.inventory.read")
        ? db.product.count({
            where: {
              active: true,
              ...(f.category ? { categoryId: f.category } : {}),
              ...(f.product ? { id: f.product } : {}),
              ...(f.q
                ? {
                    OR: [
                      { name: { contains: f.q } },
                      { sku: { contains: f.q } },
                    ],
                  }
                : {}),
              variants: { some: { stock: { lt: 5 } } },
            },
          })
        : Promise.resolve(null),
      db.$queryRaw<Array<{ day: string; name: string; value: number }>>(
        Prisma.sql`${lineCte(f)} SELECT strftime('%Y-%m-%d',createdAt/1000,'unixepoch','+7 hours') day,status name,COUNT(*) value FROM selectedOrders GROUP BY day,status`,
      ),
    ]);
  const metric = (
    label: string,
    value: number | null,
    before: number | null,
    currency = false,
  ) => ({
    label,
    value: value === null ? null : Number(value),
    before: before === null ? null : Number(before),
    currency,
  });
  return {
    metrics: [
      metric("Doanh thu hôm nay", daily.revenue, yesterday.revenue, true),
      metric("Đơn hàng hôm nay", daily.orders, yesterday.orders),
      metric("Chờ xử lý", current.pending, prior.pending),
      metric("Đã hoàn tất", current.completed, prior.completed),
      metric("Khách hàng", current.customers, prior.customers),
      metric("Sản phẩm sắp hết", low, null),
    ],
    statusDays: statusDays.map((s) => ({ ...s, value: Number(s.value) })),
    statuses: statuses.map((s) => ({ ...s, value: Number(s.value) })),
  };
}
