import { describe, expect, it } from "vitest";
import { decodeFunctionData } from "viem";
import {
  encodeInitiatePermit2,
  encodeFillPermit2,
} from "../src/signing/encode.js";
import { rollupOrdersAbi } from "../src/abi/rollupOrders.js";
import { hostOrdersAbi } from "../src/abi/hostOrders.js";
import type { SignedOrder } from "../src/types/order.js";
import type { SignedFill } from "../src/types/fill.js";

const permit = {
  permit: {
    permitted: [
      {
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as const,
        amount: 1000n,
      },
    ],
    nonce: 42n,
    deadline: 1700000000n,
  },
  owner: "0x0000000000000000000000000000000000000001" as const,
  signature: "0x00" as const,
};

const outputs = [
  {
    token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as const,
    amount: 1000n,
    recipient: "0x0000000000000000000000000000000000000002" as const,
    chainId: 1,
  },
];

describe("encodeInitiatePermit2", () => {
  it("produces decodable calldata", () => {
    const order: SignedOrder = { permit, outputs };
    const recipient = "0x0000000000000000000000000000000000000003" as const;
    const data = encodeInitiatePermit2(order, recipient);

    expect(data.startsWith("0x")).toBe(true);

    const decoded = decodeFunctionData({
      abi: rollupOrdersAbi,
      data,
    });
    expect(decoded.functionName).toBe("initiatePermit2");
  });
});

describe("encodeFillPermit2", () => {
  it("produces decodable calldata", () => {
    const fill: SignedFill = { permit, outputs };
    const data = encodeFillPermit2(fill);

    expect(data.startsWith("0x")).toBe(true);

    const decoded = decodeFunctionData({
      abi: hostOrdersAbi,
      data,
    });
    expect(decoded.functionName).toBe("fillPermit2");
  });
});
