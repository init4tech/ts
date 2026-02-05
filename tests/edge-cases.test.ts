/**
 * Edge case tests for boundary conditions and unusual inputs.
 */
import { describe, expect, it } from "vitest";
import type { Address, Hex } from "viem";
import {
  normalizeSignature,
  nonceFromSeed,
  orderHash,
  randomNonce,
} from "../src/index.js";
import type { SignedOrder } from "../src/types/order.js";

const validAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address;
const zeroAddress = "0x0000000000000000000000000000000000000000" as Address;

const createValidOrder = (overrides?: Partial<SignedOrder>): SignedOrder => ({
  permit: {
    permit: {
      permitted: [{ token: validAddress, amount: 1000n }],
      nonce: 1n,
      deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
    },
    owner: "0x0000000000000000000000000000000000000001",
    signature:
      "0x0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000200",
  },
  outputs: [
    {
      token: validAddress,
      amount: 1000n,
      recipient: "0x0000000000000000000000000000000000000002",
      chainId: 1,
    },
  ],
  ...overrides,
});

describe("Signature edge cases", () => {
  it("handles minimal valid signature (65 bytes)", () => {
    const minSig =
      "0x0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100" as Hex;
    const normalized = normalizeSignature(minSig);
    expect(normalized).toHaveLength(132); // 0x + 130 hex chars = 65 bytes
  });

  it("normalizes high-S signature to low-S", () => {
    // A signature with S value in upper half of curve
    const highS =
      "0x0000000000000000000000000000000000000000000000000000000000000001fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036413f1b" as Hex;
    const normalized = normalizeSignature(highS);

    // S should be flipped, v should change
    expect(normalized).not.toBe(highS);
  });

  it("leaves low-S signature unchanged", () => {
    // A signature with S value in lower half of curve
    const lowS =
      "0x0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100" as Hex;
    const normalized = normalizeSignature(lowS);
    expect(normalized).toBe(lowS);
  });

  it("order hash is deterministic", () => {
    const order = createValidOrder();
    const hash1 = orderHash(order);
    const hash2 = orderHash(order);
    expect(hash1).toBe(hash2);
  });

  it("different signatures produce different hashes", () => {
    const order1 = createValidOrder();
    const order2 = createValidOrder({
      permit: {
        ...order1.permit,
        signature:
          "0x0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000300",
      },
    });
    expect(orderHash(order1)).not.toBe(orderHash(order2));
  });
});

describe("Value boundary tests", () => {
  describe("amounts", () => {
    it("handles zero amount", () => {
      const order = createValidOrder({
        permit: {
          ...createValidOrder().permit,
          permit: {
            ...createValidOrder().permit.permit,
            permitted: [{ token: validAddress, amount: 0n }],
          },
        },
        outputs: [
          {
            token: validAddress,
            amount: 0n,
            recipient: zeroAddress,
            chainId: 1,
          },
        ],
      });
      expect(() => orderHash(order)).not.toThrow();
    });

    it("handles max uint256 amount", () => {
      const maxU256 = 2n ** 256n - 1n;
      const order = createValidOrder({
        permit: {
          ...createValidOrder().permit,
          permit: {
            ...createValidOrder().permit.permit,
            permitted: [{ token: validAddress, amount: maxU256 }],
          },
        },
        outputs: [
          {
            token: validAddress,
            amount: maxU256,
            recipient: zeroAddress,
            chainId: 1,
          },
        ],
      });
      expect(() => orderHash(order)).not.toThrow();
    });
  });

  describe("deadlines", () => {
    it("handles zero deadline", () => {
      const order = createValidOrder({
        permit: {
          ...createValidOrder().permit,
          permit: {
            ...createValidOrder().permit.permit,
            deadline: 0n,
          },
        },
      });
      expect(() => orderHash(order)).not.toThrow();
    });

    it("handles max uint256 deadline", () => {
      const maxU256 = 2n ** 256n - 1n;
      const order = createValidOrder({
        permit: {
          ...createValidOrder().permit,
          permit: {
            ...createValidOrder().permit.permit,
            deadline: maxU256,
          },
        },
      });
      expect(() => orderHash(order)).not.toThrow();
    });
  });

  describe("nonces", () => {
    it("handles zero nonce", () => {
      const order = createValidOrder({
        permit: {
          ...createValidOrder().permit,
          permit: {
            ...createValidOrder().permit.permit,
            nonce: 0n,
          },
        },
      });
      expect(() => orderHash(order)).not.toThrow();
    });

    it("handles max uint256 nonce", () => {
      const maxU256 = 2n ** 256n - 1n;
      const order = createValidOrder({
        permit: {
          ...createValidOrder().permit,
          permit: {
            ...createValidOrder().permit.permit,
            nonce: maxU256,
          },
        },
      });
      expect(() => orderHash(order)).not.toThrow();
    });

    it("randomNonce produces 256-bit values", () => {
      for (let i = 0; i < 10; i++) {
        const nonce = randomNonce();
        expect(nonce).toBeGreaterThanOrEqual(0n);
        expect(nonce).toBeLessThan(2n ** 256n);
      }
    });

    it("nonceFromSeed is deterministic", () => {
      const seed = "test-seed-12345";
      const nonce1 = nonceFromSeed(seed);
      const nonce2 = nonceFromSeed(seed);
      expect(nonce1).toBe(nonce2);
    });

    it("nonceFromSeed produces different values for different seeds", () => {
      const nonce1 = nonceFromSeed("seed-a");
      const nonce2 = nonceFromSeed("seed-b");
      expect(nonce1).not.toBe(nonce2);
    });

    it("nonceFromSeed handles numeric seeds", () => {
      const nonce1 = nonceFromSeed(12345);
      const nonce2 = nonceFromSeed(12345n);
      const nonce3 = nonceFromSeed("12345");
      // All should produce 256-bit values
      expect(nonce1).toBeGreaterThanOrEqual(0n);
      expect(nonce2).toBeGreaterThanOrEqual(0n);
      expect(nonce3).toBeGreaterThanOrEqual(0n);
      // But numeric and string "12345" will differ due to toString conversion
      expect(nonce1).toBe(nonce2);
    });
  });

  describe("chain IDs", () => {
    it("handles zero chain ID", () => {
      const order = createValidOrder({
        outputs: [
          {
            token: validAddress,
            amount: 1000n,
            recipient: zeroAddress,
            chainId: 0,
          },
        ],
      });
      expect(() => orderHash(order)).not.toThrow();
    });

    it("handles max uint32 chain ID", () => {
      const maxU32 = 2 ** 32 - 1;
      const order = createValidOrder({
        outputs: [
          {
            token: validAddress,
            amount: 1000n,
            recipient: zeroAddress,
            chainId: maxU32,
          },
        ],
      });
      expect(() => orderHash(order)).not.toThrow();
    });
  });
});

