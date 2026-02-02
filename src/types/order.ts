/**
 * Order types for Signet SDK.
 */
import type { Address, Hex } from "viem";
import type { Output, Permit2Batch } from "./primitives.js";

/**
 * A SignedOrder represents a single Order after it has been permit2-encoded and signed.
 * It is the final format signed by Users and shared with Fillers.
 *
 * Corresponds to the parameters for `initiatePermit2` on the OrderOrigin contract.
 */
export interface SignedOrder {
  /** The permit batch with owner and signature */
  readonly permit: Permit2Batch;
  /** The desired outputs */
  readonly outputs: readonly Output[];
}

/**
 * Chain configuration for signing orders.
 */
export interface ChainConfig {
  /** Order contract address for the target chain */
  readonly orderContract: Address;
  /** Chain ID for the target chain */
  readonly chainId: bigint;
}

/**
 * Parameters for building an unsigned order.
 */
export interface UnsignedOrderParams {
  /** Token inputs (what user is offering) */
  readonly inputs: readonly { token: Address; amount: bigint }[];
  /** Desired outputs (what user wants to receive) */
  readonly outputs: readonly Output[];
  /** Order deadline as unix timestamp */
  readonly deadline: bigint;
  /** Permit2 nonce */
  readonly nonce: bigint;
  /** Chain configuration */
  readonly chain: ChainConfig;
}

/**
 * Serialized form of a signed order for JSON transport.
 * Amounts are hex-encoded strings.
 */
export interface SerializedSignedOrder {
  readonly permit: {
    readonly permit: {
      readonly permitted: readonly {
        readonly token: Address;
        readonly amount: Hex;
      }[];
      readonly nonce: Hex;
      readonly deadline: Hex;
    };
    readonly owner: Address;
    readonly signature: Hex;
  };
  readonly outputs: readonly {
    readonly token: Address;
    readonly amount: Hex;
    readonly recipient: Address;
    readonly chainId: number;
  }[];
}
