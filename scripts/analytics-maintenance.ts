import { db } from "../src/lib/db";
import { backfillNetAnalytics } from "../src/lib/analytics-tracking";
if (!process.env.DATABASE_URL?.startsWith("file:"))
  throw Error("Local SQLite only");
if (process.argv.includes("--backfill"))
  console.log(await backfillNetAnalytics());
if (process.argv.includes("--retention")) {
  const cutoff = new Date(Date.now() - 180 * 86400000);
  const result = await db.analyticsEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  console.log({
    removedEvents: result.count,
    retentionDays: 180,
  }); /* Session/attribution cohorts and all operational records remain intact. */
}
await db.$disconnect();
