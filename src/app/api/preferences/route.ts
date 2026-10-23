import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import {
  readPreferences,
  savePreferences,
  currencyConfiguration,
} from "@/lib/localization/server";
export async function GET() {
  try {
    const user = await currentUser();
    return NextResponse.json(
      {
        preference: await readPreferences(user?.id),
        currencies: await currencyConfiguration(),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Không thể tải tùy chọn. Vui lòng thử lại." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export async function POST(req: NextRequest) {
  if (
    req.headers.get("origin") !==
    `${req.nextUrl.protocol}//${req.headers.get("host")}`
  )
    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ." },
      { status: 403 },
    );
  try {
    if (Number(req.headers.get("content-length") ?? 0) > 2048) throw Error();
    const user = await currentUser();
    return NextResponse.json(
      { preference: await savePreferences(await req.json(), user ?? undefined) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const unavailable =
      error instanceof Error && error.name.startsWith("Prisma");
    return NextResponse.json(
      { error: "Lựa chọn ngôn ngữ, khu vực hoặc tiền tệ không hợp lệ." },
      {
        status: unavailable ? 503 : 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
