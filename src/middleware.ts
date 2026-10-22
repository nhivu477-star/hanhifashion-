import { NextRequest, NextResponse } from "next/server";
// Establish the guest identity before hydration so simultaneous cart requests share it.
export function middleware(req: NextRequest) {
  if (req.cookies.has("hn_cart") || req.cookies.has("hn_session"))
    return NextResponse.next();
  const t = crypto.randomUUID() + crypto.randomUUID();
  const headers = new Headers(req.headers);
  headers.set("cookie", `${headers.get("cookie") ?? ""}; hn_cart=${t}`);
  const response = NextResponse.next({ request: { headers } });
  response.cookies.set("hn_cart", t, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86400,
  });
  return response;
}
export const config = {
  matcher: [
    "/((?!api|_next|images|fonts|uploads|favicon.ico|icon.png|icon.svg|robots.txt|sitemap.xml).*)",
  ],
};
