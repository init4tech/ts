/**
 * Bundle serialization utilities for JSON-RPC communication.
 *
 * Handles conversion between TypeScript types (with bigint) and JSON-RPC
 * wire format (with hex strings).
 */
import { fromHex, toHex } from "viem";
import type { Address, Hex } from "viem";
import type {
  AggregateFills,
  AggregateOrders,
  BlockNumberOrTag,
  CallBundleTransactionResult,
  SignetCallBundle,
  SignetCallBundleResponse,
  SignetEthBundle,
} from "./bundle.js";

/**
 * Serialized SignetEthBundle for JSON-RPC transmission.
 */
export interface SerializedSignetEthBundle {
  txs: Hex[];
  blockNumber: Hex;
  minTimestamp?: number;
  maxTimestamp?: number;
  revertingTxHashes?: Hex[];
  replacementUuid?: string;
  droppingTxHashes?: Hex[];
  refundPercent?: number;
  refundRecipient?: Address;
  refundTxHashes?: Hex[];
  hostTxs?: Hex[];
}

/**
 * Serialized SignetCallBundle for JSON-RPC transmission.
 */
export interface SerializedSignetCallBundle {
  txs: Hex[];
  blockNumber: Hex;
  stateBlockNumber: Hex | "latest" | "pending" | "earliest";
  timestamp?: Hex;
  gasLimit?: Hex;
  difficulty?: Hex;
  baseFee?: Hex;
  transactionIndex?: Hex;
  coinbase?: Address;
  timeout?: Hex;
}

/**
 * Serialized CallBundleTransactionResult from JSON-RPC response.
 */
export interface SerializedCallBundleTransactionResult {
  coinbaseDiff: string;
  ethSentToCoinbase: string;
  fromAddress: Address;
  gasFees: string;
  gasPrice: string;
  gasUsed: number;
  toAddress?: Address;
  txHash: Hex;
  value?: Hex;
  revert?: Hex;
}

/**
 * Serialized SignetCallBundleResponse from JSON-RPC response.
 */
export interface SerializedSignetCallBundleResponse {
  bundleHash: Hex;
  bundleGasPrice: string;
  coinbaseDiff: string;
  ethSentToCoinbase: string;
  gasFees: string;
  results: SerializedCallBundleTransactionResult[];
  stateBlockNumber: number;
  totalGasUsed: number;
  orders: AggregateOrders;
  fills: AggregateFills;
}

/**
 * Serialize a SignetEthBundle for JSON-RPC transmission.
 *
 * Converts bigint fields to hex strings and omits empty arrays per
 * Rust serde behavior.
 */
export function serializeEthBundle(
  bundle: SignetEthBundle
): SerializedSignetEthBundle {
  const result: SerializedSignetEthBundle = {
    txs: [...bundle.txs],
    blockNumber: toHex(bundle.blockNumber),
  };

  if (bundle.minTimestamp !== undefined) {
    result.minTimestamp = bundle.minTimestamp;
  }
  if (bundle.maxTimestamp !== undefined) {
    result.maxTimestamp = bundle.maxTimestamp;
  }
  if (bundle.revertingTxHashes && bundle.revertingTxHashes.length > 0) {
    result.revertingTxHashes = [...bundle.revertingTxHashes];
  }
  if (bundle.replacementUuid !== undefined) {
    result.replacementUuid = bundle.replacementUuid;
  }
  if (bundle.droppingTxHashes && bundle.droppingTxHashes.length > 0) {
    result.droppingTxHashes = [...bundle.droppingTxHashes];
  }
  if (bundle.refundPercent !== undefined) {
    result.refundPercent = bundle.refundPercent;
  }
  if (bundle.refundRecipient !== undefined) {
    result.refundRecipient = bundle.refundRecipient;
  }
  if (bundle.refundTxHashes && bundle.refundTxHashes.length > 0) {
    result.refundTxHashes = [...bundle.refundTxHashes];
  }
  if (bundle.hostTxs && bundle.hostTxs.length > 0) {
    result.hostTxs = [...bundle.hostTxs];
  }

  return result;
}

/**
 * Deserialize a SignetEthBundle from JSON-RPC format.
 */
export function deserializeEthBundle(
  raw: SerializedSignetEthBundle
): SignetEthBundle {
  const result: SignetEthBundle = {
    txs: raw.txs,
    blockNumber: fromHex(raw.blockNumber, "bigint"),
  };

  if (raw.minTimestamp !== undefined) {
    (result as { minTimestamp?: number }).minTimestamp = raw.minTimestamp;
  }
  if (raw.maxTimestamp !== undefined) {
    (result as { maxTimestamp?: number }).maxTimestamp = raw.maxTimestamp;
  }
  if (raw.revertingTxHashes && raw.revertingTxHashes.length > 0) {
    (result as { revertingTxHashes?: Hex[] }).revertingTxHashes =
      raw.revertingTxHashes;
  }
  if (raw.replacementUuid !== undefined) {
    (result as { replacementUuid?: string }).replacementUuid =
      raw.replacementUuid;
  }
  if (raw.droppingTxHashes && raw.droppingTxHashes.length > 0) {
    (result as { droppingTxHashes?: Hex[] }).droppingTxHashes =
      raw.droppingTxHashes;
  }
  if (raw.refundPercent !== undefined) {
    (result as { refundPercent?: number }).refundPercent = raw.refundPercent;
  }
  if (raw.refundRecipient !== undefined) {
    (result as { refundRecipient?: Address }).refundRecipient =
      raw.refundRecipient;
  }
  if (raw.refundTxHashes && raw.refundTxHashes.length > 0) {
    (result as { refundTxHashes?: Hex[] }).refundTxHashes = raw.refundTxHashes;
  }
  if (raw.hostTxs && raw.hostTxs.length > 0) {
    (result as { hostTxs?: Hex[] }).hostTxs = raw.hostTxs;
  }

  return result;
}

