import { describe, expect, it } from "vitest";
import type { Address, Hex } from "viem";
import {
  serializeOrder,
  deserializeOrder,
} from "../src/types/serialization.js";
import type { SignedOrder } from "../src/types/order.js";
import vectors from "./vectors.json";

interface SerializedVector {
  name: string;
  signedOrder: {
    outputs: Array<{
      token: Address;
      amount: Hex;
      recipient: Address;
      chainId: number;
    }>;
    owner: Address;
    permit: {
      deadline: Hex;
      nonce: Hex;
      permitted: Array<{ token: Address; amount: Hex }>;
    };
    signature: Hex;
  };
}

function parseVector(v: SerializedVector): SignedOrder {
  return {
    permit: {
      permit: {
        permitted: v.signedOrder.permit.permitted.map((p) => ({
          token: p.token,
          amount: BigInt(p.amount),
        })),
        nonce: BigInt(v.signedOrder.permit.nonce),
        deadline: BigInt(v.signedOrder.permit.deadline),
      },
      owner: v.signedOrder.owner,
      signature: v.signedOrder.signature,
    },
    outputs: v.signedOrder.outputs.map((o) => ({
      token: o.token,
      amount: BigInt(o.amount),
      recipient: o.recipient,
      chainId: o.chainId,
    })),
  };
}

describe("serialization round-trip", () => {
  const testVectors = vectors as SerializedVector[];

  for (const v of testVectors) {
    it(`round-trips ${v.name}`, () => {
      const order = parseVector(v);
      const serialized = serializeOrder(order);
      const deserialized = deserializeOrder(serialized);
      expect(deserialized).toEqual(order);
    });
  }
});
