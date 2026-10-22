import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { StocktakeCreateForm } from "./stocktakes-client";
import { SimpleForm } from "./store";
export async function Stocktakes({ role }: { role: string }) {
  if (!can(role, "inventory.movements.read")) return null;
  const records = await db.stocktake.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: { lines: { include: { variant: { select: { sku: true } } } } },
  });
  const labels: Record<string, string> = {
    DRAFT: "Nháp",
    SUBMITTED: "Chờ xác nhận",
    APPROVED: "Đã điều chỉnh",
    CANCELLED: "Đã hủy",
  };
  return (
    <section className="stocktake-panel">
      <h2>Kiểm kê và chênh lệch kho</h2>
      {can(role, "inventory.adjust") && <StocktakeCreateForm />}
      {records.map((r) => (
        <details key={r.id}>
          <summary>
            {r.createdAt.toLocaleDateString("vi-VN")} · {labels[r.status]} ·{" "}
            {r.lines.length} SKU
          </summary>
          <p>{r.reason}</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Sổ sách</th>
                  <th>Bán được thực tế</th>
                  <th>Chênh lệch</th>
                  <th>Hỏng cách ly</th>
                </tr>
              </thead>
              <tbody>
                {r.lines.map((l) => (
                  <tr key={l.id}>
                    <td>{l.variant.sku}</td>
                    <td>{l.bookStock}</td>
                    <td>{l.countedStock}</td>
                    <td>{l.countedStock - l.bookStock}</td>
                    <td>{l.damagedStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {can(role, "inventory.adjust") &&
            ["DRAFT", "SUBMITTED"].includes(r.status) && (
              <SimpleForm
                action="admin/stocktakes/status"
                initial={{
                  id: r.id,
                  status: r.status === "DRAFT" ? "SUBMITTED" : "APPROVED",
                }}
                submit="Cập nhật phiếu kiểm kê"
                fields={[
                  {
                    name: "status",
                    label: "Xử lý kiểm kê",
                    type: "select",
                    options: [
                      {
                        value: r.status === "DRAFT" ? "SUBMITTED" : "APPROVED",
                        label:
                          r.status === "DRAFT"
                            ? "Gửi xác nhận"
                            : "Xác nhận điều chỉnh",
                      },
                      { value: "CANCELLED", label: "Hủy phiếu" },
                    ],
                  },
                  { name: "reason", label: "Lý do xử lý kiểm kê" },
                ]}
              />
            )}
        </details>
      ))}
      {!records.length && <p>Chưa có phiếu kiểm kê.</p>}
    </section>
  );
}
