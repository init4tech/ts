/**
 * Event result types for RollupOrders contract events.
 * These types represent the `args` returned by viem's `parseEventLogs`.
 */
import type { Address } from "viem";

import type { Input, Output } from "./primitives.js";

/**
 * Parsed args from an `Order` event emitted when an order is initiated.
 */
export interface OrderEvent {
  /** Order expiration deadline (unix timestamp) */
  readonly deadline: bigint;
  /** Tokens offered by the user */
  readonly inputs: readonly Input[];
  /** Tokens the user wants to receive */
  readonly outputs: readonly Output[];
}

/**
 * Parsed args from a `Filled` event emitted when outputs are filled.
 */
export interface FilledEvent {
  /** Outputs that were filled */
  readonly outputs: readonly Output[];
}

/**
 * Parsed args from a `Sweep` event emitted when tokens are swept.
 */
export interface SweepEvent {
  /** Recipient of the swept tokens */
  readonly recipient: Address;
  /** Token contract address */
  readonly token: Address;
  /** Amount swept */
  readonly amount: bigint;
}
