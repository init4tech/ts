/**
 * Signing exports for Signet SDK.
 */
export { permit2Domain } from "./domain.js";

export {
  computeOrderHash,
  normalizeSignature,
  orderHash,
  orderHashPreImage,
} from "./hash.js";

export type { Eip712SigningParams } from "./eip712.js";

export {
  eip712Components,
  eip712SigningHash,
  permit2DomainSeparator,
  permitBatchWitnessStructHash,
} from "./eip712.js";

export { UnsignedOrder } from "./order.js";

export { UnsignedFill } from "./fill.js";

export { isNonceUsed, nonceFromSeed, randomNonce } from "./nonce.js";

export { getOutputWitness } from "./witness.js";

export { encodeFillPermit2, encodeInitiatePermit2 } from "./encode.js";

export { validateFill, validateOrder } from "./validate.js";

export type {
  FeasibilityIssue,
  FeasibilityIssueType,
  FeasibilityResult,
} from "./feasibility.js";

export { checkOrderFeasibility, hasPermit2Approval } from "./feasibility.js";

export { SignetCallBundleBuilder, SignetEthBundleBuilder } from "./bundle.js";
