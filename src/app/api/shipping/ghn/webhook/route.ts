import { NextResponse } from "next/server";
/** Carrier callbacks are not accepted in local demo mode. */
export async function POST() {
  return NextResponse.json(
    { error: "REAL_CARRIERS_DISABLED_LOCAL_DEMO" },
    { status: 410 },
  );
}
