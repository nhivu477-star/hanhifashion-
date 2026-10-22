import { adoptPreferences } from "./localization/server";
import {
  isStaff,
  isAccountRole,
  assertRolePermission,
  Permission,
  AuthorizationError,
} from "./rbac";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export const token = () => randomBytes(32).toString("hex");
/** Plain HTTP loopback must work in browsers that reject Secure local cookies. */
export function sessionCookieSecure(host: string | null) {
  if (process.env.NODE_ENV !== "production") return false;
  const loopback = host?.match(/^(?:localhost|127\.0\.0\.1|\[::1\])(?::(\d{1,5}))?$/i);
  return !loopback || (loopback[1] !== undefined && Number(loopback[1]) > 65535);
}
export async function currentUser() {
  const t = (await cookies()).get("hn_session")?.value;
  if (!t) return null;
  const s = await db.session.findUnique({
    where: { tokenHash: digest(t) },
    include: { user: true },
  });
  return s &&
    s.expiresAt > new Date() &&
    s.user.active &&
    isAccountRole(s.user.role) &&
    s.permissionVersion === s.user.permissionVersion
    ? s.user
    : null;
}
export async function requireUser(admin = false) {
  const u = await currentUser();
  if (!u || (admin && !isStaff(u.role))) {
    if (admin) throw new AuthorizationError("admin.access");
    throw new Error("Bạn không có quyền truy cập.");
  }
  return u;
}
export async function createSession(userId: string) {
  const sessionDays = 30;
  const t = token();
  await adoptPreferences(userId);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.active) throw new Error("Tài khoản đã bị khóa.");
  if (!isAccountRole(user.role)) throw new AuthorizationError("account.role");
  await db.session.create({
    data: {
      userId,
      permissionVersion: user.permissionVersion,
      tokenHash: digest(t),
      expiresAt: new Date(Date.now() + sessionDays * 86400000),
    },
  });
  await db.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
  const requestHost = (await headers()).get("host");
  (await cookies()).set("hn_session", t, {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(requestHost),
    path: "/",
    maxAge: sessionDays * 86400,
  });
}
export async function getCart() {
  const c = await cookies();
  const u = await currentUser();
  if (u)
    return db.cart.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id },
    });
  let t = c.get("hn_cart")?.value;
  if (!t) {
    t = token();
    c.set("hn_cart", t, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 86400,
    });
  }
  return db.cart.upsert({
    where: { guestToken: t },
    update: {},
    create: { guestToken: t },
  });
}
const attempts = new Map<string, { count: number; until: number }>();
export function clearRateLimit(key: string) {
  attempts.delete(key);
}
export function rateLimit(key: string, max = 15) {
  const now = Date.now();
  if (attempts.size > 10000)
    for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
  let a = attempts.get(key);
  if (!a || a.until < now) {
    a = { count: 0, until: now + 15 * 60000 };
    attempts.set(key, a);
  }
  if (++a.count > max)
    throw new Error("Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.");
}
export async function mergeCartAndWishlist(
  userId: string,
  wishlist: string[] = [],
) {
  const c = await cookies();
  const guestToken = c.get("hn_cart")?.value;
  const cart = await db.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  if (guestToken) {
    const guest = await db.cart.findUnique({
      where: { guestToken },
      include: { items: { include: { variant: true } } },
    });
    if (guest) {
      await db.$transaction(async (tx) => {
        for (const i of guest.items) {
          const existing = await tx.cartItem.findUnique({
            where: {
              cartId_variantId: { cartId: cart.id, variantId: i.variantId },
            },
          });
          const quantity = Math.min(
            i.variant.stock,
            (existing?.quantity ?? 0) + i.quantity,
          );
          if (quantity > 0)
            await tx.cartItem.upsert({
              where: {
                cartId_variantId: { cartId: cart.id, variantId: i.variantId },
              },
              update: { quantity },
              create: { cartId: cart.id, variantId: i.variantId, quantity },
            });
        }
        await tx.cart.delete({ where: { id: guest.id } });
      });
      c.delete("hn_cart");
    }
  }
  const w = await db.wishlist.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  for (const productId of wishlist.slice(0, 200)) {
    if (await db.product.count({ where: { id: productId, active: true } }))
      await db.wishlistItem.upsert({
        where: { wishlistId_productId: { wishlistId: w.id, productId } },
        update: {},
        create: { wishlistId: w.id, productId },
      });
  }
}

export async function requirePermission(p: Permission) {
  const user = await requireUser(true);
  assertRolePermission(user.role, p);
  return user;
}
