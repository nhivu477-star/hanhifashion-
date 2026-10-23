import { SupportChat } from "./support-chat";
import { FeedbackAdmin } from "./customer-feedback";
import { FeedbackForm } from "./feedback-forms";
import { PackingChecklist } from "./packing-checklist";
import { Stocktakes } from "./stocktakes";
import { partialCancellationEnabled } from "@/lib/partial-cancellation";
import { PartialCancellation } from "./partial-cancellation";
import { CustomerProfile } from "./customer-profile";
import { OperationalKpis } from "./operational-kpis";
import { sections, reportFilter } from "@/lib/analytics-rules";
import { analyticsPermission } from "@/lib/analytics-access";
import { AdminFrame } from "./admin-frame";
import { CurrencySettings } from "./currency-settings";
import { LocalizedContent } from "@/components/localization";
import { InventoryOperationForm } from "./inventory-operation-form";
import { AnalyticsAdmin } from "./analytics-admin";
import { AccountAdmin } from "./account-admin";
import { AdminPagination, adminPage } from "./admin-pagination";
import { qualityInclude, productQuality } from "@/lib/product-quality";
import { StaffAdmin, AuditAdmin, PermissionOverview } from "./staff-admin";
import { can, isStaff, adminPagePermission, rolePermissions } from "@/lib/rbac";
import { accountLoginDestination } from "@/lib/account-types";
import { ReturnsAdmin } from "./returns";
import { ShippingAdmin } from "./shipping-admin";
import { OrderActions } from "./order-actions";
import { shippingLabels } from "@/lib/order-lifecycle";
import { MediaLibrary } from "./media-library";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { money, statusLabels, transitions, colors, sizes } from "@/lib/catalog";
import { Params, scalar } from "@/lib/queries";
import { SimpleForm, ActionButton } from "./store";
import { ProductFeaturesEditor } from "./product-features-editor";
import { ProductEditor, CollectionEditor } from "./admin-client";
const tabs = [
  ["", "Tổng quan"],
  ["san-pham", "Sản phẩm"],
  ["thu-vien-anh", "Thư viện ảnh & bản quyền"],
  ["danh-muc", "Danh mục"],
  ["bo-suu-tap", "Bộ sưu tập"],
  ["don-hang", "Đơn hàng"],
  ["van-chuyen", "Vận chuyển & COD"],
  ["doi-tra", "Đổi trả & hoàn"],
  ["khach-hang", "Khách hàng"],
  ["nhan-vien", "Nhân viên"],
  ["tai-khoan", "Tài khoản"],
  ["phan-quyen", "Quyền truy cập"],
  ["nhat-ky", "Nhật ký vận hành"],
  ["kho-hang", "Kho hàng"],
  ["ma-giam-gia", "Mã giảm giá"],
  ["banner", "Banner"],
  ["phan-tich", "Phân tích kinh doanh"],
  ["cai-dat", "Cài đặt"],
  ["lien-he", "Tin nhắn khách hàng"],
];
export async function AdminPage({
  path,
  query,
}: {
  path: string[];
  query: Params;
}) {
  const user = await currentUser();
  if (!user)
    redirect(
      "/dang-nhap?returnTo=" +
        encodeURIComponent(
          "/admin/" +
            path.join("/") +
            (Object.keys(query).length
              ? "?" +
                new URLSearchParams(
                  Object.entries(query).map(([k, v]) => [k, scalar(v)]),
                ).toString()
              : ""),
        ),
    );
  if (!isStaff(user.role))
    return (
      <LocalizedContent>
        {
          <main className="container empty">
            <h1>Quyền truy cập bị giới hạn</h1>
            <p>Chỉ nhân viên bán hàng và quản trị viên mới có thể truy cập khu vực này.</p>
            <Link className="button" href="/tai-khoan">
              VỀ TÀI KHOẢN
            </Link>
          </main>
        }
      </LocalizedContent>
    );
  const tab = path[0] ?? "";
  if (tab === "" && user.role === "SELLER")
    redirect(accountLoginDestination(user.role));
  if (!adminPagePermission[tab] || !can(user.role, adminPagePermission[tab]))
    return (
      <LocalizedContent>
        {
          <main className="container empty">
            <h1>Không có quyền truy cập</h1>
            <p>Vai trò {user.role} không có quyền xem chức năng này.</p>
            <Link href={accountLoginDestination(user.role)}>Về chức năng được cấp</Link>
          </main>
        }
      </LocalizedContent>
    );
  const grants = rolePermissions[user.role] ?? [];

  let view: React.ReactNode;
  if (tab === "phan-tich" || tab === "") {
    view = <AnalyticsAdmin query={query} role={user.role} section={path[1]} />;
  } else if (tab === "tai-khoan") {
    view = <AccountAdmin user={user} query={query} />;
  } else if (tab === "nhan-vien") {
    view = <StaffAdmin user={user} query={query} />;
  } else if (tab === "nhat-ky") {
    view = <AuditAdmin query={query} />;
  } else if (tab === "phan-quyen") {
    view = <PermissionOverview role={user.role} />;
  } else if (tab === "doi-tra") {
    view = <ReturnsAdmin id={path[1]} query={query} role={user.role} />;
  } else if (tab === "van-chuyen") {
    view = <ShippingAdmin id={path[1]} query={query} role={user.role} />;
  } else if (tab === "thu-vien-anh") {
    view = <MediaLibrary query={query} />;
  } else if (tab === "san-pham") {
    if (path[1]) {
      const product =
        path[1] === "moi"
          ? null
          : await db.product.findUnique({
              where: { id: path[1] },
              include: {
                images: true,
                variants: true,
                collections: true,
                category: { include: { sizeChart: true } },
                sizeChart: true,
                colors: {
                  orderBy: { position: "asc" },
                  include: {
                    images: { orderBy: { position: "asc" } },
                    outfits: { include: { items: true } },
                  },
                },
              },
            });
      if (path[1] !== "moi" && !product) notFound();
      const [categories, collections] = await Promise.all([
        db.category.findMany(),
        db.collection.findMany(),
      ]);
      view = (
        <>
          <h2>{product ? "Chỉnh sửa thiết kế" : "Thêm thiết kế mới"}</h2>
          <ProductEditor
            product={product}
            categories={categories}
            collections={collections}
          />
          {product && (
            <>
              <ProductFeaturesEditor
                product={product}
                products={await db.product.findMany({
                  where: { active: true },
                  select: {
                    id: true,
                    name: true,
                    colors: { select: { id: true, name: true } },
                  },
                })}
              />
              <h2>Biến thể & tồn kho</h2>
              {product.variants.map((v) => (
                <details key={v.id}>
                  <summary>
                    {v.sku} · {v.color} / {v.size} · Còn {v.stock}
                  </summary>
                  <SimpleForm
                    action="admin/variant"
                    initial={v}
                    fields={
                      can(user.role, "inventory.adjust")
                        ? variantFields
                        : variantFields.filter(
                            (f) =>
                              f.name !== "stock" && f.name !== "stockOrigin",
                          )
                    }
                  />
                </details>
              ))}
              <h3>Thêm biến thể</h3>
              <SimpleForm
                action="admin/variant"
                initial={{
                  productId: product.id,
                  colorHex: "#c7b59d",
                  stock: 0,
                }}
                fields={
                  can(user.role, "inventory.adjust")
                    ? variantFields
                    : variantFields.filter(
                        (f) => f.name !== "stock" && f.name !== "stockOrigin",
                      )
                }
              />
            </>
          )}
        </>
      );
    } else {
      const q = scalar(query.q);
      const page = adminPage(query);
      const where = q
        ? {
            OR: [
              { searchText: { contains: q.toLowerCase() } },
              { sku: { contains: q } },
            ],
          }
        : {};
      const [products, count] = await Promise.all([
        db.product.findMany({
          where,
          include: qualityInclude,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: 24,
          skip: (page - 1) * 24,
        }),
        db.product.count({ where }),
      ]);
      view = (
        <>
          <div className="between">
            <form className="search-form">
              <input
                name="q"
                aria-label="Tìm sản phẩm quản trị"
                placeholder="Tên hoặc SKU"
                defaultValue={q}
              />
              <button className="button">TÌM</button>
            </form>
            <Link href="/admin/san-pham/moi" className="button">
              THÊM SẢN PHẨM
            </Link>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá bán</th>
                  <th>Kho</th>
                  <th>Trạng thái</th>
                  <th>Chất lượng dữ liệu</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.sku}</td>
                    <td>{p.name}</td>
                    <td>{p.category.name}</td>
                    <td>{money(p.salePrice ?? p.price)}</td>
                    <td>{p.variants.reduce((n, v) => n + v.stock, 0)}</td>
                    <td>
                      {p.active ? "Hiển thị nội bộ" : "Lưu trữ"}
                      <br />
                      {p.publicationStatus}
                      <br />
                      <Link href={"/admin/thu-vien-anh?product=" + p.id}>
                        Ảnh & duyệt mở bán
                      </Link>
                    </td>
                    <td>
                      <strong>{productQuality(p).status}</strong>
                      <details>
                        <summary>Chi tiết kiểm tra</summary>
                        <p>
                          {[
                            ...productQuality(p).invalid,
                            ...productQuality(p).missing,
                            ...productQuality(p).review,
                          ].join(", ") ||
                            "Đủ trường dữ liệu; cần đối chiếu audit tệp ảnh."}
                        </p>
                      </details>
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        href={"/admin/san-pham/" + p.id}
                      >
                        Sửa
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination query={query} page={page} count={count} />
        </>
      );
    }
  } else if (tab === "don-hang") {
    if (path[1]) {
      const o = await db.order.findUnique({
        where: { id: path[1] },
        include: {
          items: true,
          history: { orderBy: { createdAt: "desc" } },
          payments: true,
          shipment: true,
        },
      });
      if (!o) notFound();
      const operators = can(user.role, "orders.manage")
        ? (
            await db.user.findMany({
              where: { active: true },
              select: { id: true, name: true, role: true },
            })
          ).filter((u) => can(u.role, "orders.manage"))
        : [];
      view = (
        <>
          <h2>{o.code}</h2>
          <p>
            {o.name} · {o.email} · {o.phone}
          </p>
          <p>
            {o.street}, {o.ward}, {o.province} {o.details}
          </p>
          <p>Ghi chú: {o.notes || "Không có"}</p>
          <p>
            <strong>{statusLabels[o.status]}</strong> ·{" "}
            {statusLabels[o.paymentStatus]}
          </p>
          <p>
            Giao nhận thủ công: {shippingLabels[o.shippingStatus]}
            {o.shippingReference ? ` · ${o.shippingReference}` : ""}
          </p>
          {o.shipment && (
            <p>
              <Link href={`/admin/van-chuyen/${o.shipment.id}`}>
                Hồ sơ giao nhận & COD: {o.shipment.reference} →
              </Link>
            </p>
          )}
          {o.packedAt && (
            <p>Đã đóng gói: {o.packedAt.toLocaleString("vi-VN")}</p>
          )}
          {o.packingHoldReason && (
            <p role="alert">Tạm dừng đóng gói: {o.packingHoldReason}</p>
          )}
          {can(user.role, "orders.manage") &&
            o.status === "PROCESSING" &&
            !o.packedAt &&
            !o.shipment && <PackingChecklist id={o.id} items={o.items} />}
          {can(user.role, "orders.manage") &&
            !["COMPLETED", "CANCELLED"].includes(o.status) && (
              <details>
                <summary>Phân công và ưu tiên xử lý</summary>
                <SimpleForm
                  action="admin/order/assign"
                  initial={{
                    id: o.id,
                    assignedTo: o.assignedTo ?? "",
                    priority: o.priority,
                  }}
                  fields={[
                    {
                      name: "assignedTo",
                      label: "Nhân viên phụ trách",
                      type: "select",
                      required: false,
                      options: [
                        { value: "", label: "Chưa phân công" },
                        ...operators.map((u) => ({
                          value: u.id,
                          label: u.name,
                        })),
                      ],
                    },
                    {
                      name: "priority",
                      label: "Mức ưu tiên",
                      type: "select",
                      options: [
                        { value: "NORMAL", label: "Bình thường" },
                        { value: "HIGH", label: "Ưu tiên" },
                      ],
                    },
                    { name: "reason", label: "Lý do phân công" },
                  ]}
                />
              </details>
            )}
          <OrderActions
            hasShipment={!!o.shipment}
            id={o.id}
            items={o.items}
            status={o.status}
            paymentStatus={o.paymentStatus}
            admin
            grants={grants}
          />
          {(await partialCancellationEnabled()) &&
            can(user.role, "orders.cancel") &&
            ["PENDING", "CONFIRMED"].includes(o.status) &&
            o.paymentStatus === "UNPAID" &&
            !o.shipment && (
              <PartialCancellation id={o.id} items={o.items} admin />
            )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Biến thể</th>
                  <th>Số lượng</th>
                  <th>Đơn giá</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      {i.name}
                      <br />
                      {i.sku}
                    </td>
                    <td>
                      {i.color} / {i.size}
                    </td>
                    <td>
                      {i.quantity}
                      {i.originalQuantity != null && (
                        <small> / {i.originalQuantity} đã đặt</small>
                      )}
                    </td>
                    <td>{money(i.unitPrice)}</td>
                    <td>{money(i.quantity * i.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Tạm tính {money(o.subtotal)} · Giảm {money(o.discount)} · Giao hàng{" "}
            {money(o.shipping)}
          </p>
          <h3>Tổng cộng: {money(o.total)}</h3>
          {can(user.role, "cod.read") && (
            <>
              <h2>Ghi nhận thanh toán COD</h2>
              {o.payments.map((p) => (
                <p key={p.id}>
                  {money(p.amount)} · {statusLabels[p.status]}
                  {p.collectedAt
                    ? ` · ${p.collectedAt.toISOString()} · Người ghi nhận: ${p.collectedBy} · Chứng từ: ${p.collectionReference}`
                    : " · Chưa có thông tin đối soát mới"}
                </p>
              ))}
            </>
          )}
          {can(user.role, "inventory.movements.read") && (
            <>
              <h2>Điều chỉnh kho theo đơn</h2>
              {(
                await db.inventoryMovement.findMany({
                  where: { orderId: o.id },
                  orderBy: { createdAt: "asc" },
                })
              ).map((m) => (
                <p key={m.id}>
                  {m.createdAt.toISOString()} · {m.variantId} ·{" "}
                  {m.delta > 0 ? "+" : ""}
                  {m.delta} · {m.reason} · {m.actorId}
                </p>
              ))}
            </>
          )}
          <h2>Lịch sử xử lý</h2>
          {o.history.map((h) => (
            <p key={h.id}>
              {h.createdAt.toLocaleString("vi-VN")} · {statusLabels[h.status]}
              <br />
              {h.event === "COD_COLLECTED"
                ? "Ghi nhận thu COD · "
                : h.previousStatus
                  ? `${statusLabels[h.previousStatus]} → ${statusLabels[h.status]} · `
                  : ""}
              {h.actorLabel ?? "Bản ghi cũ (chưa có người ghi nhận)"} ·{" "}
              {h.event.startsWith("COD_") && !can(user.role, "cod.read")
                ? "Cập nhật trạng thái thanh toán"
                : h.note}
            </p>
          ))}
        </>
      );
    } else {
      const q = scalar(query.q);
      const status = scalar(query.status);
      const page = adminPage(query);
      const from = scalar(query.from),
        to = scalar(query.to),
        priority = scalar(query.priority);
      let range: ReturnType<typeof reportFilter> | undefined,
        filterError = "";
      if (from || to) {
        try {
          if (!from || !to) throw Error("Chọn đủ ngày bắt đầu và kết thúc.");
          range = reportFilter({ period: "custom", from, to });
        } catch {
          filterError = "Khoảng ngày lọc đơn hàng không hợp lệ.";
        }
      }
      const where = {
        ...(filterError ? { id: "" } : {}),
        ...(range ? { createdAt: { gte: range.from, lt: range.to } } : {}),
        ...(["NORMAL", "HIGH"].includes(priority) ? { priority } : {}),
        ...(q
          ? {
              OR: [
                { code: { contains: q } },
                { name: { contains: q } },
                { phone: { contains: q } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
      };
      const [orders, count] = await Promise.all([
        db.order.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: 24,
          skip: (page - 1) * 24,
        }),
        db.order.count({ where }),
      ]);
      view = (
        <>
          <form className="search-form">
            <input
              name="q"
              aria-label="Tìm đơn hàng"
              placeholder="Mã đơn, tên, điện thoại"
              defaultValue={q}
            />
            <select
              name="status"
              aria-label="Lọc trạng thái"
              defaultValue={status}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.keys(transitions).map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="from"
              aria-label="Đơn hàng từ ngày"
              defaultValue={from}
            />
            <input
              type="date"
              name="to"
              aria-label="Đơn hàng đến ngày"
              defaultValue={to}
            />
            <select
              name="priority"
              aria-label="Lọc mức ưu tiên"
              defaultValue={priority}
            >
              <option value="">Mọi mức ưu tiên</option>
              <option value="HIGH">Ưu tiên</option>
              <option value="NORMAL">Bình thường</option>
            </select>
            <button className="button">LỌC</button>
          </form>
          {filterError && <p role="alert">{filterError}</p>}
          <div className="admin-list-meta">
            <span>{count.toLocaleString("vi-VN")} đơn hàng</span>
            <span>Mới nhất trước</span>
          </div>
          <OrderTable orders={orders} />
          <AdminPagination query={query} page={page} count={count} />
        </>
      );
    }
  } else if (tab === "kho-hang") {
    const q = scalar(query.q);
    const page = Math.max(1, Number(scalar(query.page)) || 1);
    const where = {
      ...(q
        ? {
            OR: [
              { sku: { contains: q } },
              { product: { name: { contains: q } } },
            ],
          }
        : {}),
      ...(query.low ? { stock: { lt: 5 } } : {}),
    };
    const [variants, count, movements] = await Promise.all([
      db.productVariant.findMany({
        where,
        include: { product: true },
        take: 30,
        skip: (page - 1) * 30,
        orderBy: { stock: "asc" },
      }),
      db.productVariant.count({ where }),
      db.inventoryMovement.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { variant: true },
      }),
    ]);
    view = (
      <>
        <form className="search-form">
          <input
            name="q"
            aria-label="Tìm kho"
            placeholder="SKU hoặc tên"
            defaultValue={q}
          />
          <label className="check-label">
            <input
              name="low"
              type="checkbox"
              value="1"
              defaultChecked={Boolean(query.low)}
            />
            Sắp hết hàng
          </label>
          <button className="button">LỌC</button>
        </form>
        {can(user.role, "inventory.adjust") && <InventoryOperationForm />}
        <p>{count} biến thể</p>
        {variants.map((v) => (
          <details key={v.id}>
            <summary>
              <strong>
                {v.stock < 5 ? "Sắp hết · " : ""}
                {v.sku}
              </strong>{" "}
              · {v.product.name} · {v.color} / {v.size} · Tồn: {v.stock}
            </summary>
            {can(user.role, "inventory.adjust") && (
              <SimpleForm
                action="admin/stock"
                initial={{ variantId: v.id, stock: v.stock }}
                fields={[
                  {
                    name: "stock",
                    label: "Tồn kho mới",
                    type: "number",
                    min: 0,
                  },
                  { name: "reason", label: "Lý do nhập hoặc điều chỉnh" },
                ]}
              />
            )}
          </details>
        ))}
        <div className="pagination">
          {page > 1 && (
            <Link
              href={`?page=${page - 1}&q=${encodeURIComponent(q)}${query.low ? "&low=1" : ""}`}
            >
              ← Trước
            </Link>
          )}
          {page * 30 < count && (
            <Link
              href={`?page=${page + 1}&q=${encodeURIComponent(q)}${query.low ? "&low=1" : ""}`}
            >
              Tiếp →
            </Link>
          )}
        </div>
        <Stocktakes role={user.role} />
        <h2>Nhật ký kho gần đây</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>SKU</th>
                <th>Thay đổi</th>
                <th>Lý do</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>
                    {(m.occurredAt ?? m.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td>{m.variant.sku}</td>
                  <td>
                    {m.delta > 0 ? "+" : ""}
                    {m.delta}
                  </td>
                  <td>
                    {m.reason}
                    {m.supplier && ` · ${m.supplier}`}
                    {m.notes && ` · ${m.notes}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  } else if (tab === "khach-hang") {
    if (path[1])
      view = <CustomerProfile id={path[1]} role={user.role} query={query} />;
    else {
      const users = await db.user.findMany({
        where: { role: "CUSTOMER" },
        include: {
          orders: { select: { id: true, total: true, paymentStatus: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      view = (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tên / Email</th>
                <th>Điện thoại</th>
                <th>Ngày tạo</th>
                <th>Đơn</th>
                <th>Đã chi trả</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link
                      href={"/admin/khach-hang/" + u.id}
                      data-localize="off"
                    >
                      {u.name}
                    </Link>
                    <br />
                    {u.email}
                  </td>
                  <td>{u.phone}</td>
                  <td>{u.createdAt.toLocaleDateString("vi-VN")}</td>
                  <td>{u.orders.length}</td>
                  <td>
                    {money(
                      u.orders
                        .filter((o) => o.paymentStatus === "PAID")
                        .reduce((n, o) => n + o.total, 0),
                    )}
                  </td>
                  <td>
                    {can(user.role, "customers.manage") && (
                      <ActionButton
                        action="admin/customer"
                        data={{ id: u.id, active: !u.active }}
                      >
                        {u.active ? "Khóa tài khoản" : "Mở tài khoản"}
                      </ActionButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  } else if (tab === "danh-muc") {
    const cats = await db.category.findMany({
      include: { _count: { select: { products: true } } },
    });
    const fields = [
      { name: "name", label: "Tên danh mục" },
      { name: "slug", label: "Đường dẫn" },
      { name: "description", label: "Mô tả", type: "textarea" },
      { name: "image", label: "Đường dẫn ảnh", value: undefined },
      {
        name: "parentId",
        label: "Danh mục cha",
        required: false,
        options: [
          { value: "", label: "Danh mục chính" },
          ...cats
            .filter((c) => !c.parentId)
            .map((c) => ({ value: c.id, label: c.name })),
        ],
      },
      { name: "sortOrder", label: "Thứ tự trong menu", type: "number", min: 0 },
      {
        name: "active",
        label: "Hiển thị trong menu và bộ lọc",
        type: "checkbox",
      },
    ];
    view = (
      <>
        {cats.map((c) => (
          <details key={c.id}>
            <summary>
              {c.parentId
                ? cats.find((p) => p.id === c.parentId)?.name + " / "
                : ""}
              {c.name} · {c._count.products} sản phẩm
            </summary>
            <SimpleForm action="admin/category" initial={c} fields={fields} />
          </details>
        ))}
        <h2>Thêm danh mục</h2>
        <SimpleForm
          action="admin/category"
          initial={{
            image: "",
            active: true,
            sortOrder: 0,
          }}
          fields={fields}
        />
      </>
    );
  } else if (tab === "bo-suu-tap") {
    const [collections, products] = await Promise.all([
      db.collection.findMany({ include: { products: true } }),
      db.product.findMany({
        select: { id: true, name: true, sku: true },
        orderBy: { sku: "asc" },
      }),
    ]);
    view = (
      <>
        {collections.map((c) => (
          <details key={c.id}>
            <summary>
              {c.name} · {c.products.length} sản phẩm
            </summary>
            <CollectionEditor collection={c} products={products} />
          </details>
        ))}
        <h2>Thêm bộ sưu tập</h2>
        <CollectionEditor products={products} />
      </>
    );
  } else if (tab === "ma-giam-gia") {
    const coupons = await db.coupon.findMany();
    const fields = [
      { name: "code", label: "Mã giảm giá" },
      {
        name: "type",
        label: "Loại",
        options: [
          { value: "PERCENT", label: "Phần trăm" },
          { value: "FIXED", label: "Số tiền cố định" },
        ],
      },
      { name: "value", label: "Giá trị", type: "number", min: 1 },
      { name: "minimum", label: "Đơn tối thiểu", type: "number", min: 0 },
      {
        name: "maximum",
        label: "Giảm tối đa (để trống: không giới hạn)",
        type: "number",
        required: false,
        min: 0,
      },
      {
        name: "startsAt",
        label: "Ngày bắt đầu (giờ Việt Nam)",
        type: "datetime-local",
        required: false,
      },
      {
        name: "expiresAt",
        label: "Ngày hết hạn (giờ Việt Nam)",
        type: "datetime-local",
      },
      {
        name: "usageLimit",
        label: "Giới hạn lượt dùng",
        type: "number",
        min: 1,
      },
      { name: "active", label: "Kích hoạt", type: "checkbox" },
    ];
    view = (
      <>
        {coupons.map((c) => (
          <details key={c.id}>
            <summary>
              {c.code} · {c.used}/{c.usageLimit} lượt ·{" "}
              {c.active ? "Đang bật" : "Tắt"}
            </summary>
            <SimpleForm
              action="admin/coupon"
              initial={{
                ...c,
                startsAt: c.startsAt
                  ? new Date(c.startsAt.getTime() + 7 * 3600000)
                      .toISOString()
                      .slice(0, 16)
                  : "",
                expiresAt: new Date(c.expiresAt.getTime() + 7 * 3600000)
                  .toISOString()
                  .slice(0, 16),
              }}
              fields={fields}
            />
          </details>
        ))}
        <h2>Thêm mã giảm giá</h2>
        <SimpleForm
          action="admin/coupon"
          initial={{ minimum: 0, active: true }}
          fields={fields}
        />
      </>
    );
  } else if (tab === "banner") {
    const banners = await db.banner.findMany();
    const fields = [
      { name: "title", label: "Tiêu đề" },
      { name: "subtitle", label: "Mô tả" },
      { name: "image", label: "Đường dẫn ảnh nội bộ" },
      { name: "href", label: "Liên kết nội bộ" },
      { name: "active", label: "Kích hoạt", type: "checkbox" },
    ];
    view = (
      <>
        <p>Banner đang bật đầu tiên được hiển thị trên trang chủ.</p>
        {banners.map((b) => (
          <details key={b.id}>
            <summary>{b.title}</summary>
            <SimpleForm action="admin/banner" initial={b} fields={fields} />
          </details>
        ))}
        <h2>Thêm banner</h2>
        <SimpleForm
          action="admin/banner"
          initial={{
            image: "",
            href: "/hang-moi",
            active: true,
          }}
          fields={fields}
        />
      </>
    );
  } else if (tab === "lien-he") {
    const messages = await db.inquiry.findMany({
      where: { userId: null },
      orderBy: { createdAt: "desc" },
      take: 24,
      include: { replies: { orderBy: { createdAt: "asc" } } },
    });
    view = (
      <>
        <SupportChat userId={user.id} staff />
        <FeedbackAdmin role={user.role} />
        <h2>Liên hệ từ khách chưa đăng nhập</h2>
        {messages.length ? (
          messages.map((m) => (
            <article className="message" key={m.id}>
              <h2>{m.subject}</h2>
              <p>
                {m.name} · <a href={"mailto:" + m.email}>{m.email}</a>{" "}
                {m.phone && <a href={"tel:" + m.phone}> · {m.phone}</a>}
              </p>
              <p className="small muted">
                {m.createdAt.toLocaleString("vi-VN")} ·{" "}
                {
                  (
                    {
                      NEW: "Mới",
                      READ: "Đã đọc",
                      RESOLVED: "Đã xử lý",
                    } as Record<string, string>
                  )[m.status]
                }
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>{m.message}</p>
              {m.replies.map((reply) => (
                <p key={reply.id}>{reply.content}</p>
              ))}
              {can(user.role, "inquiries.manage") && (
                <FeedbackForm
                  action="support/reply"
                  initial={{ id: m.id }}
                  title="Phản hồi cho khách hàng"
                />
              )}
              <div className="admin-actions">
                <ActionButton
                  action="admin/inquiry"
                  data={{ id: m.id, status: "READ" }}
                >
                  Đánh dấu đã đọc
                </ActionButton>
                <ActionButton
                  action="admin/inquiry"
                  data={{ id: m.id, status: "RESOLVED" }}
                >
                  Đã xử lý
                </ActionButton>
              </div>
            </article>
          ))
        ) : (
          <p>Chưa có yêu cầu liên hệ.</p>
        )}
      </>
    );
  } else if (tab === "cai-dat") {
    const settings = Object.fromEntries(
      (await db.storeSetting.findMany()).map((s) => [s.key, s.value]),
    );
    const messages = await db.auditLog.findMany({
      where: { action: "CONTACT" },
      take: 20,
      orderBy: { createdAt: "desc" },
    });
    const subscribers = await db.newsletter.count();
    view = (
      <>
        <CurrencySettings />
        <SimpleForm
          action="admin/settings"
          initial={settings}
          fields={[
            { name: "announcement", label: "Thông báo đầu trang" },
            {
              name: "brandStory",
              label: "Câu chuyện thương hiệu",
              type: "textarea",
            },
            {
              name: "newsletter",
              label: "Nội dung đăng ký nhận tin",
              type: "textarea",
            },
            { name: "contactEmail", label: "Email liên hệ", type: "email" },
            { name: "contactPhone", label: "Điện thoại hiển thị" },
            { name: "facebookUrl", label: "Facebook (HTTPS)", type: "url" },
            { name: "instagramUrl", label: "Instagram (HTTPS)", type: "url" },
            { name: "footerAddress", label: "Địa chỉ chân trang" },
            {
              name: "salesPolicy",
              label: "Thông tin bán hàng bổ sung",
              type: "textarea",
              required: false,
            },
            {
              name: "returnsInstructions",
              label:
                "Hướng dẫn tiếp nhận đổi trả (chính sách lỗi 72 giờ vẫn áp dụng)",
              type: "textarea",
              required: false,
            },
            {
              name: "sizeGuide",
              label:
                "Bảng size (JSON: size, bust, waist, hip, shoulder, length, sleeve, trouser, skirt)",
              type: "textarea",
            },
          ]}
        />
        <h2>Hộp thư local</h2>
        <p>{subscribers} địa chỉ đã đăng ký nhận tin.</p>
        {messages.length ? (
          messages.map((m) => {
            const d = JSON.parse(m.detail);
            return (
              <article className="message" key={m.id}>
                <h3>{d.name}</h3>
                <p>
                  {d.email} · {m.createdAt.toLocaleString("vi-VN")}
                </p>
                <p>{d.message}</p>
              </article>
            );
          })
        ) : (
          <p>Chưa có tin nhắn liên hệ.</p>
        )}
      </>
    );
  } else notFound();
  return (
    <LocalizedContent>
      {
        <AdminFrame
          tab={tab}
          activePath={path.join("/")}
          name={user.name}
          role={user.role}
          notifications={
            can(user.role, "orders.read")
              ? await db.order.count({ where: { status: "PENDING" } })
              : null
          }
          analyticsLinks={sections
            .filter(
              (s) => s !== "overview" && can(user.role, analyticsPermission[s]),
            )
            .map((s) => [
              "phan-tich/" + s,
              (
                {
                  sales: "Doanh số",
                  products: "Phân tích sản phẩm",
                  customers: "Phân tích khách hàng",
                  funnel: "Phễu chuyển đổi",
                  inventory: "Phân tích tồn kho",
                  profit: "Lợi nhuận",
                  finance: "COD & đối soát",
                  carts: "Giỏ bỏ dở",
                  marketing: "Nguồn tiếp cận",
                  reports: "Báo cáo & xuất dữ liệu",
                } as Record<string, string>
              )[s],
            ])}
          tabs={tabs.filter(
            ([slug]) =>
              adminPagePermission[slug] &&
              can(user.role, adminPagePermission[slug]) &&
              (slug !== "" || can(user.role, analyticsPermission.overview)),
          )}
        >
          {!path[1] && ["don-hang", "khach-hang", "san-pham"].includes(tab) && (
            <OperationalKpis page={tab} role={user.role} />
          )}
          {view}
        </AdminFrame>
      }
    </LocalizedContent>
  );
}
const variantFields = [
  { name: "sku", label: "SKU biến thể" },
  {
    name: "size",
    label: "Kích cỡ",
    options: [
      ...sizes,
      "Free size",
      "One size",
      "35",
      "36",
      "37",
      "38",
      "39",
      "40",
      "41",
      "42",
      "43",
      "44",
    ].map((s) => ({ value: s, label: s })),
  },
  {
    name: "color",
    label: "Màu",
  },
  { name: "colorHex", label: "Màu HEX", type: "color" },
  { name: "stock", label: "Tồn kho", type: "number", min: 0 },
  {
    name: "stockOrigin",
    label: "Nguồn tồn kho",
    options: [
      { value: "UNVERIFIED", label: "Chưa xác minh" },
      { value: "SAMPLE", label: "Tồn mẫu nội bộ" },
      { value: "VERIFIED", label: "Đã kiểm hàng thực tế" },
    ],
  },
  {
    name: "priceOverride",
    label: "Giá riêng biến thể (để trống dùng giá sản phẩm)",
    type: "number",
    min: 1,
    required: false,
  },
];
function OrderTable({ orders }: { orders: any[] }) {
  return orders.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Mã đơn</th>
            <th>Khách hàng</th>
            <th>Trạng thái</th>
            <th>Thanh toán</th>
            <th>Tổng tiền</th>
            <th>Ngày tạo</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <Link className="text-link" href={"/admin/don-hang/" + o.id}>
                  {o.code}
                </Link>
              </td>
              <td>{o.name}</td>
              <td>
                <span
                  className={
                    "admin-status admin-status-" + o.status.toLowerCase()
                  }
                >
                  {statusLabels[o.status]}
                </span>
              </td>
              <td>
                <span
                  className={
                    "admin-status admin-status-" + o.paymentStatus.toLowerCase()
                  }
                >
                  {statusLabels[o.paymentStatus]}
                </span>
              </td>
              <td>{money(o.total)}</td>
              <td>{o.createdAt.toLocaleDateString("vi-VN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p>Chưa có đơn hàng phù hợp.</p>
  );
}
