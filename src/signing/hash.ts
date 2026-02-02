/**
 * Order hash computation matching the Rust implementation.
 */
import { type Hex, concat, encodeAbiParameters, keccak256 } from "viem";
import type { B256, Output, Permit2Batch } from "../types/primitives.js";
import {
  toOutputObjectArray,
  toTokenPermissionsArray,
} from "../types/conversions.js";
import type { SignedOrder } from "../types/order.js";

/**
 * ABI type for encoding PermitBatchTransferFrom as a struct.
 * Matches Rust's SolValue::abi_encode() for the struct.
 */
const PERMIT_BATCH_TRANSFER_FROM_ABI = [
  {
    type: "tuple",
    components: [
      {
        type: "tuple[]",
        name: "permitted",
        components: [
          { type: "address", name: "token" },
          { type: "uint256", name: "amount" },
        ],
      },
      { type: "uint256", name: "nonce" },
      { type: "uint256", name: "deadline" },
    ],
  },
] as const;

/**
 * ABI type for encoding an address.
 */
const ADDRESS_ABI = [{ type: "address" }] as const;

/**
 * ABI type for encoding Output[].
 */
const OUTPUTS_ABI = [
  {
    type: "tuple[]",
    components: [
      { type: "address", name: "token" },
      { type: "uint256", name: "amount" },
      { type: "address", name: "recipient" },
      { type: "uint32", name: "chainId" },
    ],
  },
] as const;

/**
 * secp256k1 curve order.
 */
const SECP256K1_N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

/**
 * Half of the secp256k1 curve order (for signature normalization).
 */
const SECP256K1_HALF_N = SECP256K1_N / 2n;

/**
 * Parse a 65-byte signature into r, s, v components.
 */
function parseRawSignature(signature: Hex): {
  r: bigint;
  s: bigint;
  v: number;
} {
  // Remove 0x prefix
  const hex = signature.slice(2);

  // Signature format: r (32 bytes) + s (32 bytes) + v (1 byte)
  const r = BigInt("0x" + hex.slice(0, 64));
  const s = BigInt("0x" + hex.slice(64, 128));
  const v = parseInt(hex.slice(128, 130), 16);

  return { r, s, v };
}

/**
 * Serialize r, s, v back to a 65-byte signature hex.
 */
function serializeRawSignature(r: bigint, s: bigint, v: number): Hex {
  const rHex = r.toString(16).padStart(64, "0");
  const sHex = s.toString(16).padStart(64, "0");
  const vHex = v.toString(16).padStart(2, "0");
  return `0x${rHex}${sHex}${vHex}` as Hex;
}

/**
 * Normalizes an ECDSA signature's S-value to the lower half of the curve.
 * This matches the Rust behavior of `Signature::normalized_s()`.
 *
 * For a valid signature, s must be in [1, n-1].
 * For normalized signatures, s must be in [1, n/2].
 * If s > n/2, we replace s with n - s and flip v.
 *
 * @param signature - The signature bytes (65 bytes: r[32] + s[32] + v[1])
 * @returns Normalized signature bytes (65 bytes)
 */
export function normalizeSignature(signature: Hex): Hex {
  const { r, s, v } = parseRawSignature(signature);

  // If s > halfN, flip it
  if (s > SECP256K1_HALF_N) {
    const normalizedS = SECP256K1_N - s;
    // When s is flipped, v needs to be flipped too (27<->28)
    const normalizedV = v === 27 ? 28 : 27;
    return serializeRawSignature(r, normalizedS, normalizedV);
  }

  return signature;
}

/**
 * Compute the order hash pre-image.
 *
 * The pre-image consists of 4 concatenated keccak256 hashes (128 bytes total):
 * 1. keccak256(abiEncode(permit.permit)) - struct encoding
 * 2. keccak256(abiEncode(permit.owner)) - address encoding
 * 3. keccak256(abiEncode(outputs)) - array encoding
 * 4. keccak256(normalizedSignature) - raw 65 bytes (no ABI encoding!)
 *
 * @param order - The signed order
 * @returns The 128-byte pre-image as hex
 */
export function orderHashPreImage(order: SignedOrder): Hex {
  // 1. Hash the permit (PermitBatchTransferFrom struct)
  // This uses tuple encoding matching Rust's SolValue::abi_encode()
  const permitEncoded = encodeAbiParameters(PERMIT_BATCH_TRANSFER_FROM_ABI, [
    {
      permitted: toTokenPermissionsArray(order.permit.permit.permitted),
      nonce: order.permit.permit.nonce,
      deadline: order.permit.permit.deadline,
    },
  ]);
  const permitHash = keccak256(permitEncoded);

  // 2. Hash the owner
  const ownerEncoded = encodeAbiParameters(ADDRESS_ABI, [order.permit.owner]);
  const ownerHash = keccak256(ownerEncoded);

  // 3. Hash the outputs
  const outputsEncoded = encodeAbiParameters(OUTPUTS_ABI, [
    toOutputObjectArray(order.outputs),
  ]);
  const outputsHash = keccak256(outputsEncoded);

  // 4. Hash the normalized signature (raw bytes, NOT ABI encoded!)
  // Rust uses signature.as_bytes() which returns raw 65 bytes
  const normalizedSig = normalizeSignature(order.permit.signature);
  const sigHash = keccak256(normalizedSig);

  return concat([permitHash, ownerHash, outputsHash, sigHash]);
}

/**
 * Compute the order hash.
 *
 * The order hash uniquely identifies a signed order. It's computed as:
 * keccak256(orderHashPreImage)
 *
 * @param order - The signed order
 * @returns The 32-byte order hash
 */
export function orderHash(order: SignedOrder): B256 {
  return keccak256(orderHashPreImage(order));
}

/**
 * Compute the order hash from individual components.
 * This is useful when you don't have a fully formed SignedOrder.
 *
 * @param permit - The Permit2Batch
 * @param outputs - The order outputs
 * @returns The 32-byte order hash
 */
export function computeOrderHash(
  permit: Permit2Batch,
  outputs: readonly Output[]
): B256 {
  return orderHash({ permit, outputs });
}
