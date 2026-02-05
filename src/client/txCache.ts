import type { SignetEthBundle } from "../types/bundle.js";
import type { SignedOrder } from "../types/order.js";
import { serializeEthBundle } from "../types/bundleSerialization.js";
import { serializeOrder } from "../types/serialization.js";

export interface TxCacheClient {
  submitOrder(order: SignedOrder): Promise<{ id: string }>;
  submitBundle(bundle: SignetEthBundle): Promise<{ id: string }>;
}

export function createTxCacheClient(baseUrl: string): TxCacheClient {
  async function post(path: string, body: unknown): Promise<{ id: string }> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Transaction cache error ${String(response.status)}: ${errorBody || response.statusText}`
      );
    }
    return (await response.json()) as { id: string };
  }

  return {
    submitOrder(order) {
      return post("/orders", serializeOrder(order));
    },
    submitBundle(bundle) {
      return post("/bundles", serializeEthBundle(bundle));
    },
  };
}
