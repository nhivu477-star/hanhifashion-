import { ProviderError } from "./contract";
/** Permanent LOCAL E-COMMERCE DEMO rule: no carrier transport, even with credentials. */
export async function ghnProvider(): Promise<
  import("./ghn").GHNShippingProvider
> {
  throw new ProviderError("REAL_CARRIERS_DISABLED_LOCAL_DEMO");
}
