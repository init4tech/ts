/**
 * Type exports for Signet SDK.
 */
export type {
  Address,
  B256,
  Bytes,
  Hex,
  Input,
  Output,
  Permit2Batch,
  PermitBatchTransferFrom,
  TokenPermissions,
} from "./primitives.js";

export type {
  ChainConfig,
  SerializedSignedOrder,
  SignedOrder,
  UnsignedOrderParams,
} from "./order.js";

export type { SignedFill } from "./fill.js";

export {
  OUTPUT_WITNESS_TYPE_STRING,
  PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPES,
} from "./permit2.js";

export type { OutputObject, TokenPermissionsObject } from "./conversions.js";
export {
  toOutputObject,
  toOutputObjectArray,
  toTokenPermissions,
  toTokenPermissionsArray,
} from "./conversions.js";
