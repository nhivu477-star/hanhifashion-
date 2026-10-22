import { AnalyticsSection } from "./analytics-rules";
import { Permission } from "./rbac";
export const analyticsPermission: Record<AnalyticsSection, Permission> = {
  overview: "analytics.sales.read",
  sales: "analytics.sales.read",
  products: "analytics.products.read",
  customers: "analytics.customers.read",
  funnel: "analytics.marketing.read",
  carts: "analytics.marketing.read",
  inventory: "analytics.inventory.read",
  profit: "analytics.profit.read",
  marketing: "analytics.marketing.read",
  finance: "analytics.finance.read",
  reports: "analytics.sales.read",
};
