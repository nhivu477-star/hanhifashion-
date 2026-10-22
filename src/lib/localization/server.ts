import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import {
  currencyConfigSchema,
  defaultCurrencyConfig,
  defaultPreference,
  normalizePreference,
  preferenceSchema,
  type Preference,
} from "./config";
export async function currencyConfiguration() {
  const row = await db.storeSetting.findUnique({
    where: { key: "localization.currencies" },
  });
  try {
    return currencyConfigSchema.parse(
      row ? JSON.parse(row.value) : defaultCurrencyConfig,
    );
  } catch {
    return defaultCurrencyConfig;
  }
}
export async function readPreferences(userId?: string) {
  const config = await currencyConfiguration();
  if (userId) {
    const saved = await db.shopperPreference.findUnique({ where: { userId } });
    if (saved)
      return normalizePreference(
        {
          language: saved.language,
          region: saved.region,
          currency: saved.currency,
        },
        config,
      );
  }
  try {
    return normalizePreference(
      JSON.parse((await cookies()).get("hn_preferences")?.value ?? "null"),
      config,
    );
  } catch {
    return defaultPreference;
  }
}
export async function savePreferences(value: unknown, userId?: string) {
  const data = preferenceSchema.parse(value);
  const config = await currencyConfiguration();
  if (!config.rates.some((r) => r.code === data.currency && r.enabled))
    throw Error("Tiền tệ chưa được hỗ trợ.");
  const jar = await cookies();
  if (userId)
    await db.shopperPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  else {
    const old = jar.get("hn_preference_id")?.value;
    const guestKey = old && /^[a-f0-9-]{36}$/.test(old) ? old : randomUUID();
    await db.shopperPreference.upsert({
      where: { guestKey },
      create: { guestKey, ...data },
      update: data,
    });
    jar.set("hn_preference_id", guestKey, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 31536000,
    });
  }
  jar.set("hn_preferences", JSON.stringify(data), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 31536000,
  });
  return data;
}
/** Explicit browser choices survive sign-in; absent choices preserve the account's saved preference. */
export async function adoptPreferences(userId: string) {
  const jar = await cookies();
  const raw = jar.get("hn_preferences")?.value;
  if (!raw) {
    const saved = await db.shopperPreference.findUnique({ where: { userId } });
    if (saved) {
      const preference = normalizePreference(
        {
          language: saved.language,
          region: saved.region,
          currency: saved.currency,
        },
        await currencyConfiguration(),
      );
      jar.set("hn_preferences", JSON.stringify(preference), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 31536000,
      });
    }
    return;
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return;
  }
  const parsed = preferenceSchema.safeParse(value);
  if (parsed.success)
    await savePreferences(
      normalizePreference(parsed.data, await currencyConfiguration()),
      userId,
    );
}
export async function preferredLanguage(): Promise<Preference["language"]> {
  return (await readPreferences()).language;
}
