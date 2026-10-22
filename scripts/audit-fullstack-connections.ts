import ts from "typescript";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
const files = readdirSync("src/components")
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => "src/components/" + f)
  .concat(["src/app/[[...path]]/page.tsx"]);
const found: { file: string; action: string; source: string }[] = [];
for (const file of files) {
  const sf = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const visit = (n: ts.Node) => {
    if (
      ts.isCallExpression(n) &&
      n.expression.getText(sf) === "api" &&
      n.arguments[0] &&
      ts.isStringLiteral(n.arguments[0])
    )
      found.push({
        file,
        action: n.arguments[0].text.split("?")[0],
        source: "api",
      });
    if (
      ts.isJsxAttribute(n) &&
      n.name.getText(sf) === "action" &&
      n.initializer &&
      ts.isStringLiteral(n.initializer)
    )
      found.push({ file, action: n.initializer.text, source: "form" });
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
const route = readFileSync("src/app/api/[...action]/route.ts", "utf8");
const literal = [...route.matchAll(/action === "([^"\n]+)"/g)].map((m) => m[1]);
const targets = [...route.matchAll(/target === "([^"\n]+)"/g)].map(
  (m) => "admin/" + m[1],
);
const service = [
  "admin/color",
  "admin/outfit",
  "admin/size-chart",
  "admin/accounts/create",
  "admin/accounts/update",
  "admin/accounts/type",
  "admin/accounts/status",
  "admin/shipping/create",
  "admin/shipping/status",
  "admin/shipping/collection",
  "admin/shipping/remittance",
  "admin/shipping/reconcile",
  "admin/returns/status",
  "admin/returns/inspect",
  "admin/returns/exchange",
  "admin/returns/exchange-status",
  "admin/returns/refund",
  "admin/returns/refund-status",
  "admin/staff/create",
  "admin/staff/update",
  "admin/staff/role",
  "admin/staff/status",
];
const results = found.map((f) => ({
  ...f,
  connected:
    literal.includes(f.action) ||
    targets.includes(f.action) ||
    service.includes(f.action) ||
    f.action === "/tim-kiem",
}));
const report = {
  references: results.length,
  uniqueActions: [...new Set(results.map((r) => r.action))],
  unresolved: results.filter((r) => !r.connected),
  results,
  notes: [
    "Static API/SimpleForm calls; dynamic operations reviewed separately in shipping/returns/staff forms.",
    "Separate preferences and admin/currencies routes are covered by integration/E2E tests.",
    "Legacy GHN endpoints intentionally disabled; no carrier integration created.",
  ],
};
writeFileSync(
  "verification/fullstack/connections.json",
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify(
    { references: report.references, unresolved: report.unresolved },
    null,
    2,
  ),
);
