import { adoptPreferences } from "./localization/server";
import {
  isStaff,
  accountRoles,
  isAccountRole,
  assertRolePermission,
  Permission,
  AuthorizationError,
} from "./rbac";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { requireCurrentAccount } from "./authorization";
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
export async function createSession(authenticatedUser: {
  id: string;
  passwordHash: string;
  permissionVersion: number;
}) {
  const userId = authenticatedUser.id;
  const sessionDays = 30;
  const t = token();
  await db.$transaction(async (tx) => {
    // Claim the exact credentials/version that passed authentication, not a
    // newer account snapshot after a concurrent password reset or role change.
    const current = await tx.user.updateMany({
      where: {
        id: userId,
        active: true,
        role: { in: [...accountRoles] },
        passwordHash: authenticatedUser.passwordHash,
        permissionVersion: authenticatedUser.permissionVersion,
      },
      data: { lastLoginAt: new Date() },
    });
    if (current.count !== 1)
      throw Error("Email/số điện thoại hoặc mật khẩu chưa đúng.");
    await tx.session.create({
      data: {
        userId,
        permissionVersion: authenticatedUser.permissionVersion,
        tokenHash: digest(t),
        expiresAt: new Date(Date.now() + sessionDays * 86400000),
      },
    });
  });
  await adoptPreferences(authenticatedUser);
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
    return db.$transaction(async (tx) => {
      await requireCurrentAccount(tx, u);
      return tx.cart.upsert({
        where: { userId: u.id },
        update: {},
        create: { userId: u.id },
      });
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
  actor: { id: string; permissionVersion: number },
  wishlist: string[] = [],
) {
  const c = await cookies();
  const guestToken = c.get("hn_cart")?.value;
  const mergedGuest = await db.$transaction(async (tx) => {
    await requireCurrentAccount(tx, actor);
    const cart = await tx.cart.upsert({
      where: { userId: actor.id }, update: {}, create: { userId: actor.id },
    });
    const guest = guestToken ? await tx.cart.findUnique({
      where: { guestToken },
      include: { items: { include: { variant: true } } },
    }) : null;
    if (guest) {
      for (const item of guest.items) {
        const existing = await tx.cartItem.findUnique({
          where: { cartId_variantId: { cartId: cart.id, variantId: item.variantId } },
        });
        const quantity = Math.min(item.variant.stock, (existing?.quantity ?? 0) + item.quantity);
        if (quantity > 0)
          await tx.cartItem.upsert({
            where: { cartId_variantId: { cartId: cart.id, variantId: item.variantId } },
            update: { quantity },
            create: { cartId: cart.id, variantId: item.variantId, quantity },
          });
      }
      await tx.cart.delete({ where: { id: guest.id } });
    }
    const saved = await tx.wishlist.upsert({
      where: { userId: actor.id }, update: {}, create: { userId: actor.id },
    });
    for (const productId of wishlist.slice(0, 200)) {
      if (await tx.product.count({ where: { id: productId, active: true } }))
        await tx.wishlistItem.upsert({
          where: { wishlistId_productId: { wishlistId: saved.id, productId } },
          update: {},
          create: { wishlistId: saved.id, productId },
        });
    }
    return !!guest;
  });
  if (mergedGuest) c.delete("hn_cart");
}

export async function requirePermission(p: Permission) {
  const user = await requireUser(true);
  assertRolePermission(user.role, p);
  return user;
}
