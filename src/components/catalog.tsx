"use client";
import { LocalizedContent } from "@/components/localization";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import {
  categories,
  sizes,
  colors,
  materials,
  fits,
  occasions,
} from "@/lib/catalog";
export function CatalogFilters({
  count,
  categories: catalogCategories,
  options,
}: {
  count: number;
  categories: any[];
  options?: {
    sizes: string[];
    colors: string[];
    materials: string[];
    fits: string[];
    occasions: string[];
  };
}) {
  const p = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const currentCategory = catalogCategories.find(
    (c) => "/" + c.slug === pathname,
  );
  const routeCategory = currentCategory?.parentId
    ? catalogCategories.find((c) => c.id === currentCategory.parentId)
    : currentCategory;
  const categorySlug = p.get("category") ?? routeCategory?.slug ?? "";
  const subcategorySlug =
    p.get("subcategory") ??
    (currentCategory?.parentId ? currentCategory.slug : "");
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  function change(key: string, value: string) {
    const q = new URLSearchParams(p.toString());
    if (key === "category") q.delete("subcategory");
    if (value) q.set(key, value);
    else q.delete(key);
    q.delete("page");
    const nextPath =
      key === "category" && routeCategory
        ? value
          ? "/" + value
          : "/thoi-trang-cong-so"
        : key === "subcategory" && currentCategory?.parentId && routeCategory
          ? "/" + routeCategory.slug
          : pathname;
    if (key === "category" && routeCategory) q.delete("category");
    router.push(nextPath + "?" + q.toString(), { scroll: false });
  }
  const select = (
    key: string,
    label: string,
    options: { value: string; label: string }[],
  ) => (
    <label className="filter-field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={
          key === "category"
            ? categorySlug
            : key === "subcategory"
              ? subcategorySlug
              : (p.get(key) ?? "")
        }
        onChange={(e) => change(key, e.target.value)}
      >
        <option value="">Tất cả</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
  const filters = (
    <>
      <div className="between">
        <h3>Bộ lọc</h3>
        <button
          className="mobile-only icon-button"
          aria-label="Đóng bộ lọc"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
      </div>
      {select(
        "category",
        "Danh mục",
        catalogCategories
          .filter((c) => !c.parentId)
          .map((c) => ({ value: c.slug, label: c.name })),
      )}
      {select(
        "subcategory",
        "Danh mục con",
        catalogCategories
          .filter(
            (c) =>
              c.parentId &&
              (!categorySlug ||
                catalogCategories.find((root) => root.slug === categorySlug)
                  ?.id === c.parentId),
          )
          .map((c) => ({ value: c.slug, label: c.name })),
      )}
      <label className="filter-field">
        <span>Khoảng giá</span>
        <select
          aria-label="Khoảng giá"
          value={[p.get("min") ?? "", p.get("max") ?? ""].join("-")}
          onChange={(e) => {
            const [min, max] = e.target.value.split("-");
            const q = new URLSearchParams(p.toString());
            q.delete("page");
            min ? q.set("min", min) : q.delete("min");
            max ? q.set("max", max) : q.delete("max");
            router.push(pathname + "?" + q.toString(), { scroll: false });
          }}
        >
          {[
            ["-", "Tất cả mức giá"],
            ["0-299999", "Dưới 300.000đ"],
            ["300000-500000", "300.000–500.000đ"],
            ["500000-800000", "500.000–800.000đ"],
            ["800000-1200000", "800.000–1.200.000đ"],
            ["1200001-", "Trên 1.200.000đ"],
          ].map((o) => (
            <option key={o[0]} value={o[0]}>
              {o[1]}
            </option>
          ))}
        </select>
      </label>
      <form
        className="price-range"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const q = new URLSearchParams(p.toString());
          for (const k of ["min", "max"]) {
            const v = String(f.get(k) ?? "");
            v ? q.set(k, v) : q.delete(k);
          }
          q.delete("page");
          router.push(pathname + "?" + q.toString(), { scroll: false });
        }}
      >
        <input
          name="min"
          aria-label="Giá tối thiểu"
          title="VND"
          placeholder="Từ (VND)"
          type="number"
          min="0"
          key={"min-" + (p.get("min") ?? "")}
          defaultValue={p.get("min") ?? ""}
        />
        <input
          name="max"
          aria-label="Giá tối đa"
          title="VND"
          placeholder="Đến (VND)"
          type="number"
          min="0"
          key={"max-" + (p.get("max") ?? "")}
          defaultValue={p.get("max") ?? ""}
        />
        <button aria-label="Áp dụng khoảng giá">→</button>
      </form>
      <div className="filter-field">
        <span>Kích cỡ</span>
        <div className="filter-sizes">
          {(options?.sizes ?? [...sizes, "Free size"]).map((s) => (
            <button
              key={s}
              className={p.get("size") === s ? "chosen" : ""}
              onClick={() => change("size", p.get("size") === s ? "" : s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {select(
        "color",
        "Màu sắc",
        (options?.colors ?? colors.map((c) => c[0])).map((c) => ({
          value: c,
          label: c,
        })),
      )}
      {select(
        "material",
        "Chất liệu",
        (options?.materials ?? materials).map((s) => ({ value: s, label: s })),
      )}
      {select(
        "fit",
        "Phom dáng",
        (options?.fits ?? fits).map((s) => ({ value: s, label: s })),
      )}
      {select(
        "occasion",
        "Dịp sử dụng",
        (options?.occasions ?? occasions).map((s, i) => ({
          value: s,
          label: options
            ? s
            : [
                "Đi làm hằng ngày",
                "Họp đối tác",
                "Sự kiện trang trọng",
                "Thuyết trình",
                "Công sở thoải mái",
              ][i],
        })),
      )}
      {[
        ["stock", "Còn hàng"],
        ["sale", "Đang ưu đãi"],
        ["new", "Hàng mới"],
      ].map(([k, l]) => (
        <label className="check-label" key={k}>
          <input
            type="checkbox"
            checked={p.has(k)}
            onChange={(e) => change(k, e.target.checked ? "1" : "")}
          />
          {l}
        </label>
      ))}
      <button
        className="text-link reset-filter"
        onClick={() => router.push(pathname)}
      >
        Xóa tất cả bộ lọc
      </button>
    </>
  );
  return (
    <LocalizedContent>
      {
        <>
          <div className="catalog-toolbar">
            <button
              className="mobile-filter text-link"
              onClick={() => setOpen(!open)}
            >
              <SlidersHorizontal size={17} /> Bộ lọc
            </button>
            <span>{count} thiết kế</span>
            <label>
              Sắp xếp:{" "}
              <select
                aria-label="Sắp xếp"
                value={p.get("sort") ?? ""}
                onChange={(e) => change("sort", e.target.value)}
              >
                {[
                  ["", "Mới nhất"],
                  ["popular", "Bán chạy"],
                  ["price-asc", "Giá thấp đến cao"],
                  ["price-desc", "Giá cao đến thấp"],
                  ["name", "Tên A–Z"],
                ].map((o) => (
                  <option key={o[0]} value={o[0]}>
                    {o[1]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <aside className="filter-sidebar">{filters}</aside>
          {open && (
            <dialog
              aria-label="Bộ lọc sản phẩm"
              ref={dialog}
              className="filter-dialog"
              onCancel={() => setOpen(false)}
            >
              <aside>{filters}</aside>
            </dialog>
          )}
        </>
      }
    </LocalizedContent>
  );
}
