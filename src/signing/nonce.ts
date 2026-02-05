import type { Address, PublicClient } from "viem";
import { keccak256, toBytes, toHex } from "viem";
import { permit2Abi } from "../abi/permit2.js";
import { PERMIT2_ADDRESS } from "../constants/permit2.js";

/**
 * Generate a random 256-bit nonce for Permit2.
 *
 * @returns A random bigint nonce
 */
export function randomNonce(): bigint {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return BigInt(toHex(bytes));
}

/**
 * Generate a deterministic nonce from a seed value.
 *
 * Useful for order tracking where you want to derive the nonce from
 * an identifier (e.g., order ID, timestamp + counter).
 *
 * @param seed - String, number, or bigint seed value
 * @returns A deterministic bigint nonce derived from the seed
 *
 * @example
 * ```typescript
 * // Derive nonce from order ID
 * const nonce = nonceFromSeed("order-12345");
 *
 * // Derive nonce from timestamp + counter
 * const nonce = nonceFromSeed(`${Date.now()}-${counter}`);
 * ```
 */
export function nonceFromSeed(seed: string | number | bigint): bigint {
  const seedStr = typeof seed === "string" ? seed : seed.toString();
  const hash = keccak256(toBytes(seedStr));
  return BigInt(hash);
}

/**
 * Check if a Permit2 nonce has been consumed.
 *
 * Permit2 stores nonces as a bitmap where:
 * - `wordPosition = nonce >> 8` (high 248 bits)
 * - `bitPosition = nonce & 0xff` (low 8 bits)
 *
 * @param client - Public client for reading contract state
 * @param owner - Address of the nonce owner
 * @param nonce - The nonce to check
 * @returns True if the nonce has been consumed, false otherwise
 *
 * @example
 * ```typescript
 * const used = await isNonceUsed(publicClient, userAddress, nonce);
 * if (used) {
 *   console.log("Nonce already consumed, generate a new one");
 * }
 * ```
 */
export async function isNonceUsed(
  client: PublicClient,
  owner: Address,
  nonce: bigint
): Promise<boolean> {
  const wordPosition = nonce >> 8n;
  const bitPosition = nonce & 0xffn;

  const bitmap = await client.readContract({
    address: PERMIT2_ADDRESS,
    abi: permit2Abi,
    functionName: "nonceBitmap",
    args: [owner, wordPosition],
  });

  return (bitmap & (1n << bitPosition)) !== 0n;
}
