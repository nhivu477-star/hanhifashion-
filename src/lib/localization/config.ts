import { z } from "zod";
export const languages = ["vi", "en"] as const;
export const regions = {
  VN: {
    name: "Việt Nam",
    english: "Vietnam",
    shipping: true,
    province: "Tỉnh / Thành phố",
    ward: "Phường / Xã",
    provinceRequired: true,
    wardRequired: true,
    postal: "",
  },
  SG: {
    name: "Singapore",
    english: "Singapore",
    shipping: false,
    province: "Thành phố",
    ward: "Quận / Khu vực",
    provinceRequired: false,
    wardRequired: false,
    postal: "^\\d{6}$",
  },
  US: {
    name: "Hoa Kỳ",
    english: "United States",
    shipping: false,
    province: "Tiểu bang",
    ward: "Thành phố",
    provinceRequired: true,
    wardRequired: true,
    postal: "^\\d{5}(-\\d{4})?$",
  },
  GB: {
    name: "Vương quốc Anh",
    english: "United Kingdom",
    shipping: false,
    province: "Hạt / Khu vực",
    ward: "Thị trấn / Thành phố",
    provinceRequired: false,
    wardRequired: true,
    postal: "^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$",
  },
  FR: {
    name: "Pháp",
    english: "France",
    shipping: false,
    province: "Vùng",
    ward: "Thành phố",
    provinceRequired: false,
    wardRequired: true,
    postal: "^\\d{5}$",
  },
} as const;
export const regionCodes = Object.keys(regions) as (keyof typeof regions)[];
export const preferenceSchema = z
  .object({
    language: z.enum(languages),
    region: z.enum(["VN", "SG", "US", "GB", "FR"]),
    currency: z.string().regex(/^[A-Z]{3}$/),
  })
  .strict();
export type Preference = z.infer<typeof preferenceSchema>;
export const defaultPreference: Preference = {
  language: "vi",
  region: "VN",
  currency: "VND",
};
export const rateSchema = z.object({
  code: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .refine((c) => {
      try {
        new Intl.NumberFormat("en", { style: "currency", currency: c }).format(
          1,
        );
        return Intl.supportedValuesOf("currency").includes(c);
      } catch {
        return false;
      }
    }),
  vndPerUnit: z.number().positive().max(1000000000),
  enabled: z.boolean(),
});
export const currencyConfigSchema = z
  .object({
    asOf: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((v) => !Number.isNaN(Date.parse(v))),
    source: z.string().min(3).max(500),
    rates: z.array(rateSchema).min(2).max(20),
  })
  .superRefine((d, ctx) => {
    if (new Set(d.rates.map((r) => r.code)).size !== d.rates.length)
      ctx.addIssue({ code: "custom", message: "Mã tiền tệ bị trùng" });
    if (
      !d.rates.some(
        (r) => r.code === "VND" && r.vndPerUnit === 1 && r.enabled,
      ) ||
      !d.rates.some((r) => r.code === "USD" && r.enabled)
    )
      ctx.addIssue({
        code: "custom",
        message: "Phải bật VND (tỷ giá 1) và USD",
      });
  });
export type CurrencyConfig = z.infer<typeof currencyConfigSchema>;
// Fixed local display reference; never used by checkout, payment or refund calculations.
export const defaultCurrencyConfig: CurrencyConfig = {
  asOf: "2025-01-01",
  source:
    "LOCAL_REFERENCE_V1 — fixed display reference, not a current market quote",
  rates: [
    { code: "VND", vndPerUnit: 1, enabled: true },
    { code: "USD", vndPerUnit: 26000, enabled: true },
    { code: "EUR", vndPerUnit: 30000, enabled: true },
    { code: "SGD", vndPerUnit: 20000, enabled: true },
  ],
};
export function formatDisplayMoney(
  amount: number,
  preference: Preference,
  config: CurrencyConfig,
) {
  const rate =
    config.rates.find((r) => r.code === preference.currency && r.enabled) ??
    config.rates.find((r) => r.code === "VND")!;
  return new Intl.NumberFormat(
    preference.language === "vi" ? "vi-VN" : "en-US",
    {
      style: "currency",
      currency: rate.code,
    },
  ).format(amount / rate.vndPerUnit);
}
export function normalizePreference(
  value: unknown,
  config: CurrencyConfig = defaultCurrencyConfig,
): Preference {
  const parsed = preferenceSchema.safeParse(value);
  const p = parsed.success ? parsed.data : defaultPreference;
  return {
    ...p,
    currency: config.rates.some((r) => r.code === p.currency && r.enabled)
      ? p.currency
      : "VND",
  };
}
export const customerAddressSchema = z
  .object({
    name: z.string().trim().min(2, "Nhập họ tên đầy đủ").max(100),
    email: z
      .string()
      .email("Email chưa hợp lệ")
      .max(200)
      .transform((s) => s.toLowerCase()),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{8,20}$/, "Số điện thoại chưa hợp lệ")
      .refine(
        (value) => /^\+?\d{8,15}$/.test(value.replace(/[ ()-]/g, "")),
        "Số điện thoại chưa hợp lệ",
      ),
    countryCode: z.enum(["VN", "SG", "US", "GB", "FR"]).default("VN"),
    province: z.string().trim().max(100).default(""),
    ward: z.string().trim().max(100).default(""),
    street: z.string().trim().min(5, "Nhập địa chỉ giao hàng đầy đủ").max(300),
    postalCode: z.string().trim().max(20).default(""),
    details: z.string().max(500).default(""),
    notes: z.string().max(1000).default(""),
  })
  .superRefine((d, ctx) => {
    const r = regions[d.countryCode];
    if (r.provinceRequired && d.province.length < 2)
      ctx.addIssue({
        code: "custom",
        path: ["province"],
        message: "Nhập tỉnh hoặc thành phố",
      });
    if (r.wardRequired && d.ward.length < 2)
      ctx.addIssue({
        code: "custom",
        path: ["ward"],
        message: "Nhập phường hoặc xã",
      });
    if (d.countryCode === "VN" && !/^(\+84|0)[0-9]{9,10}$/.test(d.phone))
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Số điện thoại chưa hợp lệ",
      });
    if (r.postal && !new RegExp(r.postal, "i").test(d.postalCode))
      ctx.addIssue({
        code: "custom",
        path: ["postalCode"],
        message: "Mã bưu chính chưa hợp lệ",
      });
  });

export function formatAddress(address: {
  countryCode?: string;
  postalCode?: string;
  street: string;
  ward: string;
  province: string;
  details?: string;
}) {
  const country = address.countryCode ?? "VN";
  const parts =
    country === "SG"
      ? [
          address.street,
          address.details,
          address.ward,
          address.province,
          address.postalCode,
        ]
      : country === "US"
        ? [
            address.street,
            address.details,
            address.ward,
            [address.province, address.postalCode].filter(Boolean).join(" "),
          ]
        : country === "FR"
          ? [
              address.street,
              address.details,
              [address.postalCode, address.ward].filter(Boolean).join(" "),
              address.province,
            ]
          : [
              address.street,
              address.ward,
              address.province,
              address.postalCode,
              address.details,
            ];
  return [...parts, country].filter(Boolean).join(", ");
}
