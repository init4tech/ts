/**
 * Signet SDK - TypeScript SDK for Signet Orders
 *
 * This SDK provides functionality to create, sign, and verify Signet orders
 * that are compatible with the Rust signet-types crate.
 *
 * ## Prerequisites
 *
 * Before creating orders, you must approve your tokens for use with Permit2.
 * This is a one-time on-chain approval per token:
 *
 * ```typescript
 * import { PERMIT2_ADDRESS } from "@signet-sh/sdk";
 * import { erc20Abi, maxUint256 } from "viem";
 *
 * await client.writeContract({
 *   address: tokenAddress,
 *   abi: erc20Abi,
 *   functionName: "approve",
 *   args: [PERMIT2_ADDRESS, maxUint256],
 * });
 * ```
 *
 * ## Order Signing Flow
 *
 * 1. Approve token → Permit2 (on-chain, once per token)
 * 2. Build order using `UnsignedOrder` builder
 * 3. Sign with wallet (off-chain EIP-712 signature via Permit2)
 * 4. Submit signed order to tx-cache or on-chain
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
  AggregateFills,
  AggregateOrders,
  B256,
  BlockNumberOrTag,
  Bytes,
  CallBundleTransactionResult,
  ChainConfig,
  Hex,
  Input,
  Output,
  Permit2Batch,
  PermitBatchTransferFrom,
  SerializedCallBundleTransactionResult,
  SerializedSignedOrder,
  SerializedSignetCallBundle,
  SerializedSignetCallBundleResponse,
  SerializedSignetEthBundle,
  SignedFill,
  SignedOrder,
  SignetCallBundle,
  SignetCallBundleResponse,
  SignetEthBundle,
  TokenPermissions,
  UnsignedOrderParams,
} from "./types/index.js";

export {
  deserializeCallBundle,
  deserializeCallBundleResponse,
  deserializeEthBundle,
  deserializeOrder,
  deserializeTransactionResult,
  OUTPUT_WITNESS_TYPE_STRING,
  PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPES,
  serializeCallBundle,
  serializeEthBundle,
  serializeOrder,
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
export type {
  Eip712SigningParams,
  FeasibilityIssue,
  FeasibilityIssueType,
  FeasibilityResult,
} from "./signing/index.js";

export {
  checkOrderFeasibility,
  computeOrderHash,
  eip712Components,
  eip712SigningHash,
  encodeFillPermit2,
  encodeInitiatePermit2,
  getOutputWitness,
  hasPermit2Approval,
  isNonceUsed,
  nonceFromSeed,
  normalizeSignature,
  orderHash,
  orderHashPreImage,
  permit2Domain,
  permit2DomainSeparator,
  permitBatchWitnessStructHash,
  randomNonce,
  SignetCallBundleBuilder,
  SignetEthBundleBuilder,
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
  permit2Abi,
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

// Client
export type { TxCacheClient } from "./client/index.js";

export { createTxCacheClient } from "./client/index.js";
