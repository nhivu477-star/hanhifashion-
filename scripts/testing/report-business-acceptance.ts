import { readFile, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = "verification/business-acceptance/";
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const spec = await read("docs/business-acceptance-31.json");
const sources: Record<string, string> = {
  order: "verification/order-results.json",
  shipping: "verification/shipping-results.json",
  returns: "verification/returns-results.json",
  rbac: "verification/authorization-results.json",
  quality: "verification/catalog-operations-results.json",
  analytics: "verification/analytics-results.json",
  business: root + "business-results.json",
};
const records: Record<
  string,
  { test: string; status: string; error?: string }[]
> = {};
const databases = new Set<string>();
for (const [group, path] of Object.entries(sources)) {
  const data = await read(path);
  databases.add(data.database);
  records[group] = data.results;
}
const browserPath = "verification/final-uat/browser-results.json",
  browser = await read(browserPath),
  fixturePath = "verification/final-uat/fixtures.json";
if ((await stat(browserPath)).mtimeMs < (await stat(fixturePath)).mtimeMs)
  throw Error("Browser evidence is older than the current isolated fixture");
records.browser = [];
function visit(suite: any) {
  for (const item of suite.specs ?? [])
    for (const test of item.tests ?? []) {
      const last = test.results.at(-1);
      records.browser.push({
        test: item.title,
        status: last?.status === "passed" ? "PASS" : "FAIL",
        ...(last?.error ? { error: last.error.message } : {}),
      });
    }
  for (const child of suite.suites ?? []) visit(child);
}
for (const suite of browser.suites ?? []) visit(suite);
const unit = await read(root + "unit-results.json"),
  checks = await read(root + "checks.json"),
  preservation = await read(root + "data-preservation.json");
const failures = Object.entries(records).flatMap(([group, rows]) =>
  rows.filter((r) => r.status !== "PASS").map((r) => `${group}:${r.test}`),
);
const globalGates = {
  sameIsolatedApiDatabase: databases.size === 1,
  allIntegrationTestsPass: failures.length === 0,
  unitTestsPass:
    unit.numFailedTests === 0 &&
    unit.numPendingTests === 0 &&
    unit.numPassedTests > 0,
  browserTestsPass:
    browser.stats.unexpected === 0 &&
    browser.stats.skipped === 0 &&
    records.browser.length > 0,
  staticChecksPass: checks.every((c: any) => c.exitCode === 0),
  mainHistoryPreserved:
    preservation.businessHistoryEqual === true &&
    preservation.foreignKeys.length === 0 &&
    preservation.integrity[0][0] === "ok",
};
const gatesPass = Object.values(globalGates).every(Boolean);
function find(expression: string) {
  const split = expression.indexOf(":"),
    group = expression.slice(0, split),
    pattern = new RegExp(expression.slice(split + 1));
  return (records[group] ?? []).filter((r) => pattern.test(r.test));
}
const useCases = spec.useCases.map((u: any) => {
  const evidence = u.requiredEvidence.map((expression: string) => {
    const matches = find(expression);
    return {
      expression,
      matches: matches.map((m) => m.test),
      status:
        matches.length > 0 && matches.every((m) => m.status === "PASS")
          ? "PASS"
          : "FAIL",
    };
  });
  const status =
    gatesPass && evidence.every((e: any) => e.status === "PASS")
      ? "PASS"
      : "FAIL";
  return {
    id: u.id,
    name: u.name,
    status,
    scope: u.applicableScope,
    criteria: u.acceptanceCriteria.map((c: any) => ({
      id: c.id,
      group: c.group,
      status,
    })),
    evidence,
  };
});
const blocked = spec.blockedScenarios.map((b: any) => ({
  ...b,
  safetyGateVerified: find(b.gateTest).some((r) => r.status === "PASS"),
}));
const report = {
  generatedAt: new Date().toISOString(),
  scope: spec.scope,
  buildId: (await readFile(".next-production/BUILD_ID", "utf8")).trim(),
  specificationSha256: createHash("sha256")
    .update(JSON.stringify(spec))
    .digest("hex"),
  apiDatabase: [...databases][0],
  browserDatabase: (await read(fixturePath)).database,
  globalGates,
  summary: {
    useCases: useCases.length,
    pass: useCases.filter((u: any) => u.status === "PASS").length,
    fail: useCases.filter((u: any) => u.status === "FAIL").length,
    blockedBranches: blocked.length,
    acceptanceGroups: useCases.reduce(
      (n: number, u: any) => n + u.criteria.length,
      0,
    ),
    unitPassed: unit.numPassedTests,
    integrationPassed: Object.entries(records)
      .filter(([k]) => k !== "browser")
      .reduce(
        (n, [, rows]) => n + rows.filter((r) => r.status === "PASS").length,
        0,
      ),
    browserPassed: records.browser.filter((r) => r.status === "PASS").length,
  },
  useCases,
  blocked,
  failures,
};
await writeFile(
  root + "acceptance-results.json",
  JSON.stringify(report, null, 2) + "\n",
);
const s = report.summary;
const text = `# Kết quả nghiệm thu nghiệp vụ HÀ NHI\n\nCập nhật: ${report.generatedAt}. Bộ chuẩn thực thi tại [31 Use Case](business-acceptance-31.md) và [dữ liệu tiêu chí](business-acceptance-31.json).\n\n## Phạm vi đã kiểm\n\n**${s.pass}/${s.useCases} PASS, ${s.fail} FAIL** trong phạm vi local đã điều chỉnh cho cửa hàng; ${s.acceptanceGroups} nhóm tiêu chí main/alternative/exception/permission/integrity/UI–API–DB. Các nhánh chưa có chính sách hoặc ngoài phạm vi được ghi riêng là BLOCKED, không tính thành nghiệp vụ đã triển khai.\n\n- Unit: ${s.unitPassed} PASS.\n- API/integration/concurrency/fault injection/regression: ${s.integrationPassed} PASS.\n- E2E trình duyệt: ${s.browserPassed} PASS; kiểm tra responsive 360/390/768/1024/1440px và thao tác form thật.\n- TypeScript, ESLint và production build: ${globalGates.staticChecksPass ? "PASS" : "FAIL"}; build ${report.buildId}.\n- Main: lịch sử nghiệp vụ giữ nguyên; integrity/FK: ${globalGates.mainHistoryPreserved ? "PASS" : "FAIL"}. Hoạt động duyệt trang có thể cập nhật VisitorSession/AnalyticsEvent, được tách khỏi đối chiếu lịch sử nghiệp vụ.\n\n## Thay đổi chính\n\n- Receipt giỏ độc lập analytics; kiểm payload key checkout, giới hạn lượng, báo lỗi khoảng giá và giỏ clear scoped theo người dùng. Giữ màu/size/lượng khi quay lại sau đăng nhập.\n- Giao dịch DB và audit atomic cho catalog, voucher, cài đặt, hồ sơ/địa chỉ, nhân viên và các nghiệp vụ tồn/tiền; lỗi ghi audit rollback đã được chủ động kiểm thử.\n- Checklist SKU/màu/size/lượng, tạm dừng đóng gói, packedAt/packedBy trước bàn giao; phân công và ưu tiên đơn.\n- Phiếu kiểm kê nháp/gửi/duyệt/hủy, so tồn trước–sau; chặn kiểm kê cũ ghi đè giao dịch mới; tách hàng hỏng khỏi tồn bán được.\n- Đánh giá xác minh đơn đã nhận, trả lời/kiểm duyệt có lịch sử; hỗ trợ theo tài khoản và phản hồi đúng khách. SELLER chỉ được bổ sung quyền hỗ trợ phi tài chính.\n- Hồ sơ khách, địa chỉ mặc định, lịch sử mua/hỗ trợ; start/end voucher giờ VN; Excel .xlsx thật cùng scope/quyền với CSV; hướng dẫn chính sách bổ sung giữ rule lỗi 72 giờ.\n- Sửa khôi phục mật khẩu local và cập nhật mật khẩu/thu hồi phiên atomic; đăng nhập thành công không bị tính thành chuỗi đăng nhập sai.\n\n## Ma trận 31 Use Case\n\n| Use Case | Nghiệp vụ | Trạng thái |\n|---|---|---|\n${useCases.map((u: any) => `| ${u.id} | ${u.name} | ${u.status} |`).join("\n")}\n\n## BLOCKED và giới hạn còn lại\n\n${blocked.map((b: any) => `- **${b.id}:** ${b.reason} Chốt từ chối an toàn đã kiểm: ${b.safetyGateVerified ? "PASS" : "FAIL"}.`).join("\n")}\n\nĐã kiểm trên SQLite local và database thử nghiệm riêng; kết quả không chứng minh tải production nhiều instance, tính hợp pháp của nguồn hàng/ảnh, tiền thật hoặc vận chuyển thật. Không reset main, không push/deploy.\n\n## Bằng chứng và tái chạy\n\n- \`npm run test:business\`: tạo DB thử riêng, migrate, production build, toàn bộ API/integration và BA-* (bao gồm concurrency và fault injection).\n- \`npx tsx scripts/testing/run-uat-browser.ts\`: clone main thành DB riêng, E2E và kiểm backup/restore.\n- \`npm test\`, \`npm run lint\`, \`npx tsc --noEmit\`.\n- \`verification/business-acceptance/acceptance-results.json\`: từng nhóm tiêu chí và bằng chứng theo tên bài kiểm thử, kiểm gate và database.\n- \`verification/business-acceptance/integration-final.log\`, \`e2e.log\`, \`unit-results.json\`, \`data-preservation.json\`: kết quả thực thi.\n`;
await writeFile("docs/business-acceptance-report.md", text);
console.log(JSON.stringify(report.summary));
if (s.fail > 0 || !gatesPass) process.exitCode = 1;
