import { describe, expect, it } from "vitest";
import { randomNonce } from "../src/signing/nonce.js";

describe("randomNonce", () => {
  it("produces a bigint", () => {
    const nonce = randomNonce();
    expect(typeof nonce).toBe("bigint");
  });

  it("produces a value that fits in 256 bits", () => {
    const nonce = randomNonce();
    expect(nonce).toBeGreaterThanOrEqual(0n);
    expect(nonce).toBeLessThan(2n ** 256n);
  });

  it("produces unique values in a batch", () => {
    const nonces = new Set<bigint>();
    for (let i = 0; i < 100; i++) {
      nonces.add(randomNonce());
    }
    expect(nonces.size).toBe(100);
  });
});
