/**
 * EIP-712 domain construction for Permit2.
 */
import type { TypedDataDomain } from "viem";
import { PERMIT2_ADDRESS, PERMIT2_NAME } from "../constants/permit2.js";

/**
 * Construct the EIP-712 domain for Permit2 signing.
 *
 * @param chainId - The chain ID to include in the domain
 * @returns The EIP-712 domain for Permit2
 */
export function permit2Domain(chainId: bigint): TypedDataDomain {
  return {
    name: PERMIT2_NAME,
    chainId,
    verifyingContract: PERMIT2_ADDRESS,
    // version and salt are omitted per Permit2 spec
  };
}
