// Deliberately accepts no payload/error message/PII; unknown codes are collapsed.
const allowedCodes = new Set([
  "VALIDATION_ERROR",
  "AUTH_FAILED",
  "DATABASE_ERROR",
  "ACCESS_DENIED",
  "BUSINESS_RULE_REJECTED",
  "UNKNOWN_ERROR",
]);
export function safeLogRecord(
  requestId: string,
  method: string,
  area: string,
  code: string,
) {
  return {
    event: "request_rejected",
    requestId: /^[a-f0-9-]{36}$/.test(requestId) ? requestId : "invalid",
    method: method === "POST" ? "POST" : "GET",
    area: [
      "auth",
      "admin",
      "shipping",
      "returns",
      "checkout",
      "catalog",
    ].includes(area)
      ? area
      : "application",
    code: allowedCodes.has(code) ? code : "UNKNOWN_ERROR",
  };
}
export function logRejection(
  requestId: string,
  method: string,
  pathname: string,
  error: unknown,
) {
  const code =
    error instanceof Error
      ? error.name === "ZodError"
        ? "VALIDATION_ERROR"
        : error.name.startsWith("Prisma")
          ? "DATABASE_ERROR"
          : error.message.includes("Email hoặc mật khẩu")
            ? "AUTH_FAILED"
            : error.name === "AuthorizationError"
              ? "ACCESS_DENIED"
              : "BUSINESS_RULE_REJECTED"
      : "UNKNOWN_ERROR";
  const area = pathname.includes("shipping")
    ? "shipping"
    : pathname.includes("returns")
      ? "returns"
      : pathname.includes("/admin/")
        ? "admin"
        : /login|register|reset|forgot/.test(pathname)
          ? "auth"
          : pathname.includes("checkout")
            ? "checkout"
            : "catalog";
  console.warn(JSON.stringify(safeLogRecord(requestId, method, area, code)));
}
