/**
 * EIP-712 signing hash computation.
 *
 * EIP-712 signing hash = keccak256("\x19\x01" + domainSeparator + structHash)
 */
import {
  type Address,
  type Hex,
  concat,
  encodeAbiParameters,
  keccak256,
} from "viem";
import { PERMIT2_ADDRESS, PERMIT2_NAME } from "../constants/permit2.js";
import type { Output, TokenPermissions } from "../types/primitives.js";

/**
 * Parameters for computing EIP-712 signing hash.
 */
export interface Eip712SigningParams {
  /** Chain ID for the domain */
  chainId: bigint;
  /** Order contract address (spender in Permit2) */
  orderContract: Address;
  /** Token permissions */
  permitted: readonly TokenPermissions[];
  /** Permit2 nonce */
  nonce: bigint;
  /** Deadline timestamp */
  deadline: bigint;
  /** Order outputs (witness data) */
  outputs: readonly Output[];
}

/**
 * EIP-712 domain type hash.
 * keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)")
 */
const EIP712_DOMAIN_TYPE_HASH = keccak256(
  new TextEncoder().encode(
    "EIP712Domain(string name,uint256 chainId,address verifyingContract)"
  )
);

/**
 * Compute the Permit2 domain separator for a given chain.
 *
 * domainSeparator = keccak256(encode(
 *   EIP712_DOMAIN_TYPE_HASH,
 *   keccak256(name),
 *   chainId,
 *   verifyingContract
 * ))
 *
 * @param chainId - The chain ID
 * @returns The 32-byte domain separator
 */
export function permit2DomainSeparator(chainId: bigint): Hex {
  const nameHash = keccak256(new TextEncoder().encode(PERMIT2_NAME));

  const encoded = encodeAbiParameters(
    [
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "uint256" },
      { type: "address" },
    ],
    [EIP712_DOMAIN_TYPE_HASH, nameHash, chainId, PERMIT2_ADDRESS]
  );

  return keccak256(encoded);
}

/**
 * PermitBatchWitnessTransferFrom type hash.
 * This is the type hash for the full message including witness data.
 */
const PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPE_HASH = keccak256(
  new TextEncoder().encode(
    "PermitBatchWitnessTransferFrom(TokenPermissions[] permitted,address spender,uint256 nonce,uint256 deadline,Output[] outputs)Output(address token,uint256 amount,address recipient,uint32 chainId)TokenPermissions(address token,uint256 amount)"
  )
);

/**
 * TokenPermissions type hash.
 */
const TOKEN_PERMISSIONS_TYPE_HASH = keccak256(
  new TextEncoder().encode("TokenPermissions(address token,uint256 amount)")
);

/**
 * Output type hash.
 */
const OUTPUT_TYPE_HASH = keccak256(
  new TextEncoder().encode(
    "Output(address token,uint256 amount,address recipient,uint32 chainId)"
  )
);

/**
 * Hash a single TokenPermissions struct.
 */
function hashTokenPermissions(perm: TokenPermissions): Hex {
  const encoded = encodeAbiParameters(
    [{ type: "bytes32" }, { type: "address" }, { type: "uint256" }],
    [TOKEN_PERMISSIONS_TYPE_HASH, perm.token, perm.amount]
  );
  return keccak256(encoded);
}

/**
 * Hash an array of TokenPermissions.
 */
function hashTokenPermissionsArray(perms: readonly TokenPermissions[]): Hex {
  const hashes = perms.map(hashTokenPermissions);
  return keccak256(concat(hashes));
}

/**
 * Hash a single Output struct.
 */
function hashOutput(output: Output): Hex {
  const encoded = encodeAbiParameters(
    [
      { type: "bytes32" },
      { type: "address" },
      { type: "uint256" },
      { type: "address" },
      { type: "uint32" },
    ],
    [
      OUTPUT_TYPE_HASH,
      output.token,
      output.amount,
      output.recipient,
      output.chainId,
    ]
  );
  return keccak256(encoded);
}

/**
 * Hash an array of Outputs.
 */
function hashOutputArray(outputs: readonly Output[]): Hex {
  const hashes = outputs.map(hashOutput);
  return keccak256(concat(hashes));
}

/**
 * Compute the struct hash for PermitBatchWitnessTransferFrom.
 *
 * structHash = keccak256(encode(
 *   TYPE_HASH,
 *   hashArray(permitted),
 *   spender,
 *   nonce,
 *   deadline,
 *   hashArray(outputs)
 * ))
 *
 * @param params - The signing parameters
 * @returns The 32-byte struct hash
 */
export function permitBatchWitnessStructHash(params: Eip712SigningParams): Hex {
  const permittedHash = hashTokenPermissionsArray(params.permitted);
  const outputsHash = hashOutputArray(params.outputs);

  const encoded = encodeAbiParameters(
    [
      { type: "bytes32" }, // type hash
      { type: "bytes32" }, // permitted array hash
      { type: "address" }, // spender
      { type: "uint256" }, // nonce
      { type: "uint256" }, // deadline
      { type: "bytes32" }, // outputs array hash
    ],
    [
      PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPE_HASH,
      permittedHash,
      params.orderContract,
      params.nonce,
      params.deadline,
      outputsHash,
    ]
  );

  return keccak256(encoded);
}

/**
 * Compute the EIP-712 signing hash.
 *
 * signingHash = keccak256("\x19\x01" + domainSeparator + structHash)
 *
 * @param params - The signing parameters
 * @returns The 32-byte signing hash that gets signed
 */
export function eip712SigningHash(params: Eip712SigningParams): Hex {
  const domainSeparator = permit2DomainSeparator(params.chainId);
  const structHash = permitBatchWitnessStructHash(params);

  // EIP-712: "\x19\x01" + domainSeparator + structHash
  const preImage = concat(["0x1901" as Hex, domainSeparator, structHash]);

  return keccak256(preImage);
}

/**
 * Compute all EIP-712 components for debugging/verification.
 *
 * @param params - The signing parameters
 * @returns Object with domain separator, struct hash, and signing hash
 */
export function eip712Components(params: Eip712SigningParams): {
  domainSeparator: Hex;
  structHash: Hex;
  signingHash: Hex;
} {
  const domainSeparator = permit2DomainSeparator(params.chainId);
  const structHash = permitBatchWitnessStructHash(params);
  const signingHash = eip712SigningHash(params);

  return {
    domainSeparator,
    structHash,
    signingHash,
  };
}
