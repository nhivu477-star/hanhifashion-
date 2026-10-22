import { can } from "@/lib/rbac";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return new NextResponse(null, { status: 403 });
  const image = await db.returnEvidence.findFirst({
    where: {
      id: (await params).id,
      ...(can(user.role, "returns.read")
        ? {}
        : { request: { userId: user.id } }),
    },
  });
  if (!image) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(Buffer.from(image.data, "base64")), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
