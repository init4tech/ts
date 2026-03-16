/**
 * Serialization and deserialization for signed orders.
 */
import { fromHex, toHex } from "viem";
import type { SignedOrder, SerializedSignedOrder } from "./order.js";

/** Serialize a {@link SignedOrder} to its JSON-transport representation. */
export function serializeOrder(order: SignedOrder): SerializedSignedOrder {
  const { permit, outputs } = order;
  return {
    owner: permit.owner,
    permit: {
      permitted: permit.permit.permitted.map((p) => ({
        token: p.token,
        amount: toHex(p.amount),
      })),
      nonce: toHex(permit.permit.nonce),
      deadline: toHex(permit.permit.deadline),
    },
    signature: permit.signature,
    outputs: outputs.map((o) => ({
      token: o.token,
      amount: toHex(o.amount),
      recipient: o.recipient,
      chainId: o.chainId,
    })),
  };
}

/** Deserialize a {@link SerializedSignedOrder} back into a {@link SignedOrder}. */
export function deserializeOrder(raw: SerializedSignedOrder): SignedOrder {
  return {
    permit: {
      permit: {
        permitted: raw.permit.permitted.map((p) => ({
          token: p.token,
          amount: fromHex(p.amount, "bigint"),
        })),
        nonce: fromHex(raw.permit.nonce, "bigint"),
        deadline: fromHex(raw.permit.deadline, "bigint"),
      },
      owner: raw.owner,
      signature: raw.signature,
    },
    outputs: raw.outputs.map((o) => ({
      token: o.token,
      amount: fromHex(o.amount, "bigint"),
      recipient: o.recipient,
      chainId: o.chainId,
    })),
  };
}
