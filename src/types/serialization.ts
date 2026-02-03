import { fromHex, toHex } from "viem";
import type { SignedOrder, SerializedSignedOrder } from "./order.js";

export function serializeOrder(order: SignedOrder): SerializedSignedOrder {
  const { permit, outputs } = order;
  return {
    permit: {
      permit: {
        permitted: permit.permit.permitted.map((p) => ({
          token: p.token,
          amount: toHex(p.amount),
        })),
        nonce: toHex(permit.permit.nonce),
        deadline: toHex(permit.permit.deadline),
      },
      owner: permit.owner,
      signature: permit.signature,
    },
    outputs: outputs.map((o) => ({
      token: o.token,
      amount: toHex(o.amount),
      recipient: o.recipient,
      chainId: o.chainId,
    })),
  };
}

export function deserializeOrder(raw: SerializedSignedOrder): SignedOrder {
  return {
    permit: {
      permit: {
        permitted: raw.permit.permit.permitted.map((p) => ({
          token: p.token,
          amount: fromHex(p.amount, "bigint"),
        })),
        nonce: fromHex(raw.permit.permit.nonce, "bigint"),
        deadline: fromHex(raw.permit.permit.deadline, "bigint"),
      },
      owner: raw.permit.owner,
      signature: raw.permit.signature,
    },
    outputs: raw.outputs.map((o) => ({
      token: o.token,
      amount: fromHex(o.amount, "bigint"),
      recipient: o.recipient,
      chainId: o.chainId,
    })),
  };
}