function serializeStateBlockNumber(
  value: BlockNumberOrTag
): Hex | "latest" | "pending" | "earliest" {
  if (typeof value === "bigint") {
    return toHex(value);
  }
  return value;
}

function deserializeStateBlockNumber(
  value: Hex | "latest" | "pending" | "earliest"
): BlockNumberOrTag {
  if (value === "latest" || value === "pending" || value === "earliest") {
    return value;
  }
  return fromHex(value, "bigint");
}

/**
 * Serialize a SignetCallBundle for JSON-RPC transmission.
 */
export function serializeCallBundle(
  bundle: SignetCallBundle
): SerializedSignetCallBundle {
  const result: SerializedSignetCallBundle = {
    txs: [...bundle.txs],
    blockNumber: toHex(bundle.blockNumber),
    stateBlockNumber: serializeStateBlockNumber(bundle.stateBlockNumber),
  };

  if (bundle.timestamp !== undefined) {
    result.timestamp = toHex(bundle.timestamp);
  }
  if (bundle.gasLimit !== undefined) {
    result.gasLimit = toHex(bundle.gasLimit);
  }
  if (bundle.difficulty !== undefined) {
    result.difficulty = toHex(bundle.difficulty);
  }
  if (bundle.baseFee !== undefined) {
    result.baseFee = toHex(bundle.baseFee);
  }
  if (bundle.transactionIndex !== undefined) {
    result.transactionIndex = toHex(bundle.transactionIndex);
  }
  if (bundle.coinbase !== undefined) {
    result.coinbase = bundle.coinbase;
  }
  if (bundle.timeout !== undefined) {
    result.timeout = toHex(bundle.timeout);
  }

  return result;
}

/**
 * Deserialize a SignetCallBundle from JSON-RPC format.
 */
export function deserializeCallBundle(
  raw: SerializedSignetCallBundle
): SignetCallBundle {
  const result: SignetCallBundle = {
    txs: raw.txs,
    blockNumber: fromHex(raw.blockNumber, "bigint"),
    stateBlockNumber: deserializeStateBlockNumber(raw.stateBlockNumber),
  };

  if (raw.timestamp !== undefined) {
    (result as { timestamp?: bigint }).timestamp = fromHex(
      raw.timestamp,
      "bigint"
    );
  }
  if (raw.gasLimit !== undefined) {
    (result as { gasLimit?: bigint }).gasLimit = fromHex(
      raw.gasLimit,
      "bigint"
    );
  }
  if (raw.difficulty !== undefined) {
    (result as { difficulty?: bigint }).difficulty = fromHex(
      raw.difficulty,
      "bigint"
    );
  }
  if (raw.baseFee !== undefined) {
    (result as { baseFee?: bigint }).baseFee = fromHex(raw.baseFee, "bigint");
  }
  if (raw.transactionIndex !== undefined) {
    (result as { transactionIndex?: number }).transactionIndex = fromHex(
      raw.transactionIndex,
      "number"
    );
  }
  if (raw.coinbase !== undefined) {
    (result as { coinbase?: Address }).coinbase = raw.coinbase;
  }
  if (raw.timeout !== undefined) {
    (result as { timeout?: number }).timeout = fromHex(raw.timeout, "number");
  }

  return result;
}

/**
 * Deserialize a CallBundleTransactionResult from JSON-RPC format.
 */
export function deserializeTransactionResult(
  raw: SerializedCallBundleTransactionResult
): CallBundleTransactionResult {
  const result: CallBundleTransactionResult = {
    coinbaseDiff: BigInt(raw.coinbaseDiff),
    ethSentToCoinbase: BigInt(raw.ethSentToCoinbase),
    fromAddress: raw.fromAddress,
    gasFees: BigInt(raw.gasFees),
    gasPrice: BigInt(raw.gasPrice),
    gasUsed: raw.gasUsed,
    txHash: raw.txHash,
  };

  if (raw.toAddress !== undefined) {
    (result as { toAddress?: Address }).toAddress = raw.toAddress;
  }
  if (raw.value !== undefined) {
    (result as { value?: Hex }).value = raw.value;
  }
  if (raw.revert !== undefined) {
    (result as { revert?: Hex }).revert = raw.revert;
  }

  return result;
}

/**
 * Deserialize a SignetCallBundleResponse from JSON-RPC format.
 */
export function deserializeCallBundleResponse(
  raw: SerializedSignetCallBundleResponse
): SignetCallBundleResponse {
  return {
    bundleHash: raw.bundleHash,
    bundleGasPrice: BigInt(raw.bundleGasPrice),
    coinbaseDiff: BigInt(raw.coinbaseDiff),
    ethSentToCoinbase: BigInt(raw.ethSentToCoinbase),
    gasFees: BigInt(raw.gasFees),
    results: raw.results.map(deserializeTransactionResult),
    stateBlockNumber: raw.stateBlockNumber,
    totalGasUsed: raw.totalGasUsed,
    orders: raw.orders,
    fills: raw.fills,
  };
}
