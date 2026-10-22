import { saveCustomerAddress } from "@/lib/customer-addresses";
import {
  createReview,
  replyFeedback,
  moderateReview,
} from "@/lib/customer-feedback";
import { packOrder, assignOrder } from "@/lib/order-operations";
import { createStocktake, changeStocktake } from "@/lib/stocktakes";
import { saveSupportingEntity } from "@/lib/supporting-entities";
import { saveProduct } from "@/lib/product-management";
import { cancelOrderItems } from "@/lib/partial-cancellation";
import { savePromotion, validPromotion } from "@/lib/promotions";
import { saveStoreSettings } from "@/lib/store-settings";
import { mutationReceipt, requestFingerprint } from "@/lib/mutation-receipt";
import { customerAddressSchema, regions } from "@/lib/localization/config";
import { readPreferences } from "@/lib/localization/server";
import { moveStock } from "@/lib/inventory-operations";
import {
  visitorSession,
  trackEvent,
  updateCartAnalytics,
  captureOrderAnalytics,
} from "@/lib/analytics-tracking";
import { randomUUID } from "node:crypto";
import { logRejection } from "@/lib/observability";
import { safeReturnTo } from "@/lib/safe-redirect";
import {
  inspectLocalImage,
  localImagePattern,
  optimizeUploadedImage,
} from "@/lib/local-images";
import { deleteMediaAsset } from "@/lib/media";
import { operationalAudit, requireActorPermission } from "@/lib/authorization";
import { adminSnapshot } from "@/lib/admin-audit";
import { createStaff, updateStaff } from "@/lib/staff";
import { manageAccount } from "@/lib/managed-accounts";
import { accountLoginDestination } from "@/lib/account-types";
import { authorizeAdminAction } from "@/lib/admin-authorization";
import { can, isStaff, AuthorizationError } from "@/lib/rbac";
import {
  createReturn,
  changeReturn,
  inspectReturn,
  allocateExchange,
  exchangeStatus,
  prepareRefund,
  changeRefund,
  customerReturnSelect,
} from "@/lib/returns";
import {
  createShipment,
  updateShipment,
  recordCOD,
  reconcileCOD,
  publicShipmentSelect,
} from "@/lib/shipping";
import { revalidatePath } from "next/cache";
import { changeOrder, orderTransaction } from "@/lib/order-lifecycle";
import sharp from "sharp";
import {
  commercialMode,
  publicationFilter,
  assertProductReady,
} from "@/lib/publication";
import { saveMediaAsset, savePublication } from "@/lib/media";
import { saveCatalogFeature } from "@/lib/catalog-admin";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hash, compare } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { refreshSearch } from "@/lib/search";
import {
  currentUser,
  requireUser,
  createSession,
  mergeCartAndWishlist,
  getCart,
  token,
  digest,
  rateLimit,
  clearRateLimit,
} from "@/lib/auth";
import { effectivePrice, calculateTotals, normalize } from "@/lib/catalog";
import { catalogQuery } from "@/lib/queries";
import { mkdir, writeFile } from "node:fs/promises";
const customer = customerAddressSchema;
function checkOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (
    origin &&
    origin !== `${req.nextUrl.protocol}//${req.headers.get("host")}`
  )
    throw new Error("Yêu cầu không hợp lệ.");
}
const ok = (data: unknown) =>
  NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
