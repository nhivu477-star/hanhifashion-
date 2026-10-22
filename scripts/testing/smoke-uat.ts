import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const base = "http://localhost:3000";
const credentials = JSON.parse(
  await readFile(".local-demo-accounts.json", "utf8"),
);
const results: { test: string; status: string; redirect?: string }[] = [];
for (const path of [
  "/",
  "/trang-phuc",
  "/giay",
  "/tui-xach",
  "/phu-kien",
  "/dang-nhap",
  "/gio-hang",
  "/chinh-sach-doi-tra",
  "/chinh-sach-bao-mat",
  "/huong-dan-chon-size",
]) {
  assert.equal((await fetch(base + path)).status, 200, path);
  results.push({ test: "GET " + path, status: "PASS" });
}
for (const a of credentials.accounts) {
  const r = await fetch(base + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: base },
    body: JSON.stringify({ email: a.email, password: a.password }),
  });
  assert.equal(r.status, 200, a.accountType + " login");
  const body = await r.json();
  const expected =
    a.accountType === "ADMIN"
      ? "/admin"
      : a.accountType === "SELLER"
        ? "/admin/don-hang"
        : "/tai-khoan";
  assert.equal(body.redirect, expected);
  const cookie = r.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const page = await fetch(base + expected, { headers: { cookie } });
  assert.equal(page.status, 200);
  const accounts = await (
    await fetch(base + "/admin/tai-khoan", { headers: { cookie } })
  ).text();
  assert.equal(
    accounts.includes("<h2>Quản lý tài khoản</h2>"),
    a.accountType === "ADMIN",
  );
  const finance = await fetch(base + "/api/analytics/report?section=finance", {
    headers: { cookie },
  });
  assert.equal(finance.status, a.accountType === "ADMIN" ? 200 : 403);
  const logout = await fetch(base + "/api/logout", {
    method: "POST",
    headers: { cookie, origin: base, "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(logout.status, 200);
  assert.equal((await logout.json()).redirect, "/dang-nhap");
  results.push({
    test:
      a.accountType +
      " login / correct interface / account & finance access / logout",
    status: "PASS",
    redirect: expected,
  });
}
await writeFile(
  "verification/final-uat/smoke.json",
  JSON.stringify(
    { at: new Date().toISOString(), localhostOnly: true, results },
    null,
    2,
  ),
);
console.log(
  `PASS ${results.length} local smoke groups; no orders created in the main database.`,
);
