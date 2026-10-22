import { z } from "zod";
import { normalize } from "../catalog";
import {
  ProviderError,
  ProviderParcel,
  ProviderEvent,
  ShippingProvider,
} from "./contract";
export const STAGING_BASE =
  "https://dev-online-gateway.ghn.vn/shiip/public-api";
const address = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^(0|\+84)[0-9]{9,10}$/),
  address: z.string().trim().min(5).max(1024),
  province: z.string().trim().min(2),
  ward: z.string().trim().min(2),
});
export const parcelSchema = z.object({
  weight: z.number().int().min(1).max(19999),
  length: z.number().int().min(1).max(200),
  width: z.number().int().min(1).max(200),
  height: z.number().int().min(1).max(200),
  insuredValue: z.number().int().min(0).max(5000000),
  cod: z.number().int().min(1).max(50000000),
  content: z.string().min(3).max(2000),
  clientRef: z.string().min(1).max(50),
  recipient: address,
});
export type GHNConfig = {
  token: string;
  shopId: number;
  base: string;
  pickup: z.infer<typeof address>;
};
export function ghnConfig(env: NodeJS.ProcessEnv = process.env): GHNConfig {
  if (env.GHN_ENVIRONMENT !== "staging")
    throw new ProviderError("STAGING_DISABLED");
  if ((env.GHN_STAGING_BASE_URL ?? STAGING_BASE) !== STAGING_BASE)
    throw new ProviderError("NON_STAGING_URL_BLOCKED");
  if (!env.GHN_STAGING_TOKEN || !/^\d+$/.test(env.GHN_STAGING_SHOP_ID ?? ""))
    throw new ProviderError("MISSING_STAGING_CREDENTIALS");
  let pickup: unknown;
  try {
    pickup = JSON.parse(env.GHN_STAGING_PICKUP_JSON ?? "");
  } catch {
    throw new ProviderError("MISSING_PICKUP_CONFIGURATION");
  }
  const parsed = address.safeParse(pickup);
  if (!parsed.success) throw new ProviderError("INVALID_PICKUP_CONFIGURATION");
  return {
    token: env.GHN_STAGING_TOKEN,
    shopId: Number(env.GHN_STAGING_SHOP_ID),
    base: STAGING_BASE,
    pickup: parsed.data,
  };
}
export function ghnAvailability() {
  return {
    available: false,
    label: "Demo local — không kết nối hãng vận chuyển",
    verification: "DISABLED",
    errorCode: "REAL_CARRIERS_DISABLED_LOCAL_DEMO",
  };
}
const envelope = z.object({
  code: z.number(),
  data: z.unknown(),
  message: z.string().optional(),
});
const info = z
  .object({
    order_code: z.string().min(1),
    client_order_code: z.string().min(1),
    shop_id: z.number().int(),
    status: z.string(),
    updated_date: z.string().datetime(),
    cod_amount: z.number().int().nonnegative(),
  })
  .passthrough();
