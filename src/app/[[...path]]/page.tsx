import {
  ProductReviews,
  OrderReviewForms,
  CustomerSupport,
} from "@/components/customer-feedback";
import { partialCancellationEnabled } from "@/lib/partial-cancellation";
import { PartialCancellation } from "@/components/partial-cancellation";
import { formatAddress } from "@/lib/localization/config";
import { readPreferences } from "@/lib/localization/server";
import { translateText } from "@/lib/localization/translate";
import { LocalizedContent } from "@/components/localization";
import { AdminPagination, adminPage } from "@/components/admin-pagination";
import { safeReturnTo } from "@/lib/safe-redirect";
import { can, isStaff } from "@/lib/rbac";
import { accountLoginDestination } from "@/lib/account-types";
import { CustomerReturns } from "@/components/returns";
import { ShipmentTimeline } from "@/components/shipment-timeline";
import { publicShipmentSelect } from "@/lib/shipping";
import { OrderActions } from "@/components/order-actions";
import { canCustomerCancel, shippingLabels } from "@/lib/order-lifecycle";
import { AboutPage } from "@/components/about-page";
import { FashionCampaign } from "@/components/fashion-campaign";
import { productAlias } from "@/lib/product-alias";
import { CatalogSearch } from "@/components/catalog-search";
import { publicationFilter, commercialMode } from "@/lib/publication";
import { decodeChart } from "@/lib/sizing";
import { ProductSelection } from "@/components/product-selection";
import {
  ColorGallery,
  OutfitSuggestions,
  VariantPrice,
} from "@/components/product-features";
import Link from "next/link";
import { ContactLinks } from "@/components/contact-links";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Package,
  Heart,
  UserRound,
  MapPin,
} from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { catalogQuery, PAGE_SIZE, Params, scalar } from "@/lib/queries";
import { categories, money, statusLabels, sizeGuide } from "@/lib/catalog";
import {
  ProductCard,
  ProductPurchase,
  Gallery,
  SimpleForm,
  ActionButton,
  WishlistPage,
  TrackOrder,
} from "@/components/store";
import { CartPage } from "@/components/cart";
import { CatalogFilters } from "@/components/catalog";
import { AdminPage } from "@/components/admin";
import { content, policyLinks } from "@/lib/content";
import { PolicyPage } from "@/components/policy-page";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const path = (await params).path ?? [];
  const language = (await readPreferences((await currentUser())?.id)).language;
  const t = (text: string) => translateText(text, language);
  if (path[0] === "san-pham") {
    const alias = await productAlias(path[1]);
    const p = await db.product.findUnique({
      where: { slug: alias?.split("/").pop() ?? path[1] },
    });
    return {
      title: t(p?.name ?? "Sản phẩm"),
      description: p?.description ? t(p.description).slice(0, 160) : undefined,
    };
  }
  if (path[0]) {
    const category = await db.category.findUnique({
      where: { slug: path[0] },
      select: { name: true, description: true },
    });
    if (category)
      return { title: t(category.name), description: t(category.description) };
  }
  return {
    title: t(
      path.length
        ? (categories.find((c) => c[0] === path[0])?.[1] ??
            content[path[0]]?.title ??
            (
              {
                "hang-moi": "Hàng mới",
                "gio-hang": "Giỏ hàng",
                "thanh-toan": "Thanh toán",
                admin: "Quản trị",
                "bo-suu-tap": "Bộ sưu tập",
                "tai-khoan": "Tài khoản",
                "tim-kiem": "Tìm kiếm",
                "dang-nhap": "Đăng nhập",
                "dang-ky": "Đăng ký",
                "quen-mat-khau": "Quên mật khẩu",
                "yeu-thich": "Sản phẩm yêu thích",
              } as Record<string, string>
            )[path[0]] ??
            "Khám phá")
        : "Thiết kế dành cho nàng",
    ),
  };
}
const include = {
  images: {
    orderBy: { position: "asc" as const },
    take: 2,
    include: { mediaAsset: { select: { focalX: true, focalY: true } } },
  },
  variants: {
    where: { OR: [{ colorId: null }, { colorRecord: { active: true } }] },
  },
  category: true,
};
function Breadcrumb({ label }: { label: string }) {
  return (
    <LocalizedContent>
      {
        <div className="breadcrumb">
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <span>{label}</span>
        </div>
      }
    </LocalizedContent>
  );
}
function Title({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <LocalizedContent>
      {
        <div className="page-title">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      }
    </LocalizedContent>
  );
}
function ProductSection({
  title,
  subtitle,
  products,
  href = "/hang-moi",
  note,
}: {
  title: string;
  subtitle: string;
  products: any[];
  href?: string;
  note?: string;
}) {
  return (
    <LocalizedContent>
      {
        <section className="container product-section">
          <div className="section-heading">
            <div>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
            <Link className="text-link desktop-only" href={href}>
              XEM TẤT CẢ <ArrowRight size={16} />
            </Link>
          </div>
          {note && <p className="small muted">{note}</p>}
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div className="center-action">
            <Link className="button outline" href={href}>
              XEM TẤT CẢ <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      }
    </LocalizedContent>
  );
}
async function Home() {
  const latest = await db.product.findMany({
    where: {
      active: true,
      ...publicationFilter(),
      category: { active: true },
      isNew: true,
    },
    include,
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const categorySections = await Promise.all(
    [
      ["trang-phuc", "Trang phục"],
      ["giay", "Giày"],
      ["tui-xach", "Túi xách"],
      ["phu-kien", "Phụ kiện"],
    ].map(async ([slug, name]) => ({
      slug,
      name,
      products: await db.product.findMany({
        where: {
          active: true,
          ...publicationFilter(),
          category: { active: true },
          OR: [{ category: { slug } }, { subcategory: { slug } }],
        },
        include,
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
    })),
  );
  return (
    <LocalizedContent>
      {
        <main className="fashion-home">
          <FashionCampaign />
          <section className="fashion-product-section">
            <div className="fashion-section-title">
              <h2>Thiết kế mới</h2>
              <Link href="/hang-moi">Xem tất cả</Link>
            </div>
            <div className="product-grid">
              {latest.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
          {categorySections
            .filter((section) => section.products.length > 0)
            .map((section) => (
              <section className="fashion-product-section" key={section.slug}>
                <div className="fashion-section-title">
                  <h2>{section.name}</h2>
                  <Link href={`/${section.slug}`}>Xem tất cả</Link>
                </div>
                <div className="product-grid">
                  {section.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ))}
        </main>
      }
    </LocalizedContent>
  );
}
async function Catalog({
  slug,
  params,
  collection,
}: {
  slug: string;
  params: Params;
  collection?: string;
}) {
  const cat = await db.category.findUnique({ where: { slug } });
  const col = collection
    ? await db.collection.findUnique({ where: { slug: collection } })
    : null;
  if (collection && !col) notFound();
  const search = slug === "tim-kiem";
  const effective = {
    ...params,
    ...(slug === "hang-moi" ? { new: "1" } : {}),
    ...(slug === "sale" ? { sale: "1" } : {}),
  };
  const emptySearch = search && !scalar(params.q).trim();
  const result = emptySearch
    ? { products: [], count: 0, page: 1, filterError: null }
    : await catalogQuery(effective, cat?.slug, col?.slug);
  const filterProducts = await db.product.findMany({
    where: {
      active: true,
      ...publicationFilter(),
      category: { active: true },
      ...(cat
        ? cat.parentId
          ? { subcategoryId: cat.id }
          : { categoryId: cat.id }
        : {}),
      ...(col ? { collections: { some: { collectionId: col.id } } } : {}),
    },
    select: {
      material: true,
      fit: true,
      occasion: true,
      colors: {
        where: { active: true },
        select: { name: true, variants: { select: { size: true } } },
      },
    },
  });
  const uniqueOptions = (items: string[]) => [
    ...new Set(items.filter(Boolean)),
  ];
  const filterOptions = {
    sizes: uniqueOptions(
      filterProducts.flatMap((p) =>
        p.colors.flatMap((c) => c.variants.map((v) => v.size)),
      ),
    ),
    colors: uniqueOptions(
      filterProducts.flatMap((p) => p.colors.map((c) => c.name)),
    ),
    materials: uniqueOptions(filterProducts.map((p) => p.material)),
    fits: uniqueOptions(filterProducts.map((p) => p.fit)),
    occasions: uniqueOptions(filterProducts.map((p) => p.occasion)),
  };
  const title =
    col?.name ??
    cat?.name ??
    (search
      ? "Tìm kiếm thiết kế"
      : slug === "hang-moi"
        ? "Những thiết kế mới"
        : slug === "sale"
          ? "Ưu đãi dành cho nàng"
          : "Thiết kế dành cho nàng");
  return (
    <LocalizedContent>
      {
        <main className="container catalog-page">
          <Breadcrumb label={title} />
          <Title
            title={title}
            description={
              col?.description ??
              cat?.description ??
              "Thanh lịch, hiện đại và dễ kết hợp. Tìm thiết kế phù hợp với nàng."
            }
          />
          {search && <CatalogSearch query={scalar(params.q)} />}
          <div className="catalog-layout">
            <CatalogFilters
              count={result.count}
              options={filterOptions}
              categories={await db.category.findMany({
                where: { active: true },
                orderBy: { sortOrder: "asc" },
              })}
            />
            <div className="catalog-results">
              {result.filterError && (
                <p className="error" role="alert">
                  {result.filterError}
                </p>
              )}
              {result.products.length ? (
                <div className="product-grid catalog-grid">
                  {result.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <h2>
                    {emptySearch
                      ? "Nàng muốn tìm thiết kế nào?"
                      : "Chưa có thiết kế phù hợp"}
                  </h2>
                  <p>
                    {emptySearch
                      ? "Nhập tên sản phẩm, chất liệu, màu hoặc mã SKU để bắt đầu."
                      : "Thử từ khóa khác hoặc xóa bớt bộ lọc để khám phá thêm."}
                  </p>
                  <Link href={"/" + slug} className="button outline">
                    XÓA BỘ LỌC
                  </Link>
                </div>
              )}
              <nav className="pagination" aria-label="Phân trang">
                {Array.from(
                  { length: Math.ceil(result.count / PAGE_SIZE) },
                  (_, i) => {
                    const q = new URLSearchParams();
                    Object.entries(params).forEach(([k, v]) => {
                      if (v) q.set(k, scalar(v));
                    });
                    q.set("page", String(i + 1));
                    return (
                      <Link
                        aria-current={
                          result.page === i + 1 ? "page" : undefined
                        }
                        className={result.page === i + 1 ? "active" : ""}
                        href={"?" + q.toString()}
                        key={i}
                      >
                        {i + 1}
                      </Link>
                    );
                  },
                )}
              </nav>
              {params.sort === "popular" && (
                <p className="small muted">
                  Sắp xếp theo số dòng đơn hàng trong cơ sở dữ liệu, không phải
                  doanh số thực tế.
                </p>
              )}
            </div>
          </div>
        </main>
      }
    </LocalizedContent>
  );
}
async function Product({ slug, colorId }: { slug: string; colorId?: string }) {
  const alias = await productAlias(slug, colorId);
  if (alias) redirect(alias);
  const p = await db.product.findUnique({
    where: { slug },
    include: {
      ...include,
      category: { include: { sizeChart: true } },
      sizeChart: true,
      colors: {
        where: { active: true },
        orderBy: { position: "asc" },
        include: {
          images: {
            orderBy: { position: "asc" },
            include: { mediaAsset: { select: { focalX: true, focalY: true } } },
          },
          outfits: {
            orderBy: { position: "asc" },
            include: {
              items: {
                where: {
                  product: { active: true, ...publicationFilter() },
                  color: { active: true },
                },
                include: {
                  product: { include: { category: true } },
                  color: {
                    include: {
                      images: {
                        orderBy: { position: "asc" },
                        include: {
                          mediaAsset: {
                            select: { focalX: true, focalY: true },
                          },
                        },
                      },
                      variants: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (
    !p ||
    (commercialMode() &&
      (p.publicationStatus !== "READY" || !p.merchandiseVerified)) ||
    !p.active
  )
    notFound();
  return (
    <LocalizedContent>
      {
        <main className="container">
          <Breadcrumb label={p.name} />
          <ProductSelection
            key={p.id + colorId}
            product={p}
            initialColorId={colorId}
          >
            <div className="product-detail">
              <ColorGallery product={p} />
              <section className="product-info">
                <Link className="muted" href={"/" + p.category.slug}>
                  {p.category.name}
                </Link>
                <h1>{p.name}</h1>
                <p className="small muted">Mã sản phẩm: {p.sku}</p>
                <VariantPrice product={p} />
                <p className="product-short-description">{p.description}</p>
                <ProductPurchase product={p} />
                <div className="product-accordions">
                  <details open>
                    <summary>Chi tiết thiết kế</summary>
                    <p style={{ whiteSpace: "pre-line" }}>
                      {p.details || p.description}
                    </p>
                    <p>
                      Chất liệu: {p.material}
                      <br />
                      Phom dáng: {p.fit}
                      <br />
                      Kiểu tay: {p.sleeveType || "Theo thiết kế"}
                      <br />
                      Chiều dài: {p.length || "Theo thiết kế"}
                      <br />
                      Phong cách bổ sung: {p.styleTags || p.style}
                      <br />
                      Phong cách: {p.style}
                    </p>
                  </details>
                  <details>
                    <summary>Chăm sóc trang phục</summary>
                    <p>
                      {p.care ||
                        "Đối chiếu nhãn chăm sóc của sản phẩm trước khi giặt."}
                    </p>
                  </details>
                  <details>
                    <summary>Giao hàng & đổi trả</summary>
                    <p>
                      Thông tin giao nhận và chi phí được thể hiện trước khi đặt
                      hàng. Nếu cần tư vấn kích cỡ, tình trạng sản phẩm hoặc đổi
                      trả, hãy liên hệ HÀ NHI.
                    </p>
                    <div className="product-policy-links">
                      <Link href="/chinh-sach-giao-hang">
                        Thông tin giao hàng →
                      </Link>
                      <Link href="/chinh-sach-doi-tra">
                        Đổi trả & hoàn tiền →
                      </Link>
                    </div>
                  </details>
                </div>
              </section>
            </div>
            <p className="product-styling-copy">{p.styling}</p>
            <OutfitSuggestions product={p} />
          </ProductSelection>
          <ProductReviews productId={p.id} />
          <ProductSection
            title="Có thể nàng sẽ thích"
            subtitle="Thêm những lựa chọn cho phong cách của nàng"
            href={"/" + p.category.slug}
            products={await db.product.findMany({
              where: {
                active: true,
                ...publicationFilter(),
                categoryId: p.categoryId,
                id: { not: p.id },
              },
              take: 4,
              include,
            })}
          />
        </main>
      }
    </LocalizedContent>
  );
}
async function OrderDetail({
  code,
  id,
  success = false,
}: {
  code?: string;
  id?: string;
  success?: boolean;
}) {
  const u = await currentUser();
  const order = await db.order.findFirst({
    where: code ? { code } : { id },
    include: {
      items: { include: { product: { select: { slug: true } } } },
      payments: true,
      shipment: { select: publicShipmentSelect },
      history: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();
  const access = (await cookies()).get("hn_order_" + order.code)?.value;
  if (!(
    u?.id === order.userId ||
    (u && can(u.role, "orders.read")) ||
    (code && access === order.accessToken)
  ))
    notFound();
  return (
    <LocalizedContent>
      {
        <main className="container order-page">
          <Breadcrumb label="Chi tiết đơn hàng" />
          {success && (
            <div className="order-success">
              <Check size={34} />
              <h1>Cảm ơn nàng đã lựa chọn HÀ NHI</h1>
              <p>Đơn hàng đã được lưu thành công. Đây là đơn, chưa thu tiền.</p>
            </div>
          )}
          <div className="section-heading">
            <div>
              <h2>Đơn hàng {order.code}</h2>
              <p>
                {new Date(order.createdAt).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </p>
            </div>
            <span className="status">{statusLabels[order.status]}</span>
          </div>
          <div className="cart-layout">
            <div>
              {order.items.map((i) => (
                <div className="cart-item" key={i.id}>
                  <img src={i.image} alt={i.name} />
                  <div>
                    <Link href={"/san-pham/" + i.product.slug}>{i.name}</Link>
                    <p>
                      {i.color} / {i.size} × {i.quantity}
                    </p>
                    <p className="muted small">{i.sku}</p>
                  </div>
                  <strong>{money(i.unitPrice * i.quantity)}</strong>
                </div>
              ))}
              <ShipmentTimeline shipment={order.shipment} />
              {u?.role === "CUSTOMER" && u.id === order.userId && (
                <CustomerReturns orderId={order.id} userId={u.id} />
              )}
              <h3>Lịch sử đơn hàng</h3>
              {order.history.map((h) => (
                <p key={h.id}>
                  {new Date(h.createdAt).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}{" "}
                  · {statusLabels[h.status]}
                  <br />
                  <span className="muted">
                    {h.event === "COD_COLLECTED" || h.event === "COD_CORRECTED"
                      ? "Cửa hàng đã cập nhật thông tin thanh toán."
                      : h.note}
                  </span>
                </p>
              ))}
            </div>
            <aside className="order-summary">
              <h3>Thông tin giao hàng</h3>
              <p>
                {order.name} · {order.phone}
                <br />
                {order.email}
              </p>
              <p>
                <span data-localize="off">{formatAddress(order)}</span>
                <br />
                {order.details}
              </p>
              {order.notes && <p>Ghi chú: {order.notes}</p>}
              <div className="summary-row">
                <span>Tạm tính</span>
                <span>{money(order.subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Giảm giá</span>
                <span>−{money(order.discount)}</span>
              </div>
              <div className="summary-row">
                <span>Giao hàng</span>
                <span>{money(order.shipping)}</span>
              </div>
              <div className="summary-total">
                <span>Tổng cộng</span>
                <strong>{money(order.total)}</strong>
              </div>
              <p>
                {order.payments
                  .map(
                    (p) =>
                      ({
                        COD: "Thanh toán khi nhận hàng",
                        BANK_TRANSFER: "Chuyển khoản",
                        CASH: "Tiền mặt",
                      })[p.method] ?? p.method,
                  )
                  .join(", ")}{" "}
                · {statusLabels[order.paymentStatus]}
              </p>
              <p>Giao nhận: {shippingLabels[order.shippingStatus]}</p>
              {order.shippingReference && (
                <p>Tham chiếu: {order.shippingReference}</p>
              )}
              <p className="small muted">
                Trạng thái giao nhận do cửa hàng ghi nhận thủ công.
              </p>
              {(u?.id === order.userId || (!u && code && access === order.accessToken)) &&
                canCustomerCancel(order.status, order.paymentStatus) && (
                <OrderActions
                  id={order.id}
                  code={order.code}
                  status={order.status}
                  paymentStatus={order.paymentStatus}
                />
              )}

              {(await partialCancellationEnabled()) &&
                canCustomerCancel(order.status, order.paymentStatus) &&
                !order.shipment &&
                order.userId &&
                u?.id === order.userId && (
                  <PartialCancellation id={order.id} items={order.items} />
                )}
              {u?.id === order.userId && (
                <OrderReviewForms orderId={order.id} userId={u.id} />
              )}
              <h3>Hỗ trợ đơn hàng</h3>
              <ContactLinks compact />
              <Link href="/hang-moi" className="button full">
                TIẾP TỤC KHÁM PHÁ
              </Link>
            </aside>
          </div>
        </main>
      }
    </LocalizedContent>
  );
}
async function AccountPage({ path, query }: { path: string[]; query: Params }) {
  const u = await currentUser();
  if (!u)
    redirect("/dang-nhap?returnTo=" + encodeURIComponent("/" + path.join("/")));
  const tab = path[1] ?? "";
  if (tab === "don-hang" && path[2])
    return <LocalizedContent>{<OrderDetail id={path[2]} />}</LocalizedContent>;
  const page = adminPage(query);
  const orderQuery = scalar(query.q).trim(),
    orderStatus = scalar(query.status);
  const ownedOrders = {
    userId: u.id,
    ...(orderQuery ? { code: { contains: orderQuery } } : {}),
    ...(Object.keys(statusLabels).includes(orderStatus)
      ? { status: orderStatus }
      : {}),
  };
  const count =
    tab === "don-hang" ? await db.order.count({ where: ownedOrders }) : 0;
  const orders =
    tab === "don-hang"
      ? await db.order.findMany({
          where: ownedOrders,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: 24,
          skip: (page - 1) * 24,
        })
      : [];
  const addresses =
    tab === "dia-chi"
      ? await db.address.findMany({
          where: { userId: u.id },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        })
      : [];
  return (
    <LocalizedContent>
      {
        <main className="container">
          <Breadcrumb label="Tài khoản" />
          <Title
            title={"Xin chào, " + u.name.split(" ").at(-1)}
            description="Không gian dành riêng cho phong cách của nàng."
          />
          <div className="account-layout">
            <aside className="account-nav">
              {[
                ["", "Tổng quan"],
                ["thong-tin", "Thông tin cá nhân"],
                ["don-hang", "Đơn hàng của tôi"],
                ["dia-chi", "Địa chỉ giao hàng"],
                ["ho-tro", "Yêu cầu hỗ trợ"],
              ].map((c) => (
                <Link
                  key={c[0]}
                  className={tab === c[0] ? "active" : ""}
                  href={"/tai-khoan" + (c[0] ? "/" + c[0] : "")}
                >
                  {c[1]}
                </Link>
              ))}
              <Link href="/cai-dat-hien-thi">Cài đặt hiển thị</Link>
              <Link href="/yeu-thich">Sản phẩm yêu thích</Link>
              {isStaff(u.role) && (
                <Link href={accountLoginDestination(u.role)}>
                  {u.role === "SELLER" ? "Bảng điều khiển bán hàng" : "Quản trị cửa hàng"}
                </Link>
              )}
              <ActionButton action="logout" data={{}}>
                Đăng xuất
              </ActionButton>
            </aside>
            <section className="account-content">
              {!tab ? (
                <>
                  <h2>Tủ đồ bắt đầu từ nàng</h2>
                  <p>
                    Quản lý thông tin, theo dõi đơn hàng và lưu lại những thiết
                    kế yêu thích.
                  </p>
                  <div className="account-cards">
                    {[
                      ["don-hang", "Đơn hàng của tôi", Package],
                      ["dia-chi", "Địa chỉ giao hàng", MapPin],
                      ["thong-tin", "Thông tin cá nhân", UserRound],
                    ].map(([slug, label, Icon]: any) => (
                      <Link key={slug} href={"/tai-khoan/" + slug}>
                        <Icon size={28} />
                        <h3>{label}</h3>
                        <ArrowRight size={18} />
                      </Link>
                    ))}
                  </div>
                </>
              ) : tab === "thong-tin" ? (
                <>
                  <h2>Thông tin cá nhân</h2>
                  <p>{u.email}</p>
                  <SimpleForm
                    action="profile"
                    initial={{ name: u.name, phone: u.phone }}
                    fields={[
                      { name: "name", label: "Họ và tên" },
                      { name: "phone", label: "Số điện thoại", type: "tel" },
                    ]}
                  />
                  <h2>Đổi mật khẩu</h2>
                  <SimpleForm
                    action="password"
                    fields={[
                      {
                        name: "oldPassword",
                        label: "Mật khẩu hiện tại",
                        type: "password",
                      },
                      {
                        name: "password",
                        label: "Mật khẩu mới (tối thiểu 10 ký tự)",
                        type: "password",
                      },
                    ]}
                  />
                </>
              ) : tab === "don-hang" ? (
                <>
                  <h2>Đơn hàng của tôi</h2>
                  <form className="search-form">
                    <input
                      aria-label="Tìm mã đơn của tôi"
                      name="q"
                      defaultValue={orderQuery}
                      placeholder="Mã đơn hàng"
                    />
                    <select
                      aria-label="Trạng thái đơn của tôi"
                      name="status"
                      defaultValue={orderStatus}
                    >
                      <option value="">Tất cả trạng thái</option>
                      {[
                        "PENDING",
                        "CONFIRMED",
                        "PROCESSING",
                        "SHIPPING",
                        "DELIVERED",
                        "COMPLETED",
                        "CANCELLED",
                        "RETURNED",
                      ].map((status) => (
                        <option value={status} key={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                    <button className="button">Tìm đơn</button>
                  </form>
                  {orders.length ? (
                    orders.map((o) => (
                      <Link
                        href={"/tai-khoan/don-hang/" + o.id}
                        key={o.id}
                        className="order-list-row"
                      >
                        <span>
                          {o.code}
                          <small>
                            {o.createdAt.toLocaleDateString("vi-VN")}
                          </small>
                        </span>
                        <span>{statusLabels[o.status]}</span>
                        <strong>{money(o.total)}</strong>
                        <ArrowRight size={18} />
                      </Link>
                    ))
                  ) : (
                    <p>
                      Nàng chưa có đơn hàng.{" "}
                      <Link href="/hang-moi" className="text-link">
                        Khám phá thiết kế mới
                      </Link>
                    </p>
                  )}
                  <AdminPagination
                    query={query}
                    page={page}
                    count={count}
                    label="Phân trang đơn hàng của tôi"
                  />
                </>
              ) : tab === "ho-tro" ? (
                <CustomerSupport userId={u.id} orderId={scalar(query.don) || undefined} />
              ) : tab === "dia-chi" ? (
                <>
                  <h2>Địa chỉ giao hàng</h2>
                  {addresses.map((a) => (
                    <details key={a.id} className="address-card">
                      <summary>
                        <span data-localize="off">
                          {a.name} · {formatAddress(a)}{" "}
                          {a.isDefault ? " · Mặc định" : ""}
                        </span>
                      </summary>
                      <SimpleForm
                        action="address"
                        initial={a}
                        fields={addressFields}
                      />
                      {!a.isDefault && (
                        <ActionButton
                          action="address"
                          data={{ id: a.id, makeDefault: true }}
                        >
                          Đặt làm địa chỉ mặc định
                        </ActionButton>
                      )}
                      <ActionButton
                        action="address"
                        data={{ id: a.id, delete: true }}
                      >
                        Xóa địa chỉ
                      </ActionButton>
                    </details>
                  ))}
                  <h3>Thêm địa chỉ</h3>
                  <SimpleForm action="address" fields={addressFields} />
                </>
              ) : (
                notFound()
              )}
            </section>
          </div>
        </main>
      }
    </LocalizedContent>
  );
}
const addressFields = [
  { name: "name", label: "Tên người nhận" },
  { name: "phone", label: "Số điện thoại", type: "tel" },
  { name: "province", label: "Tỉnh / Thành phố" },
  { name: "ward", label: "Phường / Xã" },
  { name: "street", label: "Số nhà, tên đường" },
  { name: "details", label: "Chi tiết thêm", required: false },
];
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Params>;
}) {
  const path = (await params).path ?? [];
  const query = await searchParams;
  const slug = path[0] ?? "";
  if (!slug) return <LocalizedContent>{<Home />}</LocalizedContent>;
  if (slug === "admin")
    return (
      <LocalizedContent>
        {<AdminPage path={path.slice(1)} query={query} />}
      </LocalizedContent>
    );
  if (slug === "san-pham" && path[1])
    return (
      <LocalizedContent>
        {<Product slug={path[1]} colorId={scalar(query.mau)} />}
      </LocalizedContent>
    );
  if (slug === "tai-khoan")
    return (
      <LocalizedContent>
        {<AccountPage path={path} query={query} />}
      </LocalizedContent>
    );
  if (slug === "dat-hang-thanh-cong" && path[1])
    return (
      <LocalizedContent>
        {<OrderDetail code={path[1]} success />}
      </LocalizedContent>
    );
  if (
    [
      "thoi-trang-cong-so",
      "tat-ca",
      "hang-moi",
      "tim-kiem",
      "sale",
      ...categories.map((c) => c[0]),
    ].includes(slug) ||
    (await db.category.count({ where: { slug } }))
  )
    return (
      <LocalizedContent>
        {<Catalog slug={slug} params={query} />}
      </LocalizedContent>
    );
  if (slug === "bo-suu-tap") {
    if (path[1])
      return (
        <LocalizedContent>
          {<Catalog slug={slug} params={query} collection={path[1]} />}
        </LocalizedContent>
      );
    const collections = await db.collection.findMany({
      where: {
        slug: { in: ["new-season", "statement", "essentials"] },
      },
      orderBy: { createdAt: "asc" },
    });
    return (
      <LocalizedContent>
        {
          <main className="container">
            <Breadcrumb label="Bộ sưu tập" />
            <Title
              title="Những câu chuyện phong cách"
              description="Mỗi bộ sưu tập là một góc nhìn mới về nàng."
            />
            <div className="collections-grid">
              {collections.map((c) => (
                <Link key={c.id} href={"/bo-suu-tap/" + c.slug}>
                  <img src={c.image} alt={"Minh họa " + c.name} />
                  <h2>
                    {c.name} <ArrowUpRight size={24} />
                  </h2>
                  <p>{c.description}</p>
                </Link>
              ))}
            </div>
          </main>
        }
      </LocalizedContent>
    );
  }
  if (slug === "gio-hang" || slug === "thanh-toan") {
    const u = await currentUser();
    const addresses = u
      ? await db.address.findMany({
          where: { userId: u.id },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        })
      : [];
    return (
      <LocalizedContent>
        {
          <main className="container">
            <Breadcrumb
              label={slug === "gio-hang" ? "Giỏ hàng" : "Thanh toán"}
            />
            <Title
              title={
                slug === "gio-hang"
                  ? "Túi mua sắm của nàng"
                  : "Hoàn tất lựa chọn"
              }
              description={
                slug === "gio-hang"
                  ? "Những thiết kế nàng đã lựa chọn."
                  : "Một bước nữa để hoàn tất đơn hàng."
              }
            />
            <CartPage
              checkout={slug === "thanh-toan"}
              profile={
                u ? { name: u.name, email: u.email, phone: u.phone } : null
              }
              addresses={addresses}
            />
          </main>
        }
      </LocalizedContent>
    );
  }
  if (slug === "yeu-thich")
    return (
      <LocalizedContent>
        {
          <main className="container">
            <Breadcrumb label="Yêu thích" />
            <Title
              title="Những thiết kế nàng yêu"
              description="Một góc nhỏ để giữ lại cảm hứng."
            />
            <WishlistPage />
          </main>
        }
      </LocalizedContent>
    );
  if (["dang-nhap", "dang-ky", "quen-mat-khau"].includes(slug)) {
    const reg = slug === "dang-ky";
    const forgot = slug === "quen-mat-khau";
    const reset = Boolean(query.token);
    return (
      <LocalizedContent>
        {
          <main className="auth-page">
            <div className="auth-art">
              <img
                src="/images/auth-awak-user.png"
                alt="Bộ ảnh Awak được chọn cho HÀ NHI FASHION"
              />
              <div>
                <h2>
                  Thanh lịch mỗi ngày.
                  <br />
                  Tự tin là chính mình.
                </h2>
              </div>
            </div>
            <div className="auth-form">
              <h1>
                {reg
                  ? "Chào nàng đến HÀ NHI"
                  : forgot
                    ? "Tìm lại mật khẩu"
                    : "Chào nàng trở lại"}
              </h1>
              <p>
                {reg
                  ? "Tạo tài khoản để giữ những lựa chọn dành riêng cho nàng."
                  : forgot
                    ? "Khôi phục quyền truy cập tài khoản của nàng."
                    : "Đăng nhập để tiếp tục câu chuyện phong cách."}
              </p>
              <SimpleForm
                action={
                  reg
                    ? "register"
                    : forgot
                      ? reset
                        ? "reset"
                        : "forgot"
                      : "login"
                }
                initial={
                  reset
                    ? { resetToken: scalar(query.token) }
                    : { returnTo: safeReturnTo(scalar(query.returnTo)) }
                }
                submit={
                  reg
                    ? "TẠO TÀI KHOẢN"
                    : forgot
                      ? reset
                        ? "LƯU MẬT KHẨU MỚI"
                        : "GỬI HƯỚNG DẪN"
                      : "ĐĂNG NHẬP"
                }
                fields={
                  reg
                    ? [
                        { name: "name", label: "Họ và tên" },
                        { name: "email", label: "Email (hoặc để trống nếu dùng SĐT)", type: "email", required: false },
                        { name: "phone", label: "Số điện thoại (hoặc để trống nếu dùng email)", type: "tel", required: false },
                        {
                          name: "password",
                          label: "Mật khẩu (ít nhất 8 ký tự)",
                          type: "password",
                        },
                        {
                          name: "confirmPassword",
                          label: "Xác nhận mật khẩu",
                          type: "password",
                        },
                      ]
                    : forgot
                      ? reset
                        ? [
                            {
                              name: "password",
                              label: "Mật khẩu mới (ít nhất 10 ký tự)",
                              type: "password",
                            },
                          ]
                        : [
                            {
                              name: "email",
                              label: "Email đã đăng ký",
                              type: "email",
                            },
                          ]
                      : [
                          { name: "email", label: "Email hoặc số điện thoại" },
                          {
                            name: "password",
                            label: "Mật khẩu",
                            type: "password",
                          },
                        ]
                }
              />
              <div className="auth-links">
                {!forgot && <Link href="/quen-mat-khau">Quên mật khẩu?</Link>}
                <Link
                  href={
                    (reg || forgot ? "/dang-nhap" : "/dang-ky") +
                    (safeReturnTo(scalar(query.returnTo))
                      ? "?returnTo=" +
                        encodeURIComponent(scalar(query.returnTo))
                      : "")
                  }
                >
                  {reg || forgot
                    ? "Đã có tài khoản? Đăng nhập"
                    : "Chưa có tài khoản? Đăng ký"}
                </Link>
              </div>
              {forgot && (
                <p className="small muted">
                  Bản local ghi liên kết khôi phục trong thư mục .local-mail,
                  không gửi email thật.
                </p>
              )}
            </div>
          </main>
        }
      </LocalizedContent>
    );
  }
  if (slug === "tra-cuu-don-hang")
    return (
      <LocalizedContent>
        {
          <main className="container narrow">
            <Breadcrumb label="Tra cứu đơn hàng" />
            <Title
              title="Đơn hàng của nàng đang ở đâu?"
              description="Nhập mã đơn và số điện thoại đã dùng khi đặt hàng."
            />
            <TrackOrder />
          </main>
        }
      </LocalizedContent>
    );
  if (slug === "lien-he")
    return (
      <LocalizedContent>
        {
          <main className="container">
            <Breadcrumb label="Liên hệ" />
            <Title
              title="LIÊN HỆ HÀ NHI FASHION"
              description="Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ nàng."
            />
            <div className="contact-layout">
              <div>
                <h2>Kết nối cùng HÀ NHI</h2>
                <p>
                  Biểu mẫu này lưu tin nhắn trong cơ sở dữ liệu local để quản
                  trị kiểm tra.
                </p>
                <ContactLinks />
                <Link href="/tra-cuu-don-hang" className="text-link">
                  Tra cứu đơn hàng →
                </Link>
              </div>
              <SimpleForm
                action="contact"
                submit="GỬI LỜI NHẮN"
                fields={[
                  { name: "name", label: "Họ và tên" },
                  { name: "email", label: "Địa chỉ email", type: "email" },
                  {
                    name: "phone",
                    label: "Số điện thoại (không bắt buộc)",
                    type: "tel",
                    required: false,
                  },
                  { name: "subject", label: "Chủ đề" },
                  {
                    name: "message",
                    label: "Nội dung liên hệ",
                    type: "textarea",
                  },
                ]}
              />
            </div>
          </main>
        }
      </LocalizedContent>
    );
  if (slug === "huong-dan-chon-size") {
    const charts = await db.sizeChart.findMany({
      where: { categoryId: { not: null } },
      include: { category: true },
    });
    return (
      <LocalizedContent>
        {
          <main className="container content-page">
            <Breadcrumb label="Hướng dẫn chọn size" />
            <Title
              title="Vừa vặn, để nàng tự tin"
              description="Bảng kích cỡ trang phục tham khảo. Với giày và phụ kiện, vui lòng liên hệ để được tư vấn."
            />
            <p>
              Bảng dưới đây dùng để tham khảo, chưa được nhà sản xuất xác minh.
              Nàng nên đo cơ thể và đối chiếu thông số thực tế của từng thiết kế
              trước khi mua hàng thật.
            </p>
            {charts.map((record) => {
              const chart = decodeChart(record);
              if (!chart) return null;
              return (
                <section key={record.id}>
                  <h2>{record.category?.name}</h2>
                  <p>{chart.notes}</p>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Size</th>
                          <th>Vòng ngực</th>
                          <th>Vòng eo</th>
                          <th>Vòng mông</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chart.rows.map((r) => (
                          <tr key={r.size}>
                            <th>{r.size}</th>
                            <td>{r.bust?.join("–") ?? "—"}</td>
                            <td>{r.waist?.join("–") ?? "—"}</td>
                            <td>{r.hips?.join("–") ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
            <p>
              Bảng riêng của từng sản phẩm, khi có, được ưu tiên tại mục Hướng
              dẫn chọn size trên trang chi tiết.
            </p>
            <h2>Cách đo cơ thể</h2>
            <p>
              Giữ thước dây ngang, không siết chặt. Đo vòng ngực tại điểm đầy
              nhất, vòng eo tại vị trí nhỏ nhất và vòng hông tại điểm rộng nhất.
              Đo ngang vai giữa hai đầu vai. Chiều dài áo, tay, quần và váy cần
              đối chiếu với thiết kế cụ thể.
            </p>
            <h2>Khi nằm giữa hai kích cỡ</h2>
            <p>
              Ưu tiên kích cỡ lớn hơn cho phom thoải mái. Trang phục ôm vừa nên
              được thử trực tiếp. Chất liệu và đường cắt có thể làm thay đổi cảm
              giác mặc.
            </p>
          </main>
        }
      </LocalizedContent>
    );
  }
  if (slug === "gioi-thieu")
    return <LocalizedContent>{<AboutPage />}</LocalizedContent>;
  if (content[slug]) {
    const c = { ...content[slug], sections: [...content[slug].sections] };
    const settingKey =
      slug === "chinh-sach-giao-hang"
        ? "salesPolicy"
        : slug === "chinh-sach-doi-tra"
          ? "returnsInstructions"
          : undefined;
    if (settingKey) {
      const extra = await db.storeSetting.findUnique({
        where: { key: settingKey },
      });
      if (extra?.value.trim())
        c.sections.push(["Thông tin từ cửa hàng", extra.value]);
    }
    if (policyLinks.some(([path]) => path === slug))
      return (
        <LocalizedContent>
          {<PolicyPage slug={slug} entry={c} />}
        </LocalizedContent>
      );
    return (
      <LocalizedContent>
        {
          <main className="container content-page">
            <Breadcrumb label={c.title} />
            <Title title={c.title} description={c.intro} />
            {c.sections.map(([h, p]) => (
              <section key={h}>
                <h2>{h}</h2>
                <p>{p}</p>
              </section>
            ))}
          </main>
        }
      </LocalizedContent>
    );
  }
  notFound();
}
