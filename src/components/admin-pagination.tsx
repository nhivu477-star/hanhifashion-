import { LocalizedContent } from "@/components/localization";
import Link from "next/link";
import { Params, scalar } from "@/lib/queries";
export const adminPage = (q: Params) =>
  Math.min(100000, Math.max(1, Math.floor(Number(scalar(q.page)) || 1)));
export function AdminPagination({
  query,
  page,
  count,
  size = 24,
  label = "Phân trang quản trị",
}: {
  query: Params;
  page: number;
  count: number;
  size?: number;
  label?: string;
}) {
  const href = (n: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(query))
      if (k !== "page" && v) p.set(k, scalar(v));
    p.set("page", String(n));
    return "?" + p;
  };
  return (
    <LocalizedContent>
      {
        <nav className="pagination" aria-label={label}>
          {page > 1 && <Link href={href(page - 1)}>Trang trước</Link>}
          <span>
            Trang {page} / {Math.max(1, Math.ceil(count / size))} · {count} bản
            ghi
          </span>
          {page * size < count && <Link href={href(page + 1)}>Trang tiếp</Link>}
        </nav>
      }
    </LocalizedContent>
  );
}
