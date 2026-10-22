import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { currencyConfigSchema } from "@/lib/localization/config";
import { operationalAudit, requireActorPermission } from "@/lib/authorization";
export async function POST(req: NextRequest) {
  if (
    req.headers.get("origin") !==
    `${req.nextUrl.protocol}//${req.headers.get("host")}`
  )
    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ." },
      { status: 403 },
    );
  const actor = await currentUser();
  if (!actor)
    return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  try {
    const data = currencyConfigSchema.parse(await req.json());
    await db.$transaction(async (tx) => {
      await requireActorPermission(tx, actor, "content.manage");
      const old = await tx.storeSetting.findUnique({
        where: { key: "localization.currencies" },
      });
      await tx.storeSetting.upsert({
        where: { key: "localization.currencies" },
        create: { key: "localization.currencies", value: JSON.stringify(data) },
        update: { value: JSON.stringify(data) },
      });
      await operationalAudit(
        tx,
        actor.id,
        "CURRENCY_CONFIG_UPDATED",
        "SETTINGS",
        "localization.currencies",
        old?.value,
        data,
        "Cập nhật tỷ giá tham chiếu hiển thị; thanh toán luôn VND",
      );
    });
    return NextResponse.json({ message: "Đã lưu tỷ giá hiển thị." });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthorizationError")
      await db.auditLog.create({
        data: {
          actorId: actor.id,
          action: "ACCESS_DENIED",
          resourceType: "SETTINGS",
          targetId: "localization.currencies",
          result: "DENIED",
          detail: "Missing content.manage",
        },
      });
    return NextResponse.json(
      {
        error:
          (error as Error).name === "AuthorizationError"
            ? "Không có quyền truy cập."
            : "Cấu hình tiền tệ không hợp lệ.",
      },
      { status: (error as Error).name === "AuthorizationError" ? 403 : 400 },
    );
  }
}
