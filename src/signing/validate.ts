/**
 * Runtime validation for signed orders and fills.
 */
import { isAddressEqual } from "viem";
import type { SignedFill } from "../types/fill.js";
import type { SignedOrder } from "../types/order.js";
import { nowSeconds } from "../utils/time.js";

/** Validate that a signed order has not expired. Throws on failure. */
export function validateOrder(order: SignedOrder): void {
  const now = nowSeconds();
  if (order.permit.permit.deadline < now) {
    throw new Error(
      `Order expired: deadline ${String(order.permit.permit.deadline)} < now ${String(now)}`
    );
  }
}

/** Validate that a signed fill has not expired and its outputs match permitted tokens. Throws on failure. */
export function validateFill(fill: SignedFill): void {
  const now = nowSeconds();
  if (fill.permit.permit.deadline < now) {
    throw new Error(
      `Fill expired: deadline ${String(fill.permit.permit.deadline)} < now ${String(now)}`
    );
  }

  const { permitted } = fill.permit.permit;
  const { outputs } = fill;

  if (outputs.length !== permitted.length) {
    throw new Error(
      `Length mismatch: ${String(outputs.length)} outputs but ${String(permitted.length)} permitted tokens`
    );
  }

  outputs.forEach((output, i) => {
    if (!isAddressEqual(output.token, permitted[i].token)) {
      throw new Error(
        `Token mismatch at index ${String(i)}: output ${output.token} != permitted ${permitted[i].token}`
      );
    }
    if (output.amount !== permitted[i].amount) {
      throw new Error(
        `Amount mismatch at index ${String(i)}: output ${String(output.amount)} != permitted ${String(permitted[i].amount)}`
      );
    }
  });
}
