/**
 * Minimal Permit2 ABI for nonce checking.
 *
 * Permit2 stores nonces as a bitmap where:
 * - `wordPosition = nonce >> 8` (high 248 bits)
 * - `bitPosition = nonce & 0xff` (low 8 bits)
 *
 * A nonce is consumed if the bit at `bitPosition` in the word at
 * `wordPosition` is set.
 */
export const permit2Abi = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "wordPosition", type: "uint256" },
    ],
    name: "nonceBitmap",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
