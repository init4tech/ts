/**
 * Permit2 contract constants.
 */
import type { Address } from "viem";

/**
 * The canonical Permit2 contract address.
 * Deployed at the same address across all EVM chains.
 */
export const PERMIT2_ADDRESS: Address =
  "0x000000000022D473030F116dDEE9F6B43aC78BA3";

/**
 * Permit2 contract name for EIP-712 domain.
 */
export const PERMIT2_NAME = "Permit2" as const;
