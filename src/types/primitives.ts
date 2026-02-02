/**
 * Primitive type definitions for Signet SDK.
 * These map Rust types to their TypeScript/viem equivalents.
 */
import type { Address, Hex } from "viem";

export type { Address, Hex };

/**
 * 32-byte hash, represented as a hex string.
 */
export type B256 = Hex;

/**
 * Variable-length bytes, represented as a hex string.
 */
export type Bytes = Hex;

/**
 * Token permission for Permit2.
 */
export interface TokenPermissions {
  /** Token contract address */
  readonly token: Address;
  /** Amount to transfer (as bigint for U256 precision) */
  readonly amount: bigint;
}

/**
 * Order input - tokens being offered by the user.
 */
export interface Input {
  /** Token contract address */
  readonly token: Address;
  /** Amount to transfer (as bigint for U256 precision) */
  readonly amount: bigint;
}

/**
 * Order output - tokens the user wants to receive.
 */
export interface Output {
  /** Token contract address */
  readonly token: Address;
  /** Amount to receive (as bigint for U256 precision) */
  readonly amount: bigint;
  /** Recipient address */
  readonly recipient: Address;
  /** Target chain ID (as number, safe for chain IDs) */
  readonly chainId: number;
}

/**
 * Permit2 batch transfer from parameters.
 */
export interface PermitBatchTransferFrom {
  /** Array of token permissions */
  readonly permitted: readonly TokenPermissions[];
  /** Permit2 nonce (as bigint for U256 precision) */
  readonly nonce: bigint;
  /** Deadline timestamp (as bigint for U256 precision) */
  readonly deadline: bigint;
}

/**
 * Permit2 batch with owner and signature.
 */
export interface Permit2Batch {
  /** The permit parameters */
  readonly permit: PermitBatchTransferFrom;
  /** Owner address who signed the permit */
  readonly owner: Address;
  /** ECDSA signature bytes */
  readonly signature: Hex;
}
