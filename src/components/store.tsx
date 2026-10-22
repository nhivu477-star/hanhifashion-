"use client";
import { regions } from "@/lib/localization/config";
import { LocalizedContent, usePreferences } from "@/components/localization";

import { PasswordField } from "./password-field";
import { ShipmentTimeline } from "./shipment-timeline";
import { useProductSelection } from "./product-selection";
import { SizeAdvisor } from "./size-advisor";
import { decodeChart } from "@/lib/sizing";
import { BrandLogo } from "./brand-logo";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  UserRound,
  Heart,
  ShoppingBag,
  Menu,
  X,
  ArrowRight,
  Plus,
  Minus,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Phone,
  LayoutDashboard,
} from "lucide-react";
import { officialContacts, type NavigationCategory } from "@/lib/taxonomy";
import {
  categories,
  effectivePrice,
  money,
  sizes,
  colors,
  statusLabels,
} from "@/lib/catalog";
export async function api(action: string, body?: unknown) {
  const r = await fetch("/api/" + action, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json();
  if (r.status === 401 && data.redirect) window.location.assign(data.redirect);
  if (!r.ok) throw new Error(data.error ?? "Có lỗi xảy ra.");
  return data;
}
export function Header({
  managementHref,
  announcement,
  navigation,
  contactPhone,
}: {
  managementHref?: string;
  announcement: string;
  navigation: NavigationCategory[];
  contactPhone?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();
  const [suggestions, setSuggestions] = useState(false);
  const [selectedResult, setSelectedResult] = useState(-1);
  const [searchError, setSearchError] = useState("");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState(urlParams.get("q") ?? "");
  const [results, setResults] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const update = () =>
      api("cart")
        .then((c) =>
          setCount(
            c?.items?.reduce((n: number, i: any) => n + i.quantity, 0) ?? 0,
          ),
        )
        .catch(() => {});
    update();
    window.addEventListener("cart-change", update);
    return () => window.removeEventListener("cart-change", update);
  }, []);
  useEffect(() => {
    setSelectedResult(-1);
    setSearchError("");
    if (!q.trim()) {
      setLoading(false);
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(
      () =>
        api("search?suggest=1&q=" + encodeURIComponent(q))
          .then((r) => {
            if (!cancelled) setResults(r.products.slice(0, 4));
          })
          .catch(() => {
            if (!cancelled) {
              setResults([]);
              setSearchError(
                "Không tải được gợi ý. Nàng có thể nhấn Enter để tìm kiếm.",
              );
            }
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          }),
      250,
    );
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);
  useEffect(() => {
    if (open || search) {
      if (!dialog.current?.open) dialog.current?.showModal();
      if (search)
        dialog.current
          ?.querySelector<HTMLInputElement>("input[name=q]")
          ?.focus();
    } else dialog.current?.close();
  }, [open, search]);
  useEffect(() => {
    setSuggestions(false);
  }, [pathname]);
  useEffect(() => {
    const dismiss = () => {
      setOpen(false);
      setSearch(false);
      setSuggestions(false);
    };
    window.addEventListener("popstate", dismiss);
    return () => window.removeEventListener("popstate", dismiss);
  }, []);
  useEffect(() => {
    if (pathname === "/tim-kiem") {
      setQ(urlParams.get("q") ?? "");
      setSuggestions(false);
    }
  }, [pathname, urlParams]);
  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    close();
    setSuggestions(false);
    router.push(
      "/tim-kiem" + (q.trim() ? "?q=" + encodeURIComponent(q.trim()) : ""),
    );
  }
  function searchKeys(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setSuggestions(false);
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestions(true);
      setSelectedResult((i) =>
        results.length
          ? i < 0
            ? e.key === "ArrowDown"
              ? 0
              : results.length - 1
            : (i + (e.key === "ArrowDown" ? 1 : -1) + results.length) %
              results.length
          : -1,
      );
    } else if (
      e.key === "Enter" &&
      selectedResult >= 0 &&
      results[selectedResult]
    ) {
      e.preventDefault();
      close();
      setSuggestions(false);
      router.push("/san-pham/" + results[selectedResult].slug);
    }
  }
  const close = () => {
    setOpen(false);
    setSearch(false);
    setSelectedResult(-1);
  };
  return (
    <LocalizedContent>
      {
        <>
          <header className="header reference-header">
            <div className="header-main">
              <div className="header-brand-group">
                <button
                  className="menu-toggle icon-button"
                  aria-label="Mở menu"
                  aria-expanded={open}
                  aria-controls="store-navigation"
                  onClick={() => {
                    setOpen(true);
                  }}
                >
                  <Menu size={24} strokeWidth={1.5} />
                </button>
                <Link
                  className="wordmark"
                  href="/"
                  aria-label="HÀ NHI FASHION trang chủ"
                >
                  <BrandLogo />
                </Link>
              </div>
              <form
                className="header-search"
                action="/tim-kiem"
                role="search"
                onSubmit={submitSearch}
              >
                <label htmlFor="header-search-input">TÌM KIẾM</label>
                <input
                  id="header-search-input"
                  name="q"
                  type="search"
                  autoComplete="off"
                  value={q}
                  onFocus={() => setSuggestions(true)}
                  onKeyDown={searchKeys}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setSuggestions(true);
                  }}
                  aria-label="Tìm kiếm thiết kế"
                />
                <button
                  className="icon-button"
                  aria-label="Mở tìm kiếm"
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setSearch(true);
                  }}
                >
                  <Search size={23} strokeWidth={1.5} />
                </button>
                {q.trim() && suggestions && !search && !open && (
                  <div className="header-search-suggestions">
                    {searchError ? (
                      <p role="alert">{searchError}</p>
                    ) : loading ? (
                      <p>Đang tìm thiết kế...</p>
                    ) : results.length ? (
                      results.map((p, index) => (
                        <Link
                          className={
                            "suggestion" +
                            (selectedResult === index ? " selected" : "")
                          }
                          key={p.id}
                          href={"/san-pham/" + p.slug}
                          onClick={() => setSuggestions(false)}
                        >
                          <img src={p.images[0]?.url} alt={p.name} />
                          <span>
                            {p.name}
                            <br />
                            {money(p.salePrice ?? p.price)}
                          </span>
                        </Link>
                      ))
                    ) : (
                      <p>Chưa tìm thấy thiết kế phù hợp.</p>
                    )}
                  </div>
                )}
              </form>
              <div className="header-actions">
                {managementHref ? (
                  <Link
                    className="header-management"
                    href={managementHref}
                    aria-label="← Về trang quản lý"
                    title="Về trang quản lý"
                  >
                    <LayoutDashboard size={22} strokeWidth={1.5} />
                    <span>Về trang quản lý</span>
                  </Link>
                ) : (
                  <a
                    className="header-contact"
                    href={
                      "tel:" + (contactPhone || officialContacts.contactPhone)
                    }
                  >
                    <Phone size={22} strokeWidth={1.5} />
                    <span>Gọi ngay</span>
                  </a>
                )}
                <Link
                  className="header-account"
                  href="/tai-khoan"
                  aria-label="Tài khoản"
                >
                  <UserRound size={22} strokeWidth={1.5} />
                  <span>Tài khoản</span>
                </Link>
                <button
                  className="mobile-only icon-button"
                  aria-label="Tìm kiếm"
                  onClick={() => {
                    setOpen(false);
                    setSearch(true);
                  }}
                >
                  <Search size={22} strokeWidth={1.5} />
                </button>
                <Link
                  className="bag"
                  href="/gio-hang"
                  aria-label={`Giỏ hàng ${count} sản phẩm`}
                >
                  <ShoppingBag size={23} strokeWidth={1.5} />
                  <span>{count}</span>
                </Link>
                <Link
                  className="header-wishlist"
                  href="/yeu-thich"
                  aria-label="Sản phẩm yêu thích"
                >
                  <Heart size={23} strokeWidth={1.5} />
                </Link>
              </div>
            </div>
          </header>
          <dialog
            ref={dialog}
            aria-label={open ? "Menu danh mục" : "Tìm kiếm thiết kế"}
            className={"nav-dialog " + (open ? "drawer" : "search-dialog")}
            onCancel={close}
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <button
              className="dialog-close icon-button"
              aria-label="Đóng"
              onClick={close}
            >
              <X />
            </button>
            {open ? (
              <nav
                id="store-navigation"
                className="drawer-links"
                aria-label="Điều hướng chính"
              >
                <Link
                  href="/"
                  onClick={close}
                  className="wordmark drawer-wordmark"
                >
                  <BrandLogo />
                </Link>
                <Link onClick={close} href="/bo-suu-tap">
                  Bộ sưu tập <ArrowRight size={16} />
                </Link>
                <Link onClick={close} href="/hang-moi">
                  Hàng mới <ArrowRight size={16} />
                </Link>
                <details className="drawer-group">
                  <summary>
                    Thời trang nữ <ChevronDown size={18} />
                  </summary>
                  <div className="drawer-submenu">
                    <Link onClick={close} href="/tat-ca">
                      Xem tất cả thiết kế
                    </Link>
                    {navigation.map((c) => (
                      <div key={c.id} className="drawer-category">
                        {c.children?.length ? (
                          <details>
                            <summary>
                              {c.name}
                              <ChevronDown size={16} />
                            </summary>
                            <div className="drawer-submenu">
                              <Link onClick={close} href={"/" + c.slug}>
                                Tất cả {c.name.toLowerCase()}
                              </Link>
                              {c.children.map((child) => (
                                <Link
                                  key={child.id}
                                  onClick={close}
                                  href={
                                    "/" + c.slug + "?subcategory=" + child.slug
                                  }
                                >
                                  {child.name}
                                </Link>
                              ))}
                            </div>
                          </details>
                        ) : (
                          <Link onClick={close} href={"/" + c.slug}>
                            {c.name}
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
                <details className="drawer-group">
                  <summary>
                    Cảm hứng phối đồ <ChevronDown size={18} />
                  </summary>
                  <div className="drawer-submenu">
                    {[
                      ["new-season", "Mùa mới"],
                      ["statement", "Dấu ấn cá tính"],
                      ["essentials", "Thiết kế hằng ngày"],
                    ].map(([slug, label]) => (
                      <Link
                        key={slug}
                        onClick={close}
                        href={"/bo-suu-tap/" + slug}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </details>
                <Link className="sale-link" onClick={close} href="/sale">
                  Ưu đãi <ArrowRight size={16} />
                </Link>
                <Link onClick={close} href="/gioi-thieu">
                  Câu chuyện HÀ NHI <ArrowRight size={16} />
                </Link>
                <details className="drawer-group">
                  <summary>
                    Thông tin & hỗ trợ <ChevronDown size={18} />
                  </summary>
                  <div className="drawer-submenu">
                    {[
                      ["huong-dan-chon-size", "Hướng dẫn chọn size"],
                      ["chinh-sach-giao-hang", "Chính sách giao hàng"],
                      ["chinh-sach-doi-tra", "Chính sách đổi trả"],
                      ["tra-cuu-don-hang", "Tra cứu đơn hàng"],
                      ["lien-he", "Liên hệ"],
                    ].map(([slug, label]) => (
                      <Link key={slug} onClick={close} href={"/" + slug}>
                        {label}
                      </Link>
                    ))}
                  </div>
                </details>
                <Link onClick={close} href="/cai-dat-hien-thi">
                  Cài đặt hiển thị
                </Link>
                <div className="drawer-utilities">
                  <Link onClick={close} href="/tai-khoan">
                    <UserRound size={18} /> Tài khoản
                  </Link>
                  <Link onClick={close} href="/yeu-thich">
                    <Heart size={18} /> Sản phẩm yêu thích
                  </Link>
                </div>
                <p className="drawer-announcement">{announcement}</p>
              </nav>
            ) : (
              <div>
                <h2>Tìm một thiết kế cho nàng</h2>
                <form
                  className="search-form"
                  action="/tim-kiem"
                  onSubmit={submitSearch}
                >
                  <input
                    name="q"
                    aria-label="Từ khóa tìm kiếm"
                    placeholder="Tên sản phẩm, chất liệu, mã SKU..."
                    value={q}
                    onKeyDown={searchKeys}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Xóa tìm kiếm"
                    onClick={() => setQ("")}
                  >
                    <X size={18} />
                  </button>
                  <button aria-label="Tìm kiếm" className="icon-button">
                    <Search />
                  </button>
                </form>
                {searchError ? (
                  <p role="alert">{searchError}</p>
                ) : loading ? (
                  <p>Đang tìm thiết kế...</p>
                ) : q && results.length === 0 ? (
                  <p>Chưa tìm thấy thiết kế phù hợp.</p>
                ) : (
                  results.map((p, index) => (
                    <Link
                      key={p.id}
                      href={"/san-pham/" + p.slug}
                      onClick={close}
                      className={
                        "suggestion" +
                        (selectedResult === index ? " selected" : "")
                      }
                    >
                      <img src={p.images[0]?.url} alt={p.name} />
                      <span>
                        {p.name}
                        <br />
                        {money(p.salePrice ?? p.price)}
                      </span>
                    </Link>
                  ))
                )}
                <p className="muted">Gợi ý: áo sơ mi · blazer · vải linen</p>
              </div>
            )}
          </dialog>
        </>
      }
    </LocalizedContent>
  );
}
export function SafeImage({
  src,
  alt,
  focalX = 50,
  focalY = 50,
  ...rest
}: {
  src: string;
  alt: string;
  [k: string]: any;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const source = failed || !src ? "/images/awaiting-photo.svg" : src;
  return (
    <LocalizedContent>
      {
        <Image
          {...rest}
          src={source}
          style={{ objectPosition: `${focalX}% ${focalY}%`, ...rest.style }}
          alt={alt || "Trang phục HÀ NHI"}
          width={rest.width ?? 512}
          height={rest.height ?? 683}
          sizes={
            rest.sizes ??
            "(max-width: 600px) 50vw, (max-width: 1024px) 33vw, 25vw"
          }
          unoptimized={source.endsWith(".svg")}
          onError={() => setFailed(true)}
        />
      }
    </LocalizedContent>
  );
}
export function WishButton({ id }: { id: string }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let list: string[] = [];
    try {
      list = JSON.parse(localStorage.getItem("hn_wishlist") || "[]");
    } catch {}
    setSaved(list.includes(id));
    api("wishlist")
      .then((r) => {
        if (r.some((i: any) => i.productId === id)) setSaved(true);
      })
      .catch(() => {});
  }, [id]);
  return (
    <LocalizedContent>
      {
        <button
          className={"wish icon-button " + (saved ? "saved" : "")}
          aria-label={saved ? "Bỏ yêu thích" : "Yêu thích sản phẩm"}
          aria-pressed={saved}
          title={error || undefined}
          onClick={async () => {
            const next = !saved;
            setSaved(next);
            let list: string[] = [];
            try {
              list = JSON.parse(localStorage.getItem("hn_wishlist") || "[]");
            } catch {}
            localStorage.setItem(
              "hn_wishlist",
              JSON.stringify(
                next
                  ? [...new Set([...list, id])]
                  : list.filter((x) => x !== id),
              ),
            );
            try {
              const s = await api("session");
              if (s.user)
                await api("wishlist", { productId: id, remove: !next });
              window.dispatchEvent(new Event("wishlist-change"));
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      }
    </LocalizedContent>
  );
}
export function ProductCard({ product: p }: { product: any }) {
  const href =
    "/san-pham/" +
    p.slug +
    (p.selectedColorId ? "?mau=" + p.selectedColorId : "");
  const relevantVariants = p.variants.filter(
    (v: any) => !p.selectedColorId || v.colorId === p.selectedColorId,
  );
  const inStock = relevantVariants.filter((v: any) => v.stock > 0);
  const prices = (inStock.length ? inStock : relevantVariants).map((v: any) =>
    effectivePrice(p, v),
  );
  const price = prices.length ? Math.min(...prices) : effectivePrice(p);
  const hasRange = new Set(prices).size > 1;
  const discount =
    p.salePrice && !relevantVariants.some((v: any) => v.priceOverride != null);
  return (
    <LocalizedContent>
      {
        <article className="product-card">
          <div className="product-picture">
            <Link href={href}>
              <SafeImage
                src={p.images[0]?.url ?? "/images/awaiting-photo.svg"}
                alt={p.name}
                focalX={p.images[0]?.mediaAsset?.focalX}
                focalY={p.images[0]?.mediaAsset?.focalY}
                loading="lazy"
              />
              {p.images[1] && (
                <SafeImage
                  className="second-image"
                  src={p.images[1].url}
                  focalX={p.images[1]?.mediaAsset?.focalX}
                  focalY={p.images[1]?.mediaAsset?.focalY}
                  alt={"Chi tiết " + p.name}
                  loading="lazy"
                />
              )}
            </Link>
            {p.isNew ? (
              <span className="product-badge">MỚI</span>
            ) : discount ? (
              <span className="product-badge">
                −{Math.round((1 - p.salePrice / p.price) * 100)}%
              </span>
            ) : null}
            <WishButton id={p.id} />
          </div>
          <p className="photo-brand-caption"><Link href="/nguon-anh">Ảnh tham khảo · Nguồn &amp; bản quyền</Link></p>
          <Link href={href} className="product-name">
            {p.name}
          </Link>
          <div className="price">
            {hasRange ? "Từ " : ""}
            {price > 0 ? money(price) : "Liên hệ"}{" "}
            {discount && <del>{money(p.price)}</del>}
          </div>
          <div className="swatches">
            {[
              ...new Map<string, any>(
                p.variants.map((v: any) => [v.color, v]),
              ).values(),
            ].map((v: any) => (
              <Link
                key={v.color}
                href={
                  "/san-pham/" + p.slug + (v.colorId ? "?mau=" + v.colorId : "")
                }
                aria-label={p.name + " — " + v.color}
                style={{ backgroundColor: v.colorHex }}
                title={v.color}
              />
            ))}
          </div>
        </article>
      }
    </LocalizedContent>
  );
}
export function ProductPurchase({ product: p }: { product: any }) {
  const router = useRouter();
  const { color, setColor, size, setSize } = useProductSelection();
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const addKey = useRef("");
  const addPayload = useRef("");
  const adding = useRef(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("hn_selection:" + p.id) ?? "null",
      );
      if (
        Number.isInteger(saved?.quantity) &&
        saved.quantity > 0 &&
        saved.quantity <= 99
      )
        setQuantity(saved.quantity);
    } catch {}
  }, [p.id]);
  const variant = p.variants.find(
    (v: any) => v.color === color && v.size === size,
  );
  const unique = [
    ...new Map<string, any>(p.variants.map((v: any) => [v.color, v])).values(),
  ];
  async function add(buy = false) {
    setError("");
    setMessage("");
    if (!variant) {
      setError("Nàng vui lòng chọn màu và kích cỡ.");
      return;
    }
    if (adding.current) return;
    adding.current = true;
    setBusy(true);
    try {
      try {
        sessionStorage.setItem(
          "hn_selection:" + p.id,
          JSON.stringify({ color, size, quantity }),
        );
      } catch {
        /* Local preferences are optional. */
      }
      const payload = variant.id + ":" + quantity;
      if (addPayload.current !== payload) {
        addPayload.current = payload;
        addKey.current = "";
      }
      addKey.current ||= crypto.randomUUID();
      await api("cart", {
        variantId: variant.id,
        quantity,
        increment: true,
        eventKey: addKey.current,
      });
      addKey.current = "";
      window.dispatchEvent(new Event("cart-change"));
      if (buy) router.push("/thanh-toan");
      else setMessage("Đã thêm thiết kế vào túi mua sắm.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      adding.current = false;
      setBusy(false);
    }
  }
  if (p.price <= 0)
    return (
      <LocalizedContent>
        {
          <div className="purchase">
            <p>Giá sản phẩm đang được cập nhật.</p>
            <Link className="button" href="/lien-he">
              Liên hệ tư vấn
            </Link>
          </div>
        }
      </LocalizedContent>
    );
  return (
    <LocalizedContent>
      {
        <div className="purchase">
          <p>
            Màu sắc: <strong>{color}</strong>
          </p>
          <div className="color-options">
            {unique.map((v: any) => (
              <button
                key={v.color}
                className={color === v.color ? "chosen" : ""}
                style={{ backgroundColor: v.colorHex }}
                title={v.color}
                aria-label={v.color}
                onClick={() => {
                  setColor(v.color);
                  setSize("");
                }}
              />
            ))}
          </div>
          <div className="between">
            <p>
              Kích cỡ: <strong>{size || "Chưa chọn"}</strong>
            </p>
          </div>
          <div className="size-options">
            {[...new Set<string>(p.variants.map((v: any) => v.size))]
              .sort(
                (a, b) =>
                  [...sizes, "Free size"].indexOf(a) -
                  [...sizes, "Free size"].indexOf(b),
              )
              .map((s) => {
                const v = p.variants.find(
                  (v: any) => v.color === color && v.size === s,
                );
                return (
                  <button
                    key={s}
                    className={s === size ? "chosen" : ""}
                    disabled={!v || !v.stock}
                    onClick={() => {
                      setSize(s);
                      setQuantity(1);
                    }}
                  >
                    {s}
                  </button>
                );
              })}
          </div>
          {p.sizeChart || p.category.sizeChart ? (
            <SizeAdvisor
              product={p}
              chart={decodeChart(p.sizeChart ?? p.category.sizeChart)}
            />
          ) : (
            <p className="small">
              <Link href="/lien-he">Liên hệ để được tư vấn kích cỡ</Link>
            </p>
          )}
          {variant && <p className="small muted">Mã biến thể: {variant.sku}</p>}
          <p className="muted">
            {variant
              ? `Còn ${variant.stock} sản phẩm`
              : "Chọn kích cỡ để kiểm tra tồn kho"}
          </p>
          <div className="quantity">
            <button
              className="icon-button"
              aria-label="Giảm số lượng"
              disabled={quantity <= 1}
              onClick={() => setQuantity(quantity - 1)}
            >
              <Minus size={16} />
            </button>
            <span>{quantity}</span>
            <button
              className="icon-button"
              aria-label="Tăng số lượng"
              disabled={!variant || busy}
              onClick={() => {
                if (quantity >= (variant?.stock ?? 0)) {
                  setError(`Chỉ còn ${variant?.stock ?? 0} sản phẩm trong kho. Không thể tăng thêm số lượng.`);
                  return;
                }
                setError("");
                setQuantity(quantity + 1);
              }}
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            className="button full"
            onClick={() => add()}
            disabled={busy || variant?.stock === 0}
          >
            THÊM VÀO GIỎ HÀNG <ShoppingBag size={18} />
          </button>
          <button
            className="button outline full"
            onClick={() => add(true)}
            disabled={busy || variant?.stock === 0}
          >
            MUA NGAY
          </button>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="success">
              {message} <Link href="/gio-hang">Xem giỏ hàng →</Link>
            </p>
          )}
        </div>
      }
    </LocalizedContent>
  );
}
export function Gallery({ images }: { images: any[] }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const start = useRef(0);
  const d = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (zoom) d.current?.showModal();
    else d.current?.close();
  }, [zoom]);
  return (
    <LocalizedContent>
      {
        <div className="gallery">
          <div
            className="gallery-main"
            onTouchStart={(e) => (start.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              const delta = e.changedTouches[0].clientX - start.current;
              if (Math.abs(delta) > 40)
                setIndex(
                  (index + (delta > 0 ? -1 : 1) + images.length) %
                    images.length,
                );
            }}
          >
            <button
              className="gallery-zoom"
              onClick={() => setZoom(true)}
              aria-label="Phóng to ảnh"
            >
              <SafeImage
                src={images[index]?.url}
                alt={images[index]?.alt}
                focalX={images[index]?.mediaAsset?.focalX}
                focalY={images[index]?.mediaAsset?.focalY}
                sizes="(max-width:768px) 100vw, 55vw"
              />
            </button>
            <button
              className="gallery-prev icon-button"
              hidden={images.length < 2}
              aria-label="Ảnh trước"
              onClick={() =>
                setIndex((index - 1 + images.length) % images.length)
              }
            >
              <ChevronLeft />
            </button>
            <button
              className="gallery-next icon-button"
              hidden={images.length < 2}
              aria-label="Ảnh tiếp theo"
              onClick={() => setIndex((index + 1) % images.length)}
            >
              <ChevronRight />
            </button>
          </div>
          <p className="photo-brand-caption"><Link href="/nguon-anh">Ảnh tham khảo · Nguồn &amp; bản quyền</Link></p>
          <div className="thumbnails">
            {images.map((img, i) => (
              <button
                key={img.id}
                className={i === index ? "chosen" : ""}
                onClick={() => setIndex(i)}
                aria-label={"Xem ảnh " + (i + 1)}
              >
                <SafeImage src={img.url} alt={img.alt} sizes="90px" />
              </button>
            ))}
          </div>
          <dialog
            className="zoom-dialog"
            ref={d}
            onCancel={() => setZoom(false)}
          >
            <button
              aria-label="Đóng ảnh"
              className="dialog-close icon-button"
              onClick={() => setZoom(false)}
            >
              <X />
            </button>
            <SafeImage
              src={images[index]?.url}
              alt={images[index]?.alt}
              focalX={images[index]?.mediaAsset?.focalX}
              focalY={images[index]?.mediaAsset?.focalY}
              sizes="(max-width:768px) 100vw, 55vw"
            />
          </dialog>
        </div>
      }
    </LocalizedContent>
  );
}
export function Newsletter({ text }: { text: string }) {
  return (
    <LocalizedContent>
      {
        <section className="newsletter">
          <div>
            <h2>Cảm hứng dành riêng cho nàng</h2>
            <p>{text}</p>
          </div>
          <SimpleForm
            action="newsletter"
            fields={[
              { name: "email", label: "Địa chỉ email của nàng", type: "email" },
            ]}
            submit="ĐĂNG KÝ NHẬN TIN"
          />
        </section>
      }
    </LocalizedContent>
  );
}
export type Field = {
  name: string;
  label: string;
  type?: string;
  value?: any;
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
};
export function SimpleForm({
  action,
  fields: suppliedFields,
  submit = "LƯU THAY ĐỔI",
  initial = {},
  onSuccess,
}: {
  action: string;
  fields: Field[];
  submit?: string;
  initial?: Record<string, any>;
  onSuccess?: (r: any) => void;
}) {
  const router = useRouter();
  const { preference } = usePreferences();
  const [addressCountry, setAddressCountry] = useState<keyof typeof regions>(
    initial.countryCode ?? preference.region,
  );
  useEffect(() => {
    if (action === "address" && !initial.id)
      setAddressCountry(preference.region);
  }, [action, initial.id, preference.region]);
  const format = regions[addressCountry] ?? regions.VN;
  const fields: Field[] =
    action === "address"
      ? [
          {
            name: "countryCode",
            label: "Quốc gia / Khu vực",
            value: addressCountry,
            options: Object.entries(regions).map(([value, r]) => ({
              value,
              label: r.name,
            })),
          },
          ...suppliedFields
            .filter((f) => !["countryCode", "postalCode"].includes(f.name))
            .map((f) =>
              f.name === "province"
                ? {
                    ...f,
                    label: format.province,
                    required: format.provinceRequired,
                  }
                : f.name === "ward"
                  ? { ...f, label: format.ward, required: format.wardRequired }
                  : f,
            ),
          {
            name: "postalCode",
            label: "Mã bưu chính",
            required: Boolean(format.postal),
          },
        ]
      : suppliedFields;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return (
    <LocalizedContent>
      {
        <form
          className="form"
          method="post"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setMessage("");
            const data: Record<string, any> = {
              ...initial,
              ...Object.fromEntries(new FormData(e.currentTarget)),
            };
            for (const f of fields)
              if (f.type === "checkbox")
                data[f.name] = (
                  e.currentTarget.elements.namedItem(f.name) as HTMLInputElement
                ).checked;
            if (action === "login" || action === "register") {
              try {
                data.wishlist = JSON.parse(
                  localStorage.getItem("hn_wishlist") || "[]",
                );
              } catch {
                data.wishlist = [];
              }
            }
            try {
              const r = await api(action, data);
              if (r.redirect) {
                router.push(r.redirect);
                router.refresh();
              } else {
                setMessage(r.message ?? "Đã lưu.");
                onSuccess?.(r);
                router.refresh();
              }
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {fields.map((f) =>
            f.type === "password" ? (
              <PasswordField
                key={f.name}
                name={f.name}
                label={f.label}
                defaultValue={f.value ?? initial[f.name] ?? ""}
                required={f.required !== false}
                minLength={
                  action === "login" || f.name === "oldPassword"
                    ? 1
                    : action === "register"
                      ? 8
                      : 10
                }
                maxLength={128}
                autoComplete={
                  action === "login" || f.name === "oldPassword"
                    ? "current-password"
                    : "new-password"
                }
              />
            ) : (
              <label
                key={f.name}
                className={f.type === "checkbox" ? "check-label" : ""}
              >
                {f.type === "checkbox" ? (
                  <>
                    <input
                      type="checkbox"
                      name={f.name}
                      defaultChecked={Boolean(f.value ?? initial[f.name])}
                    />
                    {f.label}
                  </>
                ) : (
                  <>
                    <span>{f.label}</span>
                    {f.options ? (
                      <select
                        name={f.name}
                        {...(action === "address" && f.name === "countryCode"
                          ? {
                              value: addressCountry,
                              onChange: (
                                e: React.ChangeEvent<HTMLSelectElement>,
                              ) =>
                                setAddressCountry(
                                  e.target.value as keyof typeof regions,
                                ),
                            }
                          : {
                              defaultValue: String(
                                f.value ?? initial[f.name] ?? "",
                              ),
                            })}
                        required={f.required !== false}
                      >
                        {f.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : f.type === "textarea" ? (
                      <textarea
                        name={f.name}
                        defaultValue={f.value ?? initial[f.name] ?? ""}
                        required={f.required !== false}
                        rows={4}
                      />
                    ) : (
                      <input
                        type={f.type ?? "text"}
                        name={f.name}
                        defaultValue={f.value ?? initial[f.name] ?? ""}
                        required={f.required !== false}
                        min={f.min}
                        max={f.max}
                      />
                    )}
                  </>
                )}
              </label>
            ),
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="success">
              {message}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Đang xử lý..." : submit}
            <ArrowRight size={17} />
          </button>
        </form>
      }
    </LocalizedContent>
  );
}
export function ActionButton({
  action,
  data,
  children,
}: {
  action: string;
  data: any;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <LocalizedContent>
      {
        <>
          <button
            className="button outline small-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api(action, data);
                if (r.redirect) router.push(r.redirect);
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {children}
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </>
      }
    </LocalizedContent>
  );
}
export function WishlistPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      try {
        const s = await api("session");
        if (s.user) {
          const w = await api("wishlist");
          setProducts(w.map((i: any) => i.product));
        } else {
          const ids: string[] = JSON.parse(
            localStorage.getItem("hn_wishlist") || "[]",
          );
          const res = await api("guest-wishlist", { ids });
          setProducts(res);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    window.addEventListener("wishlist-change", load);
    return () => window.removeEventListener("wishlist-change", load);
  }, []);
  return loading ? (
    <p>Đang mở tủ đồ yêu thích...</p>
  ) : products.length ? (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  ) : (
    <div className="empty">
      <Heart size={40} />
      <h2>Lưu lại điều nàng yêu</h2>
      <p>Chạm vào trái tim trên mỗi thiết kế để giữ lại đây.</p>
      <Link className="button" href="/hang-moi">
        KHÁM PHÁ THIẾT KẾ
      </Link>
    </div>
  );
}
export function TrackOrder() {
  const [result, setResult] = useState<any>(null);
  return (
    <LocalizedContent>
      {
        <>
          <SimpleForm
            action="track"
            submit="TRA CỨU ĐƠN HÀNG"
            fields={[
              { name: "code", label: "Mã / ID đơn hàng" },
              {
                name: "phone",
                label: "Số điện thoại đặt hàng (bắt buộc khi chưa đăng nhập)",
                type: "tel",
                required: false,
              },
            ]}
            onSuccess={setResult}
          />
          {result && (
            <div className="summary">
              <h2>{result.code}</h2>
              <p>Trạng thái: {statusLabels[result.status]}</p>
              <p>Thanh toán: {statusLabels[result.paymentStatus]}</p>
              <p>Tổng đơn: {money(result.total)}</p>
              <p>Khách hàng: {result.name}</p>
              <p>
                Phương thức:{" "}
                {result.payments
                  ?.map(
                    (p: { method: string }) =>
                      ({
                        COD: "Thanh toán khi nhận hàng",
                        BANK_TRANSFER: "Chuyển khoản",
                        CASH: "Tiền mặt",
                      })[p.method] ?? p.method,
                  )
                  .join(", ")}
              </p>
              <ul>
                {result.items?.map(
                  (i: {
                    id: string;
                    name: string;
                    size: string;
                    color: string;
                    quantity: number;
                    unitPrice: number;
                  }) => (
                    <li key={i.id}>
                      {i.name} · {i.size} / {i.color} · {i.quantity} ×{" "}
                      {money(i.unitPrice)}
                    </li>
                  ),
                )}
              </ul>
              <h3>Tiến trình đơn hàng</h3>
              <ol>
                {result.history?.map(
                  (h: { status: string; createdAt: string }, i: number) => (
                    <li key={i}>
                      {statusLabels[h.status] ?? h.status} ·{" "}
                      {new Date(h.createdAt).toLocaleString("vi-VN")}
                    </li>
                  ),
                )}
              </ol>
              <ShipmentTimeline shipment={result.shipment ?? null} />
            </div>
          )}
        </>
      }
    </LocalizedContent>
  );
}
export function UploadImage({ onChange }: { onChange: (url: string) => void }) {
  const [message, setMessage] = useState("");
  return (
    <LocalizedContent>
      {
        <label>
          Ảnh sản phẩm (PNG / JPEG / WebP, tối đa 5 MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              if (!e.target.files?.[0]) return;
              const f = new FormData();
              f.set("file", e.target.files[0]);
              try {
                const r = await fetch("/api/admin/upload", {
                  method: "POST",
                  body: f,
                });
                const d = await r.json();
                if (!r.ok) throw new Error(d.error);
                onChange(d.url);
                setMessage("Đã tải ảnh: " + d.url);
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          />
          <span>{message}</span>
        </label>
      }
    </LocalizedContent>
  );
}