async function refreshOrderViews(id: string) {
  const order = await db.order.findUniqueOrThrow({
    where: { id },
    select: { code: true },
  });
  for (const path of [
    "/admin",
    "/admin/don-hang",
    `/admin/don-hang/${id}`,
    "/tai-khoan/don-hang",
    `/tai-khoan/don-hang/${id}`,
    `/dat-hang-thanh-cong/${order.code}`,
  ])
    revalidatePath(path);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ action: string[] }> },
) {
  try {
    const action = (await params).action.join("/");
    const u = await currentUser();
    if (action.startsWith("returns/")) {
      if (!u)
        return NextResponse.json(
          { error: "Không có quyền truy cập." },
          { status: 403 },
        );
      const r = await db.returnRequest.findFirst({
        where: {
          id: action.slice(8),
          ...(isStaff(u.role) && can(u.role, "returns.read")
            ? {}
            : { userId: u.id }),
        },
        select: customerReturnSelect,
      });
      if (r && isStaff(u.role) && !can(u.role, "refunds.read")) {
        r.refund = null;
        r.history = r.history.filter(
          (h) =>
            h.status !== "REFUND_PENDING" &&
            h.previousStatus !== "REFUND_PENDING",
        );
      }
      return r
        ? ok(r)
        : NextResponse.json(
            { error: "Không tìm thấy hồ sơ." },
            { status: 404 },
          );
    }
    if (action === "session")
      return ok({
        user: u
          ? {
              id: u.id,
              name: u.name,
              email: u.email,
              phone: u.phone,
              role: u.role,
            }
          : null,
      });
    if (action === "search") {
      const r = await catalogQuery(
        Object.fromEntries(req.nextUrl.searchParams),
      );
      if (r.filterError)
        return NextResponse.json({ error: r.filterError }, { status: 400 });
      return ok(r);
    }
    if (action === "cart") {
      const cart = await getCart();
      return ok(
        await db.cart.findUnique({
          where: { id: cart.id },
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    colorRecord: {
                      include: { images: { orderBy: { position: "asc" } } },
                    },
                    product: { include: { images: true } },
                  },
                },
              },
            },
          },
        }),
      );
    }
    if (action === "wishlist") {
      if (!u) return ok([]);
      return ok(
        await db.wishlistItem.findMany({
          where: {
            wishlist: { userId: u.id },
            product: { active: true, ...publicationFilter() },
          },
          include: {
            product: {
              include: {
                images: true,
                variants: {
                  where: {
                    OR: [{ colorId: null }, { colorRecord: { active: true } }],
                  },
                },
              },
            },
          },
        }),
      );
    }
    return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && !e.name.startsWith("Prisma")
            ? e.message
            : "Không thể tải dữ liệu. Vui lòng thử lại.",
      },
      { status: 400 },
    );
  }
}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string[] }> },
) {
  const requestId = randomUUID();
  try {
    checkOrigin(req);
    const action = (await params).action.join("/");
    if (action === "admin/upload") {
      const user = await requireUser(true);
      await authorizeAdminAction(user.role, action, {});
      const data = await req.formData();
      const file = data.get("file");
      if (!(file instanceof File) || file.size > 5 * 1024 * 1024)
        throw new Error("Chọn ảnh JPEG, PNG hoặc WebP tối đa 5 MB.");
      const bytes = Buffer.from(await file.arrayBuffer());
      let ext = "";
      if (
        bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      )
        ext = "png";
      else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
        ext = "jpg";
      else if (
        bytes.toString("ascii", 0, 4) === "RIFF" &&
        bytes.toString("ascii", 8, 12) === "WEBP"
      )
        ext = "webp";
      if (!ext) throw new Error("Định dạng ảnh không hợp lệ.");
      const filename = `${token()}.webp`;
      const optimized = await optimizeUploadedImage(bytes);
      await mkdir("public/uploads", { recursive: true });
      await writeFile(`public/uploads/${filename}`, optimized, {
        flag: "wx",
        mode: 0o600,
      });
      await db.auditLog.create({
        data: {
          actorId: user.id,
          action: "UPLOAD",
          targetId: filename,
          detail: "Local raster upload",
        },
      });
      return ok({ url: `/uploads/${filename}` });
    }
    if (
      (action === "returns" || action.startsWith("admin/returns/")) &&
      Number(req.headers.get("content-length") ?? 0) > 10000000
    )
      throw new Error("Nội dung yêu cầu quá lớn.");
    const b = await req.json();
    if (action.startsWith("admin/")) {
      const user = await requireUser(true);
      await authorizeAdminAction(user.role, action, b);
    }
    if (["login", "register", "forgot", "reset"].includes(action))
      rateLimit(
        "auth:" + req.headers.get("x-forwarded-for")?.split(",")[0],
        30,
      );
    if (action === "guest-wishlist") {
      const ids = z.array(z.string()).max(200).parse(b.ids);
      return ok(
        await db.product.findMany({
          where: { id: { in: ids }, active: true, ...publicationFilter() },
          include: {
            images: true,
            variants: {
              where: {
                OR: [{ colorId: null }, { colorRecord: { active: true } }],
              },
            },
          },
        }),
      );
    }
    if (action === "returns") {
      const user = await requireUser();
      rateLimit("return:" + user.id, 30);
      const d = z
        .object({
          orderId: z.string(),
          eventKey: z.string().uuid(),
          claimType: z.literal("DEFECT"),
          resolution: z.enum(["REFUND", "EXCHANGE"]),
          reason: z.string().trim().min(10).max(2000),
          items: z
            .array(
              z
                .object({
                  orderItemId: z.string(),
                  quantity: z.number().int().min(1).max(100),
                })
                .strict(),
            )
            .min(1)
            .max(100),
          evidence: z
            .array(z.object({ data: z.string().max(2800000) }).strict())
            .max(3)
            .default([]),
        })
        .strict()
        .parse(b);
      const evidence = [];
      for (const image of d.evidence) {
        const match =
          /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(
            image.data,
          );
        if (!match) throw new Error("Chỉ nhận ảnh JPEG, PNG hoặc WebP.");
        const raw = Buffer.from(match[2], "base64");
        if (raw.length > 2000000) throw new Error("Mỗi ảnh tối đa 2MB.");
        const safe = await sharp(raw, { limitInputPixels: 12000000 })
          .rotate()
          .resize({
            width: 1600,
            height: 1600,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 82 })
          .toBuffer();
        evidence.push({ mime: "image/jpeg", data: safe.toString("base64") });
      }
      const r = await createReturn(
        { ...d, evidence },
        { id: user.id, label: user.email, role: user.role as "CUSTOMER" },
      );
      await refreshOrderViews(r.orderId);
      revalidatePath("/admin/doi-tra");
      revalidatePath("/admin/lien-he");
      revalidatePath("/tai-khoan/ho-tro");
      return ok({ id: r.id, message: "Đã gửi yêu cầu đến cửa hàng. Bạn có thể nhắn Shop để trao đổi thêm." });
    }
    if (action.startsWith("admin/accounts/")) {
      const user = await requireUser(true);
      const result = await manageAccount(
        b,
        action.slice("admin/accounts/".length),
        { id: user.id, role: user.role, label: user.email },
      );
      revalidatePath("/admin/tai-khoan");
      revalidatePath("/admin/nhan-vien");
      return ok({
        ...result,
        message: "Đã lưu tài khoản; quyền và trạng thái mới có hiệu lực ngay.",
      });
    }
    if (action.startsWith("admin/staff/")) {
      const user = await requireUser(true),
        actor = { id: user.id, label: user.email, role: user.role };
      const operation = action.slice("admin/staff/".length);
      const result =
        operation === "create"
          ? await createStaff(b, actor)
          : await updateStaff(b, operation, actor);
      revalidatePath("/admin/nhan-vien");
      return ok({
        ...result,
        message:
          "Đã lưu nhân viên; các phiên cũ bị thu hồi khi thông tin/quyền thay đổi.",
      });
    }
    if (action.startsWith("admin/returns/")) {
      const user = await requireUser(true),
        actor = { id: user.id, label: user.email, role: user.role };
      const common = {
        id: z.string(),
        reason: z.string().trim().min(3).max(2000),
      };
      const op = action.slice("admin/returns/".length);
      let result: { id: string };
      if (op === "status") {
        const d = z
          .object({ ...common, status: z.string() })
          .strict()
          .parse(b);
        result = await changeReturn(d.id, d.status, d.reason, actor);
      } else if (op === "inspect") {
        const d = z
          .object({
            ...common,
            itemId: z.string(),
            condition: z.enum(["SELLABLE", "DAMAGED", "REJECTED", "REVIEW"]),
            evidence: z.string().trim().min(3).max(2000),
          })
          .strict()
          .parse(b);
        result = await inspectReturn(
          d.id,
          d.itemId,
          d.condition,
          d.reason,
          d.evidence,
          actor,
        );
      } else if (op === "exchange") {
        const d = z
          .object({
            ...common,
            replacements: z
              .array(
                z
                  .object({ itemId: z.string(), variantId: z.string() })
                  .strict(),
              )
              .min(1)
              .max(100),
          })
          .strict()
          .parse(b);
        result = await allocateExchange(d.id, d.replacements, d.reason, actor);
      } else if (op === "exchange-status") {
        const d = z
          .object({ ...common, exchangeId: z.string(), status: z.string() })
          .strict()
          .parse(b);
        result = await exchangeStatus(
          d.id,
          d.exchangeId,
          d.status,
          d.reason,
          actor,
        );
      } else if (op === "refund") {
        const d = z
          .object({ ...common, refundShipping: z.boolean().default(false) })
          .strict()
          .parse(b);
        result = await prepareRefund(d.id, d.refundShipping, d.reason, actor);
      } else if (op === "refund-status") {
        const d = z
          .object({
            ...common,
            status: z.enum([
              "APPROVED",
              "SIMULATED_COMPLETED",
              "REJECTED",
              "CANCELED",
            ]),
          })
          .strict()
          .parse(b);
        result = await changeRefund(d.id, d.status, d.reason, actor);
      } else throw new Error("Thao tác đổi trả không hợp lệ.");
      const r = await db.returnRequest.findUniqueOrThrow({
        where: { id: result.id },
      });
      await refreshOrderViews(r.orderId);
      revalidatePath("/admin/doi-tra");
      revalidatePath(`/admin/doi-tra/${r.id}`);
      return ok({
        id: r.id,
        message: "Đã ghi nhận nội bộ. Không chuyển tiền thật.",
      });
    }
    if (action === "register") {
      const data = z
        .object({
          name: z.string().min(2).max(100),
          phone: z.union([z.string().regex(/^(\+84|0)[0-9]{9,10}$/), z.literal("")]).optional(),
          email: z.union([z.string().email().transform((s) => s.toLowerCase()), z.literal("")]).optional(),
          password: z.string().min(8).max(128),
          confirmPassword: z.string(),
        })
        .parse(b);
      if (!data.email && !data.phone)
        throw new Error("Vui lòng nhập email hoặc số điện thoại.");
      if (data.password !== data.confirmPassword)
        throw new Error("Mật khẩu xác nhận chưa khớp.");
      const passwordHash = await hash(data.password, 12);
      const user = await orderTransaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name: data.name,
            email: data.email || `${data.phone!.replace(/\D/g, "")}@phone.local`,
            phone: data.phone || "",
            passwordHash,
          },
        });
        await operationalAudit(
          tx,
          created.id,
          "CUSTOMER_REGISTERED",
          "USER",
          created.id,
          null,
          { role: created.role },
          "Đăng ký tài khoản khách hàng",
        );
        return created;
      });
      await createSession(user.id);
      await mergeCartAndWishlist(
        user.id,
        Array.isArray(b.wishlist) ? b.wishlist : [],
      );
      return ok({ redirect: "/" });
    }
    if (action === "login") {
      const { email, password } = z
        .object({ email: z.string().min(1), password: z.string().max(128) })
        .parse(b);
      const identity = email.trim().toLowerCase();
      rateLimit("login:" + identity, 12);
      const user = identity.includes("@")
        ? await db.user.findUnique({ where: { email: identity } })
        : await db.user.findFirst({ where: { phone: identity } });
      if (
        !user ||
        !user.active ||
        !(await compare(password, user.passwordHash))
      )
        throw new Error("Email/số điện thoại hoặc mật khẩu chưa đúng.");
      clearRateLimit("login:" + identity);
      await createSession(user.id);
      await mergeCartAndWishlist(
        user.id,
        Array.isArray(b.wishlist) ? b.wishlist : [],
      );
      return ok({
        redirect: accountLoginDestination(user.role, b.returnTo),
      });
    }
    if (action === "logout") {
      const t = (await cookies()).get("hn_session")?.value;
      if (t) await db.session.deleteMany({ where: { tokenHash: digest(t) } });
      (await cookies()).delete("hn_session");
      return ok({ redirect: "/dang-nhap" });
    }
    if (action === "forgot") {
      const { email } = z.object({ email: z.string().email() }).parse(b);
      if (await db.user.findUnique({ where: { email: email.toLowerCase() } })) {
        const t = token();
        await db.passwordReset.create({
          data: {
            email: email.toLowerCase(),
            tokenHash: digest(t),
            expiresAt: new Date(Date.now() + 30 * 60000),
          },
        });
        if (
          process.env.NODE_ENV !== "production" ||
          (!commercialMode() &&
            ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
              req.nextUrl.hostname,
            ))
        ) {
          await mkdir(".local-mail", { recursive: true });
          await writeFile(
            `.local-mail/${Date.now()}-${randomUUID()}.txt`,
            `Password reset for ${email}\nhttp://localhost:3000/quen-mat-khau?token=${t}\nExpires in 30 minutes.`,
            { flag: "wx", mode: 0o600 },
          );
        }
      }
      return ok({
        message:
          "Nếu email đã đăng ký, hướng dẫn được gửi tới hộp thư phát triển .local-mail trên máy chủ (không gửi email thật).",
      });
    }
    if (action === "reset") {
      const { resetToken, password } = z
        .object({
          resetToken: z.string().length(64),
          password: z.string().min(10).max(128),
        })
        .parse(b);
      const r = await db.passwordReset.findUnique({
        where: { tokenHash: digest(resetToken) },
      });
      if (!r || r.used || r.expiresAt < new Date())
        throw new Error("Liên kết đã hết hạn.");
      await orderTransaction(async (tx) => {
        const claimed = await tx.passwordReset.updateMany({
          where: { id: r.id, used: false, expiresAt: { gt: new Date() } },
          data: { used: true },
        });
        if (!claimed.count) throw new Error("Liên kết đã được sử dụng.");
        const user = await tx.user.update({
          where: { email: r.email },
          data: { passwordHash: await hash(password, 12) },
        });
        await tx.session.deleteMany({ where: { userId: user.id } });
        await operationalAudit(
          tx,
          user.id,
          "PASSWORD_RESET",
          "USER",
          user.id,
          null,
          { sessionsRevoked: true },
          "Đặt lại mật khẩu bằng liên kết một lần",
        );
      });
      return ok({ redirect: "/dang-nhap" });
    }
    if (action === "profile") {
      const user = await requireUser();
      const data = z
        .object({
          name: z.string().min(2).max(100),
          phone: z.string().regex(/^(\+84|0)[0-9]{9,10}$/),
        })
        .parse(b);
      await orderTransaction(async (tx) => {
        const changed = await tx.user.updateMany({
          where: {
            id: user.id,
            active: true,
            permissionVersion: user.permissionVersion,
          },
          data,
        });
        if (!changed.count)
          throw Error("Phiên tài khoản vừa thay đổi. Vui lòng đăng nhập lại.");
        await operationalAudit(
          tx,
          user.id,
          "PROFILE_UPDATED",
          "USER",
          user.id,
          { name: user.name },
          { name: data.name },
          "Cập nhật hồ sơ cá nhân",
        );
      });
      return ok({ message: "Đã lưu thông tin." });
    }
    if (action === "password") {
      const user = await requireUser();
      const { oldPassword, password } = z
        .object({
          oldPassword: z.string(),
          password: z.string().min(10).max(128),
        })
        .parse(b);
      if (!(await compare(oldPassword, user.passwordHash)))
        throw new Error("Mật khẩu hiện tại chưa đúng.");
      const passwordHash = await hash(password, 12);
      await orderTransaction(async (tx) => {
        const changed = await tx.user.updateMany({
          where: { id: user.id, active: true, passwordHash: user.passwordHash },
          data: { passwordHash, permissionVersion: { increment: 1 } },
        });
        if (!changed.count)
          throw Error("Tài khoản vừa thay đổi. Vui lòng đăng nhập lại.");
        await tx.session.deleteMany({ where: { userId: user.id } });
        await operationalAudit(
          tx,
          user.id,
          "PASSWORD_CHANGED",
          "USER",
          user.id,
          null,
          { sessionsRevoked: true },
          "Khách đổi mật khẩu",
        );
      });
      (await cookies()).delete("hn_session");
      return ok({ redirect: "/dang-nhap" });
    }
    if (action === "address") {
      const user = await requireUser();
      const result = await saveCustomerAddress(b, user);
      return ok({ ...result, message: "Đã cập nhật địa chỉ." });
    }
    if (action === "wishlist") {
      const user = await requireUser();
      const productId = z.string().parse(b.productId);
      if (
        !b.remove &&
        !(await db.product.count({ where: { id: productId, active: true } }))
      )
        throw new Error("Sản phẩm không khả dụng.");
      const w = await db.wishlist.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
      if (b.remove)
        await db.wishlistItem.deleteMany({
          where: { wishlistId: w.id, productId },
        });
      else
        await db.wishlistItem.upsert({
          where: { wishlistId_productId: { wishlistId: w.id, productId } },
          update: {},
          create: { wishlistId: w.id, productId },
        });
      return ok({ success: true });
    }
    if (action === "cart/clear") {
      const user = await requireUser();
      const eventKey = z.string().uuid().parse(b.eventKey);
      const cart = await getCart();
      await orderTransaction(async (tx) => {
        const receipt = await mutationReceipt(
          tx,
          "CART_CLEARED",
          eventKey,
          user.id,
          { cartId: cart.id },
        );
        if (receipt.replay) return;
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await updateCartAnalytics(tx, cart.id);
        await receipt.commit();
      });
      return ok({ message: "Đã làm trống giỏ hàng." });
    }
    if (action === "cart") {
      const visitor = await visitorSession();
      const actor = await currentUser();
      const eventKey =
        b.eventKey === undefined
          ? randomUUID()
          : z.string().uuid().parse(b.eventKey);
      const variantForEvent = await db.productVariant.findUnique({
        where: { id: String(b.variantId) },
        select: { productId: true, product: { select: { slug: true } } },
      });
      await orderTransaction((tx) =>
        trackEvent(
          tx,
          visitor?.id ?? null,
          "ADD_TO_CART_ATTEMPTED",
          eventKey,
          variantForEvent?.productId,
          !!actor,
        ),
      );
      if (!actor) {
        const candidate = variantForEvent?.product.slug
          ? "/san-pham/" + variantForEvent.product.slug
          : "/gio-hang";
        const returnTo = safeReturnTo(candidate) ?? "/gio-hang";
        return NextResponse.json(
          {
            error: "Vui lòng đăng nhập trước khi thêm giỏ.",
            redirect: "/dang-nhap?returnTo=" + encodeURIComponent(returnTo),
          },
          { status: 401 },
        );
      }
      const cart = await getCart();
      const { variantId, quantity } = z
        .object({
          variantId: z.string(),
          quantity: z.number().int().min(0).max(99),
        })
        .parse(b);
      await orderTransaction(async (tx) => {
        const receipt = await mutationReceipt(
          tx,
          "CART_UPDATED",
          eventKey,
          actor.id,
          {
            cartId: cart.id,
            variantId,
            quantity,
            increment: b.increment === true,
          },
        );
        if (receipt.replay) return;
        // Removal is scoped to the caller's cart and must also work for retired items.
        if (quantity === 0 && !b.increment) {
          await tx.cartItem.deleteMany({
            where: { cartId: cart.id, variantId },
          });
          await updateCartAnalytics(tx, cart.id);
          await receipt.commit();
          return;
        }
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          include: {
            product: { include: { category: true } },
            colorRecord: true,
          },
        });
        if (
          !variant ||
          !variant.product.active ||
          !variant.product.category.active ||
          variant.colorRecord?.active === false
        )
          throw new Error("Sản phẩm không khả dụng.");
        if (commercialMode()) await assertProductReady(variant.productId);
        const item = await tx.cartItem.findUnique({
          where: { cartId_variantId: { cartId: cart.id, variantId } },
        });
        if (b.increment !== undefined && typeof b.increment !== "boolean")
          throw Error("Thao tác giỏ hàng không hợp lệ.");
        const n = b.increment ? quantity + (item?.quantity ?? 0) : quantity;
        if (n > 99) throw Error("Mỗi SKU tối đa 99 sản phẩm trong giỏ.");
        if (n > variant.stock)
          throw new Error(
            `Chỉ còn ${variant.stock} sản phẩm trong kho.` +
            (b.increment && item ? ` Giỏ hàng đã có ${item.quantity} sản phẩm; chỉ có thể thêm tối đa ${Math.max(0, variant.stock - item.quantity)} sản phẩm.` : " Vui lòng giảm số lượng."),
          );
        if (n === 0)
          await tx.cartItem.deleteMany({
            where: { cartId: cart.id, variantId },
          });
        else
          await tx.cartItem.upsert({
            where: { cartId_variantId: { cartId: cart.id, variantId } },
            update: { quantity: n },
            create: { cartId: cart.id, variantId, quantity: n },
          });
        await updateCartAnalytics(tx, cart.id);
        await receipt.commit();
        if (n > 0)
          await trackEvent(
            tx,
            visitor?.id ?? null,
            "ADD_TO_CART_SUCCEEDED",
            eventKey + ":success",
            variant.productId,
            true,
          );
      });
      return ok({ message: "Đã cập nhật giỏ hàng." });
    }
    if (action === "quote" || action === "checkout") {
      if (
        !commercialMode() &&
        !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
          req.nextUrl.hostname,
        )
      )
        throw new Error("Chế độ xem thử chỉ hỗ trợ giỏ hàng trên localhost.");
      const user = await currentUser();
      if (!user)
        return NextResponse.json(
          {
            error: "Vui lòng đăng nhập để thanh toán.",
            redirect: "/dang-nhap?returnTo=%2Fthanh-toan",
          },
          { status: 401 },
        );
      const countryCode = z
        .enum(["VN", "SG", "US", "GB", "FR"])
        .parse(b.countryCode ?? (await readPreferences(user.id)).region);
      if (!regions[countryCode].shipping)
        throw Error("Chỉ hỗ trợ giao hàng tại Việt Nam.");
      const visitor = await visitorSession();
      const cart = await getCart();
      let data: ReturnType<typeof customer.parse> | undefined;
      if (action === "checkout") {
        rateLimit("checkout:" + cart.id, 20);
        data = customer.parse({ ...b, countryCode });
        z.string().uuid().parse(b.idempotencyKey);
      }
      const result = await orderTransaction(async (tx) => {
        if (action === "checkout") {
          const existing = await tx.order.findUnique({
            where: { idempotencyKey: b.idempotencyKey },
          });
          if (existing) {
            if (
              existing.accessToken !== digest(`${cart.id}:${b.idempotencyKey}`)
            )
              throw new Error("Yêu cầu trùng không hợp lệ.");
            const receipt = await tx.auditLog.findFirst({
              where: {
                targetId: existing.id,
                action: "ORDER_CREATED",
              },
            });
            const previousHash = receipt
              ? JSON.parse(receipt.detail).requestHash
              : undefined;
            if (
              previousHash &&
              previousHash !==
                requestFingerprint({
                  ...data,
                  coupon: String(b.coupon ?? "")
                    .trim()
                    .toUpperCase(),
                })
            )
              throw Error("Mã đặt hàng đã được dùng với nội dung khác.");
            return { order: existing };
          }
        }
        const items = await tx.cartItem.findMany({
          where: { cartId: cart.id },
          include: {
            variant: {
              include: {
                colorRecord: {
                  include: { images: { orderBy: { position: "asc" } } },
                },
                product: {
                  include: {
                    images: { orderBy: { position: "asc" } },
                    category: true,
                  },
                },
              },
            },
          },
        });
        if (!items.length) throw new Error("Giỏ hàng đang trống.");
        let subtotal = 0;
        for (const i of items) {
          if (commercialMode()) await assertProductReady(i.variant.productId);
          if (
            !i.variant.product.active ||
            !i.variant.product.category.active ||
            i.variant.colorRecord?.active === false ||
            i.quantity < 1 ||
            i.quantity > i.variant.stock
          )
            throw new Error(
              `${i.variant.product.name} không đủ hàng hoặc không còn khả dụng.`,
            );
          if (effectivePrice(i.variant.product, i.variant) <= 0)
            throw new Error(
              "Sản phẩm chưa có giá bán hợp lệ. Vui lòng liên hệ cửa hàng.",
            );
          subtotal += effectivePrice(i.variant.product, i.variant) * i.quantity;
        }
        let coupon = null;
        if (b.coupon) {
          coupon = await tx.coupon.findUnique({
            where: { code: String(b.coupon).trim().toUpperCase() },
          });
          if (!coupon || !validPromotion(coupon, subtotal))
            throw new Error(
              "Mã giảm giá không hợp lệ, đã hết hạn hoặc chưa đủ giá trị tối thiểu.",
            );
        }
        const totals = calculateTotals(subtotal, coupon ?? undefined);
        if (action === "quote") return totals;
        const code = `HN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${token().slice(0, 10).toUpperCase()}`;
        for (const i of items) {
          const res = await tx.productVariant.updateMany({
            where: { id: i.variantId, stock: { gte: i.quantity } },
            data: { stock: { decrement: i.quantity } },
          });
          if (res.count !== 1)
            throw new Error("Tồn kho vừa thay đổi. Vui lòng thử lại.");
          await tx.inventoryMovement.create({
            data: {
              variantId: i.variantId,
              delta: -i.quantity,
              reason: `Đặt hàng COD ${code}`,
              actorId: user?.id ?? "guest",
            },
          });
        }
        if (coupon) {
          const r = await tx.coupon.updateMany({
            where: {
              id: coupon.id,
              active: true,
              used: { lt: coupon.usageLimit },
            },
            data: { used: { increment: 1 } },
          });
          if (!r.count) throw new Error("Mã giảm giá đã hết lượt.");
        }
        const order = await tx.order.create({
          data: {
            ...data!,
            ...totals,
            code,
            userId: user?.id,
            accessToken: digest(`${cart.id}:${b.idempotencyKey}`),
            idempotencyKey: b.idempotencyKey,
            packingRequired: true,
            items: {
              create: items.map((i) => ({
                productId: i.variant.productId,
                variantId: i.variantId,
                name: i.variant.product.name,
                sku: i.variant.sku,
                size: i.variant.size,
                color: i.variant.color,
                image:
                  i.variant.colorRecord?.images[0]?.url ??
                  i.variant.product.images[0]?.url ??
                  "",
                quantity: i.quantity,
                unitPrice: effectivePrice(i.variant.product, i.variant),
              })),
            },
            history: {
              create: {
                status: "PENDING",
                note: "Đơn COD được tạo, chưa xác nhận thu tiền.",
                event: "ORDER_CREATED",
                actorId: user?.id ?? "guest",
                actorLabel: user ? "Khách hàng" : "Khách mua không tài khoản",
              },
            },
            payments: {
              create: {
                amount: totals.total,
                method: "COD",
                status: "UNPAID",
              },
            },
            ...(coupon
              ? { redemption: { create: { couponId: coupon.id } } }
              : {}),
          },
        });
        await tx.inventoryMovement.updateMany({
          where: { reason: `Đặt hàng COD ${code}`, orderId: null },
          data: { orderId: order.id },
        });
        await tx.auditLog.create({
          data: {
            actorId: user?.id ?? "guest",
            action: "ORDER_CREATED",
            targetId: order.id,
            detail: JSON.stringify({
              code,
              total: order.total,
              currency: "VND",
              requestHash: requestFingerprint({
                ...data,
                coupon: String(b.coupon ?? "")
                  .trim()
                  .toUpperCase(),
              }),
            }),
          },
        });
        await captureOrderAnalytics(tx, order.id, cart.id, visitor);
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id, id: { in: items.map((i) => i.id) } },
        });
        return { order };
      });
      if ("order" in result) {
        const order = result.order!;
        (await cookies()).set(`hn_order_${order.code}`, order.accessToken, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 30 * 86400,
        });
        return ok({ redirect: `/dat-hang-thanh-cong/${order.code}` });
      }
      return ok(result);
    }
    if (["order/cancel-items", "admin/order-items-cancel"].includes(action)) {
      const user = await requireUser();
      const result = await cancelOrderItems(b, user);
      await refreshOrderViews(result.id);
      return ok({
        ...result,
        message: "Đã hủy phần hàng được chọn và cập nhật tổng tiền.",
      });
    }
    if (action === "order/cancel") {
      const d = z
        .object({
          id: z.string(),
          reason: z.string().trim().min(3).max(1000),
          code: z.string().optional(),
        })
        .parse(b);
      const user = await currentUser();
      const access = d.code
        ? (await cookies()).get("hn_order_" + d.code)?.value
        : undefined;
      await changeOrder(
        { ...d, status: "CANCELLED" },
        {
          id: user?.id ?? "guest",
          label: user ? "Khách hàng" : "Khách mua không tài khoản",
          role: user ? "CUSTOMER" : "GUEST",
          accessToken: access,
        },
      );
      await refreshOrderViews(d.id);
      return ok({ message: "Đã hủy đơn và hoàn tồn kho." });
    }
    if (action === "track") {
      rateLimit("track:" + req.headers.get("x-forwarded-for"), 30);
      const { code, phone } = z
        .object({
          code: z.string().trim().min(5).max(80),
          phone: z.string().trim().max(14).optional(),
        })
        .parse(b);
      const viewer = await currentUser();
      const staff = viewer && can(viewer.role, "orders.read");
      const lookup = { OR: [{ code }, { id: code }] };
      const order = await db.order.findFirst({
        where: staff
          ? lookup
          : viewer
            ? { ...lookup, userId: viewer.id }
            : {
                ...lookup,
                phone: phone && /^0\d{9,10}$/.test(phone) ? phone : "!invalid",
              },
        select: {
          code: true,
          name: true,
          status: true,
          paymentStatus: true,
          shippingStatus: true,
          total: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              name: true,
              sku: true,
              size: true,
              color: true,
              quantity: true,
              unitPrice: true,
              image: true,
            },
          },
          payments: { select: { method: true, status: true, amount: true } },
          history: {
            select: { status: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
          shipment: { select: publicShipmentSelect },
        },
      });
      if (!order) throw new Error("Không tìm thấy đơn hàng khớp thông tin.");
      return ok(order);
    }
    if (action === "newsletter") {
      const { email } = z
        .object({
          email: z
            .string()
            .email()
            .transform((s) => s.toLowerCase()),
        })
        .parse(b);
      await db.newsletter.upsert({
        where: { email },
        update: {},
        create: { email },
      });
      return ok({
        message: "Cảm ơn nàng! Email đã được lưu trong hệ thống.",
      });
    }
    if (action === "contact") {
      const data = z
        .object({
          name: z.string().min(2).max(100),
          email: z.string().email(),
          phone: z
            .string()
            .max(20)
            .refine((v) => !v || /^(\+84|0)[0-9]{9,10}$/.test(v))
            .default(""),
          subject: z.string().trim().min(2).max(150).default("Liên hệ"),
          message: z.string().min(10).max(3000),
        })
        .parse(b);
      rateLimit("contact:" + req.headers.get("x-forwarded-for"));
      const author = await currentUser();
      await db.inquiry.create({ data: { ...data, userId: author?.id } });
      return ok({
        message: "Lời nhắn đã được gửi đến cửa hàng.",
      });
    }
    if (["admin/order/pack", "admin/order/assign"].includes(action)) {
      const actor = await requireUser(true);
      const result = action.endsWith("/pack")
        ? await packOrder(b, actor)
        : await assignOrder(b, actor);
      await refreshOrderViews(result.id);
      return ok({ ...result, message: "Đã cập nhật xử lý đơn hàng." });
    }
    if (action.startsWith("admin/stocktakes/")) {
      const actor = await requireUser(true);
      const result =
        action === "admin/stocktakes/create"
          ? await createStocktake(b, actor)
          : action === "admin/stocktakes/status"
            ? await changeStocktake(b, actor)
            : null;
      if (!result) throw Error("Thao tác kiểm kê không tồn tại.");
      revalidatePath("/admin/kho-hang");
      return ok({ ...result, message: "Đã lưu phiếu kiểm kê." });
    }
    if (
      [
        "reviews",
        "support/reply",
        "admin/reviews/reply",
        "admin/reviews/moderate",
      ].includes(action)
    ) {
      const actor = await requireUser();
      const result =
        action === "reviews"
          ? await createReview(b, actor)
          : action.endsWith("/moderate")
            ? await moderateReview(b, actor)
            : await replyFeedback(
                action.startsWith("admin/reviews") ? "review" : "inquiry",
                b,
                actor,
              );
      revalidatePath("/admin/lien-he");
      revalidatePath("/tai-khoan/ho-tro");
      revalidatePath("/san-pham", "layout");
      revalidatePath("/tai-khoan/don-hang", "layout");
      return ok({ ...result, message: "Đã lưu nội dung phản hồi." });
    }
    if (action.startsWith("admin/ghn/")) {
      await requireUser(true);
      return NextResponse.json(
        { error: "REAL_CARRIERS_DISABLED_LOCAL_DEMO" },
        { status: 410 },
      );
    }
    if (action.startsWith("admin/shipping/")) {
      const user = await requireUser(true);
      const actor = { id: user.id, label: user.email, role: user.role };
      const operation = action.slice("admin/shipping/".length);
      let shipmentId: string;
      if (operation === "create") {
        const d = z
          .object({
            orderId: z.string(),
            provider: z.enum(["LOCAL_MANUAL", "GHN_STAGING"]),
            shippingFee: z.coerce.number().int().min(0).max(100000000),
            parcelDescription: z.string().trim().min(3).max(1000),
            weightGrams: z.coerce.number().int().min(1).max(1000000),
            parcelCount: z.coerce.number().int().min(1).max(100),
            lengthCm: z.preprocess(
              (v) => (v === "" ? undefined : v),
              z.coerce.number().int().min(1).max(200).optional(),
            ),
            widthCm: z.preprocess(
              (v) => (v === "" ? undefined : v),
              z.coerce.number().int().min(1).max(200).optional(),
            ),
            heightCm: z.preprocess(
              (v) => (v === "" ? undefined : v),
              z.coerce.number().int().min(1).max(200).optional(),
            ),
            insuredValue: z.preprocess(
              (v) => (v === "" ? 0 : v),
              z.coerce.number().int().min(0).max(5000000).optional(),
            ),
          })
          .parse(b);
        shipmentId = (await createShipment(d, actor)).id;
      } else if (operation === "status") {
        const d = z
          .object({
            id: z.string(),
            status: z.string(),
            reason: z.string().trim().max(1000).optional(),
            reasonCode: z.string().max(100).optional(),
          })
          .parse(b);
        shipmentId = await updateShipment(d, actor);
      } else if (operation === "collection" || operation === "remittance") {
        const d = z
          .object({
            id: z.string(),
            eventKey: z.string().uuid(),
            provider: z.enum(["LOCAL_MANUAL", "GHN_STAGING"]),
            reference: z.string().trim().min(3).max(200),
            amount: z.coerce
              .number()
              .int()
              .min(-100000000)
              .max(100000000)
              .refine((n) => n !== 0),
            evidence: z.string().trim().min(3).max(2000),
            occurredAt: z
              .string()
              .datetime()
              .refine(
                (v) => new Date(v).getTime() <= Date.now() + 60000,
                "Ngày ghi nhận không được ở tương lai",
              ),
            correctsId: z.preprocess(
              (v) => (v === "" ? undefined : v),
              z.string().optional(),
            ),
          })
          .parse(b);
        shipmentId = (await recordCOD(operation, d, actor)).id;
      } else if (operation === "reconcile") {
        const d = z
          .object({
            id: z.string(),
            eventKey: z.string().uuid(),
            action: z.enum(["RECONCILE", "DISPUTE"]),
            note: z.string().trim().min(3).max(2000),
          })
          .parse(b);
        shipmentId = (await reconcileCOD(d, actor)).id;
      } else throw new Error("Thao tác giao nhận không tồn tại.");
      const shipment = await db.shipment.findUniqueOrThrow({
        where: { id: shipmentId },
        select: { orderId: true },
      });
      await refreshOrderViews(shipment.orderId);
      revalidatePath("/admin/van-chuyen");
      revalidatePath(`/admin/van-chuyen/${shipmentId}`);
      return ok({ message: "Đã ghi nhận nội bộ.", id: shipmentId });
    }
    if (action.startsWith("admin/")) {
      const admin = await requireUser(true);
      const target = action.slice(6);
      const beforeSnapshot = await adminSnapshot(
        db,
        target,
        String(b.id ?? b.variantId ?? b.productId ?? ""),
      );
      let id = "";
      if (target === "media-delete") {
        id = await deleteMediaAsset(b, admin);
      } else if (target === "media") {
        id = await saveMediaAsset(b, admin);
      } else if (target === "publication") {
        id = await savePublication(b, admin);
      } else if (["color", "outfit", "size-chart"].includes(target)) {
        id = await saveCatalogFeature(target, b, admin);
      } else if (target === "product") {
        id = await saveProduct(b, admin);
      } else if (target === "variant") {
        const d = z
          .object({
            productId: z.string(),
            sku: z.string().min(2),
            size: z.enum([
              "XS",
              "S",
              "M",
              "L",
              "XL",
              "XXL",
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
            ]),
            color: z.string().min(1),
            colorHex: z.string().regex(/^#[a-fA-F0-9]{6}$/),
            stock: z.coerce.number().int().min(0).max(100000),
            stockOrigin: z
              .enum(["UNVERIFIED", "SAMPLE", "VERIFIED"])
              .default("UNVERIFIED"),
            priceOverride: z.preprocess(
              (v) => (v === "" || v == null ? null : Number(v)),
              z.number().int().positive().max(100000000).nullable(),
            ),
          })
          .parse(b);
        await orderTransaction(async (tx) => {
          await requireActorPermission(tx, admin, "products.update");
          const variantBefore = b.id
            ? await adminSnapshot(tx, "variant", String(b.id))
            : null;
          const colorRecord = await tx.productColor.upsert({
            where: {
              productId_name: { productId: d.productId, name: d.color },
            },
            update: {},
            create: { productId: d.productId, name: d.color, hex: d.colorHex },
          });
          if (colorRecord.hex.toLowerCase() !== d.colorHex.toLowerCase())
            throw new Error(
              "HEX phải khớp màu đã cấu hình. Hãy sửa màu ở phần Màu sắc trước.",
            );
          await tx.product.update({
            where: { id: d.productId },
            data: { publicationStatus: "PENDING_ASSETS" },
          });
          const variantData = { ...d, colorId: colorRecord.id };
          if (b.id) {
            const old = await tx.productVariant.findUniqueOrThrow({
              where: { id: String(b.id) },
            });
            if (old.productId !== d.productId)
              throw new Error("Không thể chuyển biến thể sang sản phẩm khác.");
            if (d.stock !== old.stock || d.stockOrigin !== old.stockOrigin)
              await requireActorPermission(tx, admin, "inventory.adjust");
            const v = await tx.productVariant.update({
              where: { id: old.id },
              data: variantData,
            });
            id = v.id;
            await tx.inventoryMovement.create({
              data: {
                variantId: id,
                delta: d.stock - old.stock,
                reason: "Quản trị điều chỉnh biến thể",
                actorId: admin.id,
              },
            });
          } else {
            if (d.stock > 0 || d.stockOrigin !== "UNVERIFIED")
              await requireActorPermission(tx, admin, "inventory.adjust");
            const v = await tx.productVariant.create({ data: variantData });
            id = v.id;
            await tx.inventoryMovement.create({
              data: {
                variantId: id,
                delta: d.stock,
                reason: "Tạo biến thể",
                actorId: admin.id,
              },
            });
          }
          await operationalAudit(
            tx,
            admin.id,
            "VARIANT",
            "INVENTORY",
            id,
            variantBefore,
            await adminSnapshot(tx, "variant", id),
            "Tạo/cập nhật biến thể",
          );
        });
      } else if (target === "inventory-movement") {
        const result = await moveStock(b, admin);
        id = result.id;
      } else if (target === "stock") {
        const d = z
          .object({
            variantId: z.string(),
            stock: z.coerce.number().int().min(0).max(100000),
            reason: z.string().min(3).max(300),
          })
          .parse(b);
        await orderTransaction(async (tx) => {
          await requireActorPermission(tx, admin, "inventory.adjust");
          const old = await tx.productVariant.findUniqueOrThrow({
            where: { id: d.variantId },
          });
          const adjusted = await tx.productVariant.updateMany({
            where: { id: d.variantId, stock: old.stock },
            data: { stock: d.stock },
          });
          if (adjusted.count !== 1)
            throw Error("Tồn kho vừa thay đổi, vui lòng tải lại.");
          await tx.inventoryMovement.create({
            data: {
              variantId: d.variantId,
              delta: d.stock - old.stock,
              reason: d.reason,
              actorId: admin.id,
            },
          });
          await operationalAudit(
            tx,
            admin.id,
            "STOCK",
            "INVENTORY",
            d.variantId,
            { stock: old.stock },
            { stock: d.stock },
            d.reason,
          );
        });
        id = d.variantId;
      } else if (target === "order") {
        const d = z
          .object({
            id: z.string(),
            status: z.string().optional(),
            paid: z.boolean().optional(),
            reason: z.string().max(1000).optional(),
            reference: z.string().max(200).optional(),
          })
          .parse(b);
        id = d.id;
        await changeOrder(d, {
          id: admin.id,
          label: admin.email,
          role: admin.role,
        });
        await refreshOrderViews(id);
      } else if (target === "category") {
        id = await saveSupportingEntity(target, b, admin);
      } else if (target === "collection") {
        id = await saveSupportingEntity(target, b, admin);
      } else if (target === "coupon") {
        id = await savePromotion(b, admin);
      } else if (target === "banner") {
        id = await saveSupportingEntity(target, b, admin);
      } else if (target === "settings") {
        id = await saveStoreSettings(b, admin);
        revalidatePath("/chinh-sach-giao-hang");
        revalidatePath("/chinh-sach-doi-tra");
      } else if (target === "inquiry") {
        id = await saveSupportingEntity(target, b, admin);
      } else if (target === "customer") {
        id = await saveSupportingEntity(target, b, admin);
      } else throw new Error("Chức năng không tồn tại.");
      if (target === "product") await refreshSearch([id]);
      if (target === "collection" || target === "category")
        await refreshSearch();
      if (
        ![
          "order",
          "stock",
          "variant",
          "coupon",
          "settings",
          "product",
          "inventory-movement",
          "category",
          "collection",
          "banner",
          "inquiry",
          "customer",
          "color",
          "outfit",
          "size-chart",
          "media",
          "media-delete",
          "publication",
        ].includes(target)
      )
        await operationalAudit(
          db,
          admin.id,
          target.toUpperCase(),
          target.toUpperCase(),
          id,
          beforeSnapshot,
          await adminSnapshot(db, target, id),
          typeof b.reason === "string"
            ? b.reason.slice(0, 1000)
            : "Cập nhật nội bộ",
        );
      return ok({ message: "Đã lưu thay đổi.", id });
    }
    return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  } catch (e) {
    logRejection(requestId, "POST", req.nextUrl.pathname, e);
    if (e instanceof AuthorizationError) {
      const actor = await currentUser();
      await db.auditLog.create({
        data: {
          actorId: actor?.id ?? "anonymous",
          action: "ACCESS_DENIED",
          resourceType: "ADMIN_ENDPOINT",
          targetId: req.nextUrl.pathname,
          result: "DENIED",
          detail: JSON.stringify({ permission: e.permission }),
        },
      });
      return NextResponse.json(
        { error: e.message, requestId },
        {
          status: 403,
          headers: { "X-Request-ID": requestId, "Cache-Control": "no-store" },
        },
      );
    }

    if (req.nextUrl.pathname.startsWith("/api/admin/")) {
      const actor = await currentUser();
      await db.auditLog.create({
        data: {
          actorId: actor?.id ?? "anonymous",
          action: "OPERATION_REJECTED",
          resourceType: "ADMIN_ENDPOINT",
          targetId: req.nextUrl.pathname,
          result: "REJECTED",
          detail: JSON.stringify({
            code:
              e instanceof z.ZodError
                ? "VALIDATION_ERROR"
                : "BUSINESS_RULE_REJECTED",
          }),
        },
      });
    }
    const message =
      e instanceof SyntaxError
        ? "Nội dung yêu cầu không hợp lệ."
        : e instanceof z.ZodError
          ? "Vui lòng kiểm tra các trường thông tin."
          : e instanceof Error && e.message.includes("Unique constraint")
            ? "Thông tin đã tồn tại (email, SKU hoặc đường dẫn)."
            : e instanceof Error && e.name.startsWith("Prisma")
              ? "Không thể lưu dữ liệu. Kiểm tra bản ghi liên quan và thử lại."
              : e instanceof Error
                ? e.message
                : "Có lỗi xảy ra.";
    return NextResponse.json(
      { error: message, requestId },
      {
        status: 400,
        headers: { "X-Request-ID": requestId, "Cache-Control": "no-store" },
      },
    );
  }
}