describe("Large batch tests", () => {
  const makeAddress = (i: number): Address =>
    `0x${(i + 1).toString(16).padStart(40, "0")}`;

  it("handles order with 50 outputs", () => {
    const outputs = Array.from({ length: 50 }, (_, i) => ({
      token: validAddress,
      amount: BigInt(i + 1) * 1000n,
      recipient: makeAddress(i),
      chainId: 1,
    }));

    const order = createValidOrder({
      permit: {
        ...createValidOrder().permit,
        permit: {
          ...createValidOrder().permit.permit,
          permitted: outputs.map((o) => ({ token: o.token, amount: o.amount })),
        },
      },
      outputs,
    });

    expect(() => orderHash(order)).not.toThrow();
    const hash = orderHash(order);
    expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("handles order with 100 outputs", () => {
    const outputs = Array.from({ length: 100 }, (_, i) => ({
      token: validAddress,
      amount: BigInt(i + 1) * 1000n,
      recipient: makeAddress(i),
      chainId: 1,
    }));

    const order = createValidOrder({
      permit: {
        ...createValidOrder().permit,
        permit: {
          ...createValidOrder().permit.permit,
          permitted: outputs.map((o) => ({ token: o.token, amount: o.amount })),
        },
      },
      outputs,
    });

    expect(() => orderHash(order)).not.toThrow();
    const hash = orderHash(order);
    expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("handles order with multiple distinct tokens", () => {
    const tokens = Array.from({ length: 10 }, (_, i) => makeAddress(i));

    const outputs = tokens.map((token, i) => ({
      token,
      amount: BigInt(i + 1) * 1000n,
      recipient: zeroAddress,
      chainId: 1,
    }));

    const order = createValidOrder({
      permit: {
        ...createValidOrder().permit,
        permit: {
          ...createValidOrder().permit.permit,
          permitted: outputs.map((o) => ({ token: o.token, amount: o.amount })),
        },
      },
      outputs,
    });

    expect(() => orderHash(order)).not.toThrow();
  });
});

describe("Address edge cases", () => {
  it("handles zero address as token", () => {
    const order = createValidOrder({
      permit: {
        ...createValidOrder().permit,
        permit: {
          ...createValidOrder().permit.permit,
          permitted: [{ token: zeroAddress, amount: 1000n }],
        },
      },
      outputs: [
        {
          token: zeroAddress,
          amount: 1000n,
          recipient: validAddress,
          chainId: 1,
        },
      ],
    });
    expect(() => orderHash(order)).not.toThrow();
  });

  it("handles zero address as recipient", () => {
    const order = createValidOrder({
      outputs: [
        {
          token: validAddress,
          amount: 1000n,
          recipient: zeroAddress,
          chainId: 1,
        },
      ],
    });
    expect(() => orderHash(order)).not.toThrow();
  });

  it("handles zero address as owner", () => {
    const order = createValidOrder({
      permit: {
        ...createValidOrder().permit,
        owner: zeroAddress,
      },
    });
    expect(() => orderHash(order)).not.toThrow();
  });
});
