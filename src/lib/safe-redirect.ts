export function safeReturnTo(input: unknown): string | undefined {
  if (
    typeof input !== "string" ||
    input.length > 1500 ||
    !input.startsWith("/") ||
    input.startsWith("//") ||
    /[\\\x00-\x20\x7f]/.test(input)
  )
    return;
  const u = new URL(input, "http://local.invalid");
  if (
    u.origin !== "http://local.invalid" ||
    /^\/(api|dang-nhap|dang-ky|quen-mat-khau)(\/|$)/.test(u.pathname)
  )
    return;
  return u.pathname + u.search + u.hash;
}