const callback = z.object({
  OrderCode: z.string().min(1).max(100),
  ClientOrderCode: z.string().min(1).max(50),
  ShopID: z.number().int(),
  Type: z.string().min(1).max(50),
  Status: z.string().max(100),
  Time: z.string().datetime(),
  Reason: z.string().max(2000).optional(),
  ReasonCode: z.string().max(100).optional(),
  CODAmount: z.number().int().nonnegative().optional(),
});
export const ghnStatusMap: Record<string, string | null> = {
  ready_to_pick: "READY_FOR_PICKUP",
  picking: "READY_FOR_PICKUP",
  money_collect_picking: "READY_FOR_PICKUP",
  picked: "PICKED_UP",
  storing: "IN_TRANSIT",
  sorting: "IN_TRANSIT",
  transporting: "IN_TRANSIT",
  delivering: "OUT_FOR_DELIVERY",
  money_collect_delivering: "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
  delivery_fail: "DELIVERY_FAILED",
  waiting_to_return: "RETURNING",
  return: "RETURNING",
  return_transporting: "RETURNING",
  return_sorting: "RETURNING",
  returning: "RETURNING",
  return_fail: "RETURNING",
  returned: "RETURNED",
  cancel: "CANCELED",
  exception: null,
  lost: null,
  damage: null,
  scrap: null,
};
export class GHNShippingProvider implements ShippingProvider {
  readonly name = "GHN_STAGING";
  readonly verification: "MOCK_VERIFIED" | "STAGING_UNVERIFIED";
  constructor(
    readonly config: GHNConfig,
    private transport: typeof fetch = async () => {
      throw new ProviderError("REAL_CARRIERS_DISABLED_LOCAL_DEMO");
    },
    mock = false,
  ) {
    if (config.base !== STAGING_BASE)
      throw new ProviderError("NON_STAGING_URL_BLOCKED");
    this.verification = mock ? "MOCK_VERIFIED" : "STAGING_UNVERIFIED";
  }
  async request(path: string, body?: unknown) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const r = await this.transport(this.config.base + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Token: this.config.token,
          ShopId: String(this.config.shopId),
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        redirect: "error",
        cache: "no-store",
      });
      const raw = await r.text();
      if (raw.length > 1000000)
        throw new ProviderError("INVALID_RESPONSE", true);
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new ProviderError("INVALID_RESPONSE", true);
      }
      const e = envelope.safeParse(parsed);
      if (!e.success) throw new ProviderError("INVALID_RESPONSE", true);
      if (!r.ok || e.data.code !== 200) {
        if (e.data.message?.includes("Đơn hàng không tồn tại"))
          throw new ProviderError("NOT_FOUND");
        throw new ProviderError(
          r.status >= 500 ? "UPSTREAM_UNAVAILABLE" : "REQUEST_REJECTED",
          r.status >= 500,
        );
      }
      return e.data.data;
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      throw new ProviderError("TIMEOUT_OR_NETWORK_ERROR", true);
    } finally {
      clearTimeout(timeout);
    }
  }
  private async canonical(province: string, ward: string) {
    const schema = z.array(
      z.object({
        _id: z.number().int(),
        name: z.string(),
        extension_names: z.array(z.string()).optional(),
        status: z.number().optional(),
      }),
    );
    const provinces = schema.safeParse(
      await this.request("/v3/master-data/province/all?limit=200"),
    );
    if (!provinces.success)
      throw new ProviderError("ADDRESS_CATALOG_UNAVAILABLE");
    const matches = (entry: z.infer<typeof schema>[number], value: string) =>
      entry.status !== 0 &&
      [entry.name, ...(entry.extension_names ?? [])].some(
        (n) => normalize(n).trim() === normalize(value).trim(),
      );
    const p = provinces.data.filter((p) => matches(p, province));
    if (p.length !== 1)
      throw new ProviderError("INVALID_PROVINCE_SELECT_CANONICAL_NAME");
    const wards = schema.safeParse(
      await this.request(
        `/v3/master-data/ward/all-by-province-id?province_id=${p[0]._id}&limit=200`,
      ),
    );
    if (!wards.success) throw new ProviderError("ADDRESS_CATALOG_UNAVAILABLE");
    const w = wards.data.filter((w) => matches(w, ward));
    if (w.length !== 1)
      throw new ProviderError("INVALID_WARD_SELECT_CANONICAL_NAME");
    return { province: p[0].name, ward: w[0].name };
  }
  async requestBody(input: ProviderParcel) {
    const p = parcelSchema.safeParse(input);
    if (!p.success) throw new ProviderError("INVALID_ADDRESS_OR_PARCEL");
    const to = await this.canonical(
      p.data.recipient.province,
      p.data.recipient.ward,
    );
    const from = await this.canonical(
      this.config.pickup.province,
      this.config.pickup.ward,
    );
    return {
      client_order_code: p.data.clientRef,
      payment_type_id: 1,
      required_note: "KHONGCHOXEMHANG",
      service_type_id: 2,
      to_name: p.data.recipient.name,
      to_phone: p.data.recipient.phone,
      to_address: p.data.recipient.address,
      to_province_name: to.province,
      to_ward_name: to.ward,
      is_new_to_address: true,
      from_name: this.config.pickup.name,
      from_phone: this.config.pickup.phone,
      from_address: this.config.pickup.address,
      from_province_name: from.province,
      from_ward_name: from.ward,
      is_new_from_address: true,
      weight: p.data.weight,
      length: p.data.length,
      width: p.data.width,
      height: p.data.height,
      insurance_value: p.data.insuredValue,
      cod_amount: p.data.cod,
      content: p.data.content,
    };
  }
  async calculateShippingFee(p: ProviderParcel) {
    const r = z
      .object({ total_fee: z.number().int().nonnegative() })
      .safeParse(
        await this.request(
          "/v2/shipping-order/preview",
          await this.requestBody(p),
        ),
      );
    if (!r.success) throw new ProviderError("INVALID_FEE_RESPONSE");
    return { total: r.data.total_fee, currency: "VND" as const };
  }
  async createShipment(p: ProviderParcel) {
    const r = z
      .object({
        order_code: z.string().min(1),
        total_fee: z.number().int().nonnegative(),
      })
      .safeParse(
        await this.request(
          "/v2/shipping-order/create",
          await this.requestBody(p),
        ),
      );
    if (!r.success) throw new ProviderError("INVALID_CREATE_RESPONSE", true);
    return { code: r.data.order_code, fee: r.data.total_fee };
  }
  private parseInfo(data: unknown) {
    const r = info.safeParse(data);
    if (!r.success) throw new ProviderError("INVALID_TRACKING_RESPONSE", true);
    const d = r.data;
    return this.normalizeTrackingEvent({
      OrderCode: d.order_code,
      ClientOrderCode: d.client_order_code,
      ShopID: d.shop_id,
      Status: d.status,
      Type: "switch_status",
      Time: d.updated_date,
      CODAmount: d.cod_amount,
    });
  }
  async getShipment(code: string) {
    return this.parseInfo(
      await this.request(
        `/v2/shipping-order/detail?order_code=${encodeURIComponent(code)}`,
      ),
    );
  }
  async lookupShipment(clientRef: string) {
    return this.parseInfo(
      await this.request(
        `/v2/shipping-order/detail-by-client-code?client_order_code=${encodeURIComponent(clientRef)}`,
      ),
    );
  }
  trackShipment(code: string) {
    return this.getShipment(code);
  }
  async cancelShipment(code: string, reason: string) {
    const r = z
      .array(z.object({ order_code: z.string(), result: z.boolean() }))
      .safeParse(
        await this.request("/v2/switch-status/cancel", {
          order_codes: [code],
          reason_code: "GHN-CANCEL-OTHER",
          reason,
        }),
      );
    if (!r.success || !r.data.find((x) => x.order_code === code)?.result)
      throw new ProviderError("CANCELLATION_REJECTED");
  }
  normalizeTrackingEvent(payload: unknown): ProviderEvent {
    const r = callback.safeParse(payload);
    if (!r.success) throw new ProviderError("INVALID_WEBHOOK_PAYLOAD");
    const d = r.data;
    return {
      code: d.OrderCode,
      clientRef: d.ClientOrderCode,
      shopId: d.ShopID,
      status: d.Status,
      type: d.Type,
      time: d.Time,
      reason: d.Reason ? "GHN_RECORDED_EXCEPTION" : "",
      reasonCode: d.ReasonCode ?? "",
      cod: d.CODAmount ?? null,
      safePayload: {
        OrderCode: d.OrderCode,
        ClientOrderCode: d.ClientOrderCode,
        ShopID: d.ShopID,
        Type: d.Type,
        Status: d.Status,
        Time: d.Time,
        ReasonCode: d.ReasonCode ?? "",
        CODAmount: d.CODAmount ?? null,
      },
    };
  }
}
