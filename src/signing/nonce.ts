import { toHex } from "viem";

export function randomNonce(): bigint {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return BigInt(toHex(bytes));
}
