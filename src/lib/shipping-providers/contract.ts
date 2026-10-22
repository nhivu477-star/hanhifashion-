export type ProviderParcel = {
  weight: number;
  length: number;
  width: number;
  height: number;
  insuredValue: number;
  cod: number;
  content: string;
  clientRef: string;
  recipient: {
    name: string;
    phone: string;
    address: string;
    province: string;
    ward: string;
  };
};
export type ProviderEvent = {
  code: string;
  clientRef: string;
  shopId: number;
  type: string;
  status: string;
  time: string;
  reason: string;
  reasonCode: string;
  cod: number | null;
  safePayload: Record<string, unknown>;
};
export interface ShippingProvider {
  readonly name: string;
  readonly verification: "MOCK_VERIFIED" | "STAGING_UNVERIFIED" | "MANUAL";
  calculateShippingFee(
    parcel: ProviderParcel,
  ): Promise<{ total: number; currency: "VND" }>;
  createShipment(
    parcel: ProviderParcel,
  ): Promise<{ code: string; fee: number }>;
  getShipment(code: string): Promise<ProviderEvent>;
  lookupShipment(clientRef: string): Promise<ProviderEvent>;
  cancelShipment(code: string, reason: string): Promise<void>;
  trackShipment(code: string): Promise<ProviderEvent>;
  normalizeTrackingEvent(payload: unknown): ProviderEvent;
}
export class ProviderError extends Error {
  constructor(
    public code: string,
    public uncertain = false,
  ) {
    super(`GHN: ${code}`);
    this.name = "ProviderError";
  }
}
