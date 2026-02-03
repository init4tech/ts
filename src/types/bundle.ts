/**
 * Bundle types for Signet SDK.
 *
 * These types mirror the Rust signet-bundle crate types for JSON-RPC
 * communication with signet_sendBundle and signet_callBundle endpoints.
 */
import type { Address, Hex } from "viem";

/**
 * Bundle of transactions for `signet_sendBundle`.
 *
 * The Signet bundle extends the standard Flashbots eth_sendBundle with:
 * - Host transactions to be included in the host bundle.
 *
 * @see https://docs.flashbots.net/flashbots-auction/advanced/rpc-endpoint
 */
export interface SignetEthBundle {
  /** Raw EIP-2718 encoded transactions to include in the bundle. */
  readonly txs: readonly Hex[];

  /** Target block number for this bundle. */
  readonly blockNumber: bigint;

  /** Minimum timestamp for bundle inclusion. */
  readonly minTimestamp?: number;

  /** Maximum timestamp for bundle inclusion. */
  readonly maxTimestamp?: number;

  /** Transaction hashes that are allowed to revert without failing the bundle. */
  readonly revertingTxHashes?: readonly Hex[];

  /** UUID for bundle replacement. */
  readonly replacementUuid?: string;

  /** Transaction hashes to drop from a previous bundle (for replacement). */
  readonly droppingTxHashes?: readonly Hex[];

  /** Percentage of MEV profit to refund (0-100). */
  readonly refundPercent?: number;

  /** Address to receive MEV profit refund. */
  readonly refundRecipient?: Address;

  /** Transaction hashes to include in refund calculation. */
  readonly refundTxHashes?: readonly Hex[];

  /** Host transactions to be included in the host bundle (Signet-specific). */
  readonly hostTxs?: readonly Hex[];
}

/**
 * State block number can be a specific block number or a tag.
 */
export type BlockNumberOrTag = bigint | "latest" | "pending" | "earliest";

/**
 * Bundle of transactions for `signet_callBundle`.
 *
 * Used to simulate a bundle without submitting it.
 *
 * @see https://docs.flashbots.net/flashbots-auction/advanced/rpc-endpoint
 */
export interface SignetCallBundle {
  /** Raw EIP-2718 encoded transactions to simulate. */
  readonly txs: readonly Hex[];

  /** Block number for simulation context. */
  readonly blockNumber: bigint;

  /** State block number to fork from. */
  readonly stateBlockNumber: BlockNumberOrTag;

  /** Timestamp override for simulation. */
  readonly timestamp?: bigint;

  /** Gas limit override for simulation. */
  readonly gasLimit?: bigint;

  /** Difficulty override for simulation (PoW legacy). */
  readonly difficulty?: bigint;

  /** Base fee override for simulation. */
  readonly baseFee?: bigint;

  /** Transaction index to start execution from. */
  readonly transactionIndex?: number;

  /** Coinbase address override for simulation. */
  readonly coinbase?: Address;

  /** Timeout in seconds for simulation. */
  readonly timeout?: number;
}

/**
 * Result for a single transaction in a bundle simulation.
 */
export interface CallBundleTransactionResult {
  /** Coinbase balance difference after this transaction. */
  readonly coinbaseDiff: bigint;

  /** ETH explicitly sent to coinbase (tips). */
  readonly ethSentToCoinbase: bigint;

  /** Address that sent this transaction. */
  readonly fromAddress: Address;

  /** Total gas fees paid. */
  readonly gasFees: bigint;

  /** Effective gas price for this transaction. */
  readonly gasPrice: bigint;

  /** Gas used by this transaction. */
  readonly gasUsed: number;

  /** Destination address (null for contract creation). */
  readonly toAddress?: Address;

  /** Transaction hash. */
  readonly txHash: Hex;

  /** Return data if transaction succeeded. */
  readonly value?: Hex;

  /** Revert reason if transaction failed. */
  readonly revert?: Hex;
}

/**
 * Aggregated order inputs and outputs.
 *
 * For orders, the keys are:
 * - outputs: Map of (chainId, token) -> (recipient -> amount)
 * - inputs: Map of token -> amount
 */
export interface AggregateOrders {
  /** Outputs by (chainId, token) -> (recipient -> amount). */
  readonly outputs: Record<string, Record<Address, string>>;

  /** Inputs by token -> amount. */
  readonly inputs: Record<Address, string>;
}

/**
 * Aggregated fills.
 *
 * The fills map is keyed by (chainId, token) -> (recipient -> amount).
 */
export interface AggregateFills {
  /** Fills by (chainId, token) -> (recipient -> amount). */
  readonly fills: Record<string, Record<Address, string>>;
}

/**
 * Response for `signet_callBundle`.
 *
 * Contains simulation results plus Signet-specific order and fill aggregation.
 */
export interface SignetCallBundleResponse {
  /** Hash of the bundle (keccak256 of concatenated tx hashes). */
  readonly bundleHash: Hex;

  /** Average gas price across all transactions. */
  readonly bundleGasPrice: bigint;

  /** Total coinbase balance difference. */
  readonly coinbaseDiff: bigint;

  /** Total ETH explicitly sent to coinbase. */
  readonly ethSentToCoinbase: bigint;

  /** Total gas fees paid by all transactions. */
  readonly gasFees: bigint;

  /** Per-transaction results. */
  readonly results: readonly CallBundleTransactionResult[];

  /** State block number used for simulation. */
  readonly stateBlockNumber: number;

  /** Total gas used by all transactions. */
  readonly totalGasUsed: number;

  /** Aggregate orders detected in the bundle (Signet-specific). */
  readonly orders: AggregateOrders;

  /** Aggregate fills detected in the bundle (Signet-specific). */
  readonly fills: AggregateFills;
}
