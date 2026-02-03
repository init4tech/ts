import { encodeFunctionData, type Address, type Hex } from "viem";
import type { SignedOrder } from "../types/order.js";
import type { SignedFill } from "../types/fill.js";
import { rollupOrdersAbi } from "../abi/rollupOrders.js";
import { hostOrdersAbi } from "../abi/hostOrders.js";

export function encodeInitiatePermit2(
  order: SignedOrder,
  tokenRecipient: Address
): Hex {
  return encodeFunctionData({
    abi: rollupOrdersAbi,
    functionName: "initiatePermit2",
    args: [tokenRecipient, order.outputs, order.permit],
  });
}

export function encodeFillPermit2(fill: SignedFill): Hex {
  return encodeFunctionData({
    abi: hostOrdersAbi,
    functionName: "fillPermit2",
    args: [fill.outputs, fill.permit],
  });
}
