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

export type { FilledEvent, OrderEvent, SweepEvent } from "./events.js";

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

export { serializeOrder, deserializeOrder } from "./serialization.js";

export type {
  AggregateFills,
  AggregateOrders,
  BlockNumberOrTag,
  CallBundleTransactionResult,
  SignetCallBundle,
  SignetCallBundleResponse,
  SignetEthBundle,
} from "./bundle.js";

export type {
  SerializedCallBundleTransactionResult,
  SerializedSignetCallBundle,
  SerializedSignetCallBundleResponse,
  SerializedSignetEthBundle,
} from "./bundleSerialization.js";

export {
  deserializeCallBundle,
  deserializeCallBundleResponse,
  deserializeEthBundle,
  deserializeTransactionResult,
  serializeCallBundle,
  serializeEthBundle,
} from "./bundleSerialization.js";
