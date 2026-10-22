import { readFile, writeFile } from "node:fs/promises";
const fixture = JSON.parse(
  await readFile("verification/phase1-fixtures.json", "utf8"),
);
const results = [];
for (const route of [
  "/",
  "/hang-moi",
  "/trang-phuc",
  "/giay",
  "/tui-xach",
  "/phu-kien",
  "/bo-suu-tap",
  "/sale",
  "/tim-kiem?q=Ricci",
  "/tim-kiem?q=NO_MATCH_PHASE5",
  "/san-pham/ls-yeri-dress",
  "/yeu-thich",
  "/gio-hang",
  "/thanh-toan",
  "/dang-nhap",
  "/dang-ky",
  "/quen-mat-khau",
  "/tra-cuu-don-hang",
  "/lien-he",
  "/gioi-thieu",
  "/chinh-sach-bao-mat",
  "/dieu-khoan-su-dung",
  "/chinh-sach-giao-hang",
  "/chinh-sach-doi-tra",
]) {
  const start = performance.now();
  const r = await fetch("http://127.0.0.1:3000" + route);
  const text = await r.text();
  results.push({
    route,
    status: r.status,
    bytes: Buffer.byteLength(text),
    ms: performance.now() - start,
    hasMain: text.includes("<main"),
    notFound: text.includes("NEXT_HTTP_ERROR_FALLBACK;404"),
  });
}
for (const route of ["/tai-khoan", "/tai-khoan/don-hang"]) {
  const r = await fetch("http://127.0.0.1:3101" + route, {
    headers: {
      cookie:
        "hn_session=" +
        fixture.users.find((u: any) => u.name === "alice").token,
    },
  });
  const text = await r.text();
  results.push({
    route: "authenticated " + route,
    status: r.status,
    bytes: Buffer.byteLength(text),
    hasMain: text.includes("<main"),
    notFound: text.includes("NEXT_HTTP_ERROR_FALLBACK;404"),
  });
}
await writeFile(
  "verification/phase5-route-smoke.json",
  JSON.stringify(results, null, 2),
);
console.log(
  results.map((r) => ({
    route: r.route,
    status: r.status,
    notFound: r.notFound,
  })),
);
if (results.some((r) => r.status !== 200 || r.notFound)) process.exitCode = 1;
