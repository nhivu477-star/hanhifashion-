import { excelExport } from "@/lib/analytics-excel";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, rateLimit } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { reportFilter, csvCell } from "@/lib/analytics-rules";
import { analyticsPermission } from "@/lib/analytics-access";
import { analyticsReport, analyticsRows } from "@/lib/analytics-report";
import { visitorSession, recordPublicEvent } from "@/lib/analytics-tracking";
import { saveAnalyticsCost } from "@/lib/analytics-cost";
import { db } from "@/lib/db";
import { requireActorPermission } from "@/lib/authorization";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const action = (await params).path.join("/");
    if (!["report", "export"].includes(action))
      return json({ error: "Không tìm thấy chức năng." }, 404);
    const user = await currentUser();
    if (!user) return json({ error: "Cần đăng nhập." }, 401);
    const f = reportFilter(Object.fromEntries(req.nextUrl.searchParams));
    if (
      !can(user.role, analyticsPermission[f.section]) ||
      (action === "export" && !can(user.role, "analytics.export"))
    )
      return json({ error: "Không có quyền xem/xuất báo cáo này." }, 403);
    if (action === "report") return json(await analyticsReport(f, user.role));
    const format = z
      .enum(["csv", "xlsx"])
      .parse(req.nextUrl.searchParams.get("format") ?? "csv");
    await db.$transaction(async (tx) => {
      await requireActorPermission(tx, user, analyticsPermission[f.section]);
      await requireActorPermission(tx, user, "analytics.export");
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "ANALYTICS_EXPORT",
          resourceType: "REPORT",
          targetId: f.section,
          result: "SUCCESS",
          detail: JSON.stringify({ format, from: f.fromDay, to: f.toDay }),
        },
      });
    });
    if (format === "xlsx")
      return new Response(
        excelExport((offset) => analyticsRows(f, user.role, 250, offset)),
        {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="hanhi-${f.section}.xlsx"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    // Bounded pages; stream rows without holding an entire export in memory.
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        let offset = 0,
          keys: string[] = [];
        try {
          controller.enqueue(encoder.encode("\uFEFF"));
          while (true) {
            const page = await analyticsRows(f, user.role, 250, offset);
            if (!page.rows.length) {
              if (!offset)
                controller.enqueue(encoder.encode("Không có dữ liệu\r\n"));
              break;
            }
            if (!keys.length) {
              keys = Object.keys(page.rows[0]);
              controller.enqueue(
                encoder.encode(keys.map(csvCell).join(",") + "\r\n"),
              );
            }
            for (const row of page.rows)
              controller.enqueue(
                encoder.encode(
                  keys.map((k) => csvCell(row[k])).join(",") + "\r\n",
                ),
              );
            offset += page.rows.length;
            if (offset >= page.count) break;
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="hanhi-' + f.section + '.csv"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return json(
      { error: "Không thể đọc báo cáo. Kiểm tra bộ lọc và thử lại." },
      400,
    );
  }
}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    // Next's internal URL may use localhost while the browser uses 127.0.0.1.
    // Compare against the public Host of this request; keep cross-origin denial.
    if (
      !req.headers.get("origin") ||
      req.headers.get("origin") !==
        `${req.nextUrl.protocol}//${req.headers.get("host")}`
    )
      return json({ error: "Origin không hợp lệ." }, 403);
    if (Number(req.headers.get("content-length") ?? 0) > 8192)
      return json({ error: "Yêu cầu quá lớn." }, 413);
    const text = await req.text();
    if (text.length > 8192) return json({ error: "Yêu cầu quá lớn." }, 413);
    const body = JSON.parse(text);
    const action = (await params).path.join("/");
    const user = await currentUser();
    if (action === "cost") {
      if (!user || !can(user.role, "analytics.costs.manage"))
        return json({ error: "Không có quyền cập nhật giá vốn." }, 403);
      return json({ id: await saveAnalyticsCost(body, user) });
    }
    if (action !== "event")
      return json({ error: "Không tìm thấy chức năng." }, 404);
    const d = z
      .object({
        type: z.enum([
          "PRODUCT_VIEWED",
          "PRODUCT_SEARCHED",
          "CHECKOUT_STARTED",
          "SESSION_STARTED",
        ]),
        eventKey: z.string().uuid(),
        slug: z.string().max(120).optional(),
        utm: z.unknown().optional(),
      })
      .strict()
      .parse(body);
    const visitor = await visitorSession(d.utm);
    if (!visitor) return json({ tracked: false });
    rateLimit("analytics:" + visitor.id, 250);
    let productId: string | undefined;
    if (d.type === "PRODUCT_VIEWED") {
      const product = await db.product.findFirst({
        where: { slug: d.slug, active: true },
        select: { id: true },
      });
      if (!product) return json({ tracked: false });
      productId = product.id;
    }
    if (d.type !== "SESSION_STARTED")
      await recordPublicEvent(
        visitor.id,
        d.type,
        d.eventKey,
        productId,
        !!user,
      );
    return json({ tracked: true });
  } catch {
    return json({ error: "Không thể ghi nhận yêu cầu." }, 400);
  }
}
