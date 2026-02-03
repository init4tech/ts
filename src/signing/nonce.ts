import { toHex } from "viem";

export function randomNonce(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return BigInt(toHex(bytes));
}
