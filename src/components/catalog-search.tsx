"use client";
import { LocalizedContent } from "@/components/localization";

import { useRouter } from "next/navigation";
export function CatalogSearch({ query }: { query: string }) {
  const router = useRouter();
  return (
    <LocalizedContent>
      {
        <form
          action="/tim-kiem"
          className="search-form catalog-search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = String(
              new FormData(e.currentTarget).get("q") ?? "",
            ).trim();
            router.push("/tim-kiem" + (q ? "?q=" + encodeURIComponent(q) : ""));
          }}
        >
          <input
            key={query}
            type="search"
            name="q"
            aria-label="Tìm sản phẩm"
            defaultValue={query}
            placeholder="Tìm theo tên, SKU, chất liệu hoặc bộ sưu tập"
          />
          <button className="button">TÌM KIẾM</button>
        </form>
      }
    </LocalizedContent>
  );
}
