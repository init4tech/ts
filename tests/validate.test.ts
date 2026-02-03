import { describe, expect, it } from "vitest";
import { validateOrder, validateFill } from "../src/signing/validate.js";
import type { SignedOrder } from "../src/types/order.js";
import type { SignedFill } from "../src/types/fill.js";

const futureDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
const pastDeadline = BigInt(Math.floor(Date.now() / 1000) - 3600);

const validPermit = {
  permit: {
    permitted: [
      {
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as const,
        amount: 1000n,
      },
    ],
    nonce: 1n,
    deadline: futureDeadline,
  },
  owner: "0x0000000000000000000000000000000000000001" as const,
  signature: "0x00" as const,
};

const validOutputs = [
  {
    token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as const,
    amount: 1000n,
    recipient: "0x0000000000000000000000000000000000000002" as const,
    chainId: 1,
  },
];

describe("validateOrder", () => {
  it("accepts a valid order", () => {
    const order: SignedOrder = { permit: validPermit, outputs: validOutputs };
    expect(() => {
      validateOrder(order);
    }).not.toThrow();
  });

  it("rejects expired order", () => {
    const order: SignedOrder = {
      permit: {
        ...validPermit,
        permit: { ...validPermit.permit, deadline: pastDeadline },
      },
      outputs: validOutputs,
    };
    expect(() => {
      validateOrder(order);
    }).toThrow("expired");
  });
});

describe("validateFill", () => {
  it("accepts a valid fill", () => {
    const fill: SignedFill = { permit: validPermit, outputs: validOutputs };
    expect(() => {
      validateFill(fill);
    }).not.toThrow();
  });

  it("rejects expired fill", () => {
    const fill: SignedFill = {
      permit: {
        ...validPermit,
        permit: { ...validPermit.permit, deadline: pastDeadline },
      },
      outputs: validOutputs,
    };
    expect(() => {
      validateFill(fill);
    }).toThrow("expired");
  });

  it("rejects length mismatch", () => {
    const fill: SignedFill = {
      permit: validPermit,
      outputs: [...validOutputs, ...validOutputs],
    };
    expect(() => {
      validateFill(fill);
    }).toThrow("Length mismatch");
  });

  it("rejects token mismatch", () => {
    const fill: SignedFill = {
      permit: validPermit,
      outputs: [
        {
          ...validOutputs[0],
          token: "0x0000000000000000000000000000000000000099",
        },
      ],
    };
    expect(() => {
      validateFill(fill);
    }).toThrow("Token mismatch");
  });

  it("rejects amount mismatch", () => {
    const fill: SignedFill = {
      permit: validPermit,
      outputs: [{ ...validOutputs[0], amount: 9999n }],
    };
    expect(() => {
      validateFill(fill);
    }).toThrow("Amount mismatch");
  });
});
