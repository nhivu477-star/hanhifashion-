"use client";
import { LocalizedContent } from "@/components/localization";

import { customerAddressSchema, regions } from "@/lib/localization/config";
import { usePreferences } from "./localization";
import { effectivePrice } from "@/lib/catalog";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  LockKeyhole,
  ShoppingBag,
} from "lucide-react";
import { api, SafeImage } from "./store";
import { money, calculateTotals } from "@/lib/catalog";
const schema = customerAddressSchema;
export function CartPage({
  checkout = false,
  profile,
  addresses = [],
}: {
  checkout?: boolean;
  profile?: any;
  addresses?: any[];
}) {
  const defaultAddress = addresses.find((a) => a.isDefault);
  const router = useRouter();
  const { preference } = usePreferences();
  const addressFormat = regions[preference.region];
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const key = useRef("");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultAddress?.name ?? profile?.name ?? "",
      email: profile?.email ?? "",
      phone: defaultAddress?.phone ?? profile?.phone ?? "",
      province: defaultAddress?.province ?? "",
      ward: defaultAddress?.ward ?? "",
      street: defaultAddress?.street ?? "",
      details: defaultAddress?.details ?? "",
      notes: "",
      countryCode: preference.region,
      postalCode: defaultAddress?.postalCode ?? "",
    },
  });
  useEffect(() => {
    setValue("countryCode", preference.region);
    setQuote(null);
    setApplied("");
  }, [preference.region, setValue]);
  async function load() {
    try {
      setCart(await api("cart"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    try {
      key.current =
        sessionStorage.getItem("hn_checkout_key") || crypto.randomUUID();
      sessionStorage.setItem("hn_checkout_key", key.current);
    } catch {
      key.current = crypto.randomUUID();
    }
  }, []);
  async function update(variantId: string, quantity: number) {
    setBusy(true);
    setError("");
    try {
      await api("cart", { variantId, quantity });
      setQuote(null);
      setApplied("");
      await load();
      window.dispatchEvent(new Event("cart-change"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const subtotal =
    cart?.items?.reduce(
      (n: number, i: any) =>
        n + effectivePrice(i.variant.product, i.variant) * i.quantity,
      0,
    ) ?? 0;
  const total = quote ?? calculateTotals(subtotal);
  if (loading)
    return <LocalizedContent>{<p>Đang mở túi mua sắm...</p>}</LocalizedContent>;
  if (!cart && error)
    return (
      <LocalizedContent>
        <div className="empty">
          <p role="alert" className="error">{error}</p>
          <button
            className="button outline"
            onClick={() => {
              setError("");
              setLoading(true);
              void load();
            }}
          >
            Thử tải lại giỏ hàng
          </button>
        </div>
      </LocalizedContent>
    );
  if (!cart?.items?.length)
    return (
      <LocalizedContent>
        {
          <div className="empty">
            <ShoppingBag size={42} />
            <h2>Túi mua sắm đang chờ nàng</h2>
            <p>Chọn một thiết kế để bắt đầu câu chuyện phong cách.</p>
            <Link className="button" href="/hang-moi">
              KHÁM PHÁ HÀNG MỚI <ArrowRight size={18} />
            </Link>
          </div>
        }
      </LocalizedContent>
    );
  return (
    <LocalizedContent>
      {
        <div className="cart-layout">
          <div>
            {checkout ? (
              <>
                <h2>Thông tin giao hàng</h2>
                <p>
                  {preference.region} ·{" "}
                  {addressFormat.shipping
                    ? "Chỉ hỗ trợ giao hàng tại Việt Nam."
                    : "Khu vực này chỉ hỗ trợ xem sản phẩm; chưa nhận giao hàng."}
                </p>
                {!profile && (
                  <p>
                    Đăng nhập để hoàn tất đặt hàng.{" "}
                    <Link
                      className="text-link"
                      href="/dang-nhap?returnTo=%2Fthanh-toan"
                    >
                      Đăng nhập
                    </Link>{" "}
                    hoặc{" "}
                    <Link
                      className="text-link"
                      href="/dang-ky?returnTo=%2Fthanh-toan"
                    >
                      tạo tài khoản
                    </Link>
                    .
                  </p>
                )}
                {addresses.length > 0 && (
                  <label className="form">
                    Dùng địa chỉ đã lưu
                    <select
                      defaultValue={defaultAddress?.id ?? ""}
                      onChange={(e) => {
                        const a = addresses.find(
                          (a) => a.id === e.target.value,
                        );
                        if (a)
                          for (const k of [
                            "name",
                            "phone",
                            "province",
                            "ward",
                            "street",
                            "details",
                            "postalCode",
                          ] as const)
                            setValue(k, a[k]);
                      }}
                    >
                      <option value="">Chọn địa chỉ</option>
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} · {a.street}, {a.ward}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <form
                  id="checkout-form"
                  className="form checkout-fields"
                  onSubmit={handleSubmit(async (data) => {
                    setError("");
                    setBusy(true);
                    try {
                      const r = await api("checkout", {
                        ...data,
                        countryCode: preference.region,
                        coupon: applied,
                        idempotencyKey: key.current,
                      });
                      try {
                        sessionStorage.removeItem("hn_checkout_key");
                      } catch {
                        /* A committed order must still navigate when storage is unavailable. */
                      }
                      window.dispatchEvent(new Event("cart-change"));
                      router.push(r.redirect);
                      router.refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  })}
                >
                  {[
                    ["name", "Họ và tên", "text"],
                    ["phone", "Số điện thoại", "tel"],
                    ["email", "Địa chỉ email", "email"],
                    ["province", addressFormat.province, "text"],
                    ["ward", addressFormat.ward, "text"],
                    ["postalCode", "Mã bưu chính", "text"],
                    ["street", "Số nhà, tên đường", "text"],
                    ["details", "Chi tiết địa chỉ (không bắt buộc)", "text"],
                    ["notes", "Ghi chú đơn hàng (không bắt buộc)", "text"],
                  ].map(([name, label, type]) => (
                    <label key={name}>
                      <span>{label}</span>
                      <input
                        type={type}
                        id={"checkout-" + name}
                        aria-invalid={!!errors[name as keyof typeof errors]}
                        aria-describedby={
                          errors[name as keyof typeof errors]
                            ? "checkout-" + name + "-error"
                            : undefined
                        }
                        {...register(name as keyof z.infer<typeof schema>)}
                      />
                      {errors[name as keyof typeof errors] && (
                        <span className="error" id={"checkout-" + name + "-error"} role="alert">
                          {errors[name as keyof typeof errors]?.message}
                        </span>
                      )}
                    </label>
                  ))}
                  <div className="payment-method">
                    <strong>Thanh toán khi nhận hàng (COD)</strong>
                    <p>
                      Đơn được ghi nhận là chưa thanh toán. Không thu tiền và
                      không kết nối cổng thanh toán.
                    </p>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="cart-column-labels">
                  <span>THIẾT KẾ</span>
                  <span>SỐ LƯỢNG & THÀNH TIỀN</span>
                </div>
                {cart.items.map((i: any) => (
                  <article className="cart-item" key={i.id}>
                    <Link href={"/san-pham/" + i.variant.product.slug}>
                      <SafeImage
                        src={
                          i.variant.colorRecord
                            ? i.variant.colorRecord.images[0]?.url
                            : i.variant.product.images[0]?.url
                        }
                        alt={i.variant.product.name}
                      />
                    </Link>
                    <div>
                      <Link href={"/san-pham/" + i.variant.product.slug}>
                        {i.variant.product.name}
                      </Link>
                      <p className="muted small">
                        {i.variant.color} / {i.variant.size}
                        <br />
                        {i.variant.sku}
                      </p>
                      <p>
                        {money(effectivePrice(i.variant.product, i.variant))}
                      </p>
                      <button
                        className="text-link remove"
                        aria-label={"Xóa " + i.variant.product.name}
                        disabled={busy}
                        onClick={() => update(i.variantId, 0)}
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    </div>
                    <div className="cart-item-end">
                      <div className="quantity">
                        <button
                          className="icon-button"
                          aria-label="Giảm số lượng"
                          disabled={busy || i.quantity <= 1}
                          onClick={() => update(i.variantId, i.quantity - 1)}
                        >
                          <Minus size={15} />
                        </button>
                        <span>{i.quantity}</span>
                        <button
                          className="icon-button"
                          aria-label="Tăng số lượng"
                          disabled={busy}
                          onClick={() => {
                            if (i.quantity >= i.variant.stock) {
                              setError(`Chỉ còn ${i.variant.stock} sản phẩm trong kho. Giỏ hàng đã có ${i.quantity} sản phẩm, không thể thêm nữa.`);
                              return;
                            }
                            update(i.variantId, i.quantity + 1);
                          }}
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                      <strong>
                        {money(
                          effectivePrice(i.variant.product, i.variant) *
                            i.quantity,
                        )}
                      </strong>
                      {i.quantity > i.variant.stock && (
                        <p className="error">Vượt tồn kho</p>
                      )}
                    </div>
                  </article>
                ))}
                <Link className="text-link" href="/trang-phuc">
                  ← Tiếp tục khám phá
                </Link>
              </>
            )}
          </div>
          <aside className="order-summary">
            <h2>{checkout ? "Đơn hàng của nàng" : "Tổng giỏ hàng"}</h2>
            {checkout &&
              cart.items.map((i: any) => (
                <div className="summary-product" key={i.id}>
                  <SafeImage
                    src={
                      i.variant.colorRecord
                        ? i.variant.colorRecord.images[0]?.url
                        : i.variant.product.images[0]?.url
                    }
                    alt={i.variant.product.name}
                  />
                  <div>
                    {i.variant.product.name}
                    <p className="muted small">
                      {i.variant.color} / {i.variant.size} × {i.quantity}
                    </p>
                    {money(
                      effectivePrice(i.variant.product, i.variant) * i.quantity,
                    )}
                  </div>
                </div>
              ))}
            <div className="coupon-input">
              <input
                aria-label="Mã giảm giá"
                placeholder="Mã ưu đãi"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
              />
              <button
                className="text-link"
                type="button"
                disabled={busy}
                onClick={async () => {
                  setError("");
                  setBusy(true);
                  try {
                    const r = await api("quote", {
                      coupon,
                      countryCode: preference.region,
                    });
                    setQuote(r);
                    setApplied(coupon);
                  } catch (e) {
                    setError((e as Error).message);
                    setQuote(null);
                    setApplied("");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Áp dụng
              </button>
            </div>
            {applied && <p className="success">Đã áp dụng {applied}</p>}
            <div className="summary-row">
              <span>Tạm tính</span>
              <span>{money(total.subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Giảm giá</span>
              <span>−{money(total.discount)}</span>
            </div>
            <div className="summary-row">
              <span>Phí giao hàng</span>
              <span>{total.shipping ? money(total.shipping) : "Miễn phí"}</span>
            </div>
            <div className="summary-total">
              <span>Tổng cộng</span>
              <strong>{money(total.total)}</strong>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {checkout && (
              <p>
                Thanh toán luôn bằng VND.{" "}
                <span data-localize="off">{money(total.total)}</span>
              </p>
            )}
            {checkout ? (
              <button
                className="button full"
                form="checkout-form"
                disabled={busy || !profile || !addressFormat.shipping}
              >
                {busy ? "Đang tạo đơn..." : "ĐẶT HÀNG COD"}
                <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <Link className="button full" href="/thanh-toan">
                  TIẾN HÀNH THANH TOÁN <ArrowRight size={18} />
                </Link>
                <button
                  className="button outline full"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await api("cart/clear", {
                        eventKey: crypto.randomUUID(),
                      });
                      setQuote(null);
                      setApplied("");
                      await load();
                      window.dispatchEvent(new Event("cart-change"));
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Làm trống giỏ hàng
                </button>
              </>
            )}
            <p className="small muted">
              <LockKeyhole size={13} /> Đặt hàng an toàn trong môi trường local.
              <br />
              <Link href="/chinh-sach-giao-hang">
                Thông tin giao hàng
              </Link> ·{" "}
              <Link href="/chinh-sach-doi-tra">Đổi trả & hoàn tiền</Link>
            </p>
          </aside>
        </div>
      }
    </LocalizedContent>
  );
}
