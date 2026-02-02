/**
 * EIP-712 type definitions for Permit2 with witness data.
 * These types are used for signing orders.
 */

/**
 * EIP-712 types for PermitBatchWitnessTransferFrom.
 * Used when signing orders with the outputs as witness data.
 */
export const PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPES = {
  PermitBatchWitnessTransferFrom: [
    { name: "permitted", type: "TokenPermissions[]" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "outputs", type: "Output[]" },
  ],
  TokenPermissions: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
  ],
  Output: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "recipient", type: "address" },
    { name: "chainId", type: "uint32" },
  ],
} as const;

/**
 * Type string for the witness data (outputs).
 * This is appended to the Permit2 type string when signing.
 */
export const OUTPUT_WITNESS_TYPE_STRING =
  "Output[] outputs)Output(address token,uint256 amount,address recipient,uint32 chainId)TokenPermissions(address token,uint256 amount)";
