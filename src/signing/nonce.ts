import { toHex } from "viem";

function getRandomValues(bytes: Uint8Array): Uint8Array {
  if (typeof globalThis.crypto !== "undefined") {
    return globalThis.crypto.getRandomValues(bytes);
  }
  // Node 18 fallback — webcrypto exists but isn't on globalThis
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require("node:crypto") as {
    webcrypto: { getRandomValues: (b: Uint8Array) => Uint8Array };
  };
  return nodeCrypto.webcrypto.getRandomValues(bytes);
}

export function randomNonce(): bigint {
  const bytes = new Uint8Array(32);
  getRandomValues(bytes);
  return BigInt(toHex(bytes));
}
