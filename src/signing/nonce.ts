import { randomBytes } from "node:crypto";
import { toHex } from "viem";

export function randomNonce(): bigint {
  return BigInt(toHex(randomBytes(32)));
}
