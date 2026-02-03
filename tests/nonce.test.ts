import { describe, expect, it } from "vitest";
import { nonceFromSeed, randomNonce } from "../src/signing/nonce.js";

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

describe("nonceFromSeed", () => {
  it("produces a bigint", () => {
    const nonce = nonceFromSeed("test-seed");
    expect(typeof nonce).toBe("bigint");
  });

  it("produces a value that fits in 256 bits", () => {
    const nonce = nonceFromSeed("test-seed");
    expect(nonce).toBeGreaterThanOrEqual(0n);
    expect(nonce).toBeLessThan(2n ** 256n);
  });

  it("is deterministic for the same seed", () => {
    const seed = "order-12345";
    const nonce1 = nonceFromSeed(seed);
    const nonce2 = nonceFromSeed(seed);
    expect(nonce1).toBe(nonce2);
  });

  it("produces different values for different seeds", () => {
    const nonce1 = nonceFromSeed("seed-a");
    const nonce2 = nonceFromSeed("seed-b");
    expect(nonce1).not.toBe(nonce2);
  });

  it("handles numeric seeds", () => {
    const nonce1 = nonceFromSeed(12345);
    const nonce2 = nonceFromSeed(12345n);
    const nonce3 = nonceFromSeed("12345");

    // Number and bigint become same string via toString()
    expect(nonce1).toBe(nonce2);
    expect(nonce1).toBe(nonce3);
  });

  it("handles empty string seed", () => {
    const nonce = nonceFromSeed("");
    expect(typeof nonce).toBe("bigint");
    expect(nonce).toBeGreaterThanOrEqual(0n);
  });

  it("handles special characters in seed", () => {
    const nonce = nonceFromSeed("test-seed-!@#$%^&*()");
    expect(typeof nonce).toBe("bigint");
    expect(nonce).toBeGreaterThanOrEqual(0n);
  });
});
