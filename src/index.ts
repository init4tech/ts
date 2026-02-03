/**
 * Signet SDK - TypeScript SDK for Signet Orders
 *
 * This SDK provides functionality to create, sign, and verify Signet orders
 * that are compatible with the Rust signet-types crate.
 *
 * @example
 * ```typescript
 * import { UnsignedOrder, orderHash, MAINNET } from "@signet-sh/sdk";
 *
 * // Build and sign an order
 * const order = await UnsignedOrder.new()
 *   .withInput(tokenAddress, amount)
 *   .withOutput(outputToken, outputAmount, recipient, chainId)
 *   .withDeadline(deadline)
 *   .withChain({
 *     chainId: MAINNET.rollupChainId,
 *     orderContract: MAINNET.rollupOrders,
 *   })
 *   .sign(walletClient);
 *
 * // Compute the order hash
 * const hash = orderHash(order);
 * ```
 */

// Types
export type {
  Address,
  B256,
  Bytes,
  ChainConfig,
  Hex,
  Input,
  Output,
  Permit2Batch,
  PermitBatchTransferFrom,
  SerializedSignedOrder,
  SignedFill,
  SignedOrder,
  TokenPermissions,
  UnsignedOrderParams,
} from "./types/index.js";

export {
  OUTPUT_WITNESS_TYPE_STRING,
  PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPES,
  serializeOrder,
  deserializeOrder,
} from "./types/index.js";

// Constants
export type { SignetSystemConstants } from "./constants/index.js";

export {
  getOrdersContract,
  MAINNET,
  PARMIGIANA,
  PERMIT2_ADDRESS,
  PERMIT2_NAME,
  parmigianaHost,
  parmigianaRollup,
  signetRollup,
} from "./constants/index.js";

// Signing
export type { Eip712SigningParams } from "./signing/index.js";

export {
  computeOrderHash,
  eip712Components,
  eip712SigningHash,
  encodeFillPermit2,
  encodeInitiatePermit2,
  getOutputWitness,
  normalizeSignature,
  orderHash,
  orderHashPreImage,
  permit2Domain,
  permit2DomainSeparator,
  permitBatchWitnessStructHash,
  randomNonce,
  UnsignedFill,
  UnsignedOrder,
  validateFill,
  validateOrder,
} from "./signing/index.js";

// ABI
export {
  bundleHelperAbi,
  hostOrdersAbi,
  passageAbi,
  rollupOrdersAbi,
  rollupPassageAbi,
  transactorAbi,
  wethAbi,
  zenithAbi,
} from "./abi/index.js";

// Tokens
export type { TokenMeta, TokenSymbol } from "./tokens/index.js";

export {
  getAvailableTokens,
  getTokenAddress,
  mapTokenCrossChain,
  needsWethWrap,
  resolveTokenSymbol,
  TOKENS,
} from "./tokens/index.js";
