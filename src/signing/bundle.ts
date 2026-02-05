/**
 * Bundle builders for Signet SDK.
 *
 * Provides fluent builder APIs for constructing SignetEthBundle and
 * SignetCallBundle instances.
 */
import type { Address, Hex } from "viem";
import type {
  BlockNumberOrTag,
  SignetCallBundle,
  SignetEthBundle,
} from "../types/bundle.js";

/**
 * Builder for constructing SignetEthBundle instances.
 *
 * @example
 * ```typescript
 * const bundle = SignetEthBundleBuilder.new()
 *   .withTx("0x02f8...")
 *   .withBlockNumber(12345678n)
 *   .withMinTimestamp(1700000000)
 *   .build();
 * ```
 */
export class SignetEthBundleBuilder {
  private txs: Hex[] = [];
  private blockNumber?: bigint;
  private minTimestamp?: number;
  private maxTimestamp?: number;
  private revertingTxHashes: Hex[] = [];
  private replacementUuid?: string;
  private droppingTxHashes: Hex[] = [];
  private refundPercent?: number;
  private refundRecipient?: Address;
  private refundTxHashes: Hex[] = [];
  private hostTxs: Hex[] = [];

  private constructor() {}

  /**
   * Create a new SignetEthBundleBuilder.
   */
  static new(): SignetEthBundleBuilder {
    return new SignetEthBundleBuilder();
  }

  /**
   * Add a single transaction to the bundle.
   */
  withTx(tx: Hex): this {
    this.txs.push(tx);
    return this;
  }

  /**
   * Add multiple transactions to the bundle.
   */
  withTxs(txs: readonly Hex[]): this {
    this.txs.push(...txs);
    return this;
  }

  /**
   * Add a single host transaction to the bundle.
   */
  withHostTx(tx: Hex): this {
    this.hostTxs.push(tx);
    return this;
  }

  /**
   * Add multiple host transactions to the bundle.
   */
  withHostTxs(txs: readonly Hex[]): this {
    this.hostTxs.push(...txs);
    return this;
  }

  /**
   * Set the target block number for this bundle.
   */
  withBlockNumber(blockNumber: bigint): this {
    this.blockNumber = blockNumber;
    return this;
  }

  /**
   * Set the minimum timestamp for bundle inclusion.
   */
  withMinTimestamp(timestamp: number): this {
    this.minTimestamp = timestamp;
    return this;
  }

  /**
   * Set the maximum timestamp for bundle inclusion.
   */
  withMaxTimestamp(timestamp: number): this {
    this.maxTimestamp = timestamp;
    return this;
  }

  /**
   * Add a transaction hash that is allowed to revert.
   */
  withRevertingTxHash(hash: Hex): this {
    this.revertingTxHashes.push(hash);
    return this;
  }

  /**
   * Add multiple transaction hashes that are allowed to revert.
   */
  withRevertingTxHashes(hashes: readonly Hex[]): this {
    this.revertingTxHashes.push(...hashes);
    return this;
  }

  /**
   * Set the replacement UUID for bundle replacement.
   */
  withReplacementUuid(uuid: string): this {
    this.replacementUuid = uuid;
    return this;
  }

  /**
   * Add a transaction hash to drop from a previous bundle.
   */
  withDroppingTxHash(hash: Hex): this {
    this.droppingTxHashes.push(hash);
    return this;
  }

  /**
   * Add multiple transaction hashes to drop from a previous bundle.
   */
  withDroppingTxHashes(hashes: readonly Hex[]): this {
    this.droppingTxHashes.push(...hashes);
    return this;
  }

  /**
   * Set the refund percentage (0-100).
   */
  withRefundPercent(percent: number): this {
    this.refundPercent = percent;
    return this;
  }

  /**
   * Set the refund recipient address.
   */
  withRefundRecipient(recipient: Address): this {
    this.refundRecipient = recipient;
    return this;
  }

  /**
   * Add a transaction hash to include in refund calculation.
   */
  withRefundTxHash(hash: Hex): this {
    this.refundTxHashes.push(hash);
    return this;
  }

  /**
   * Add multiple transaction hashes to include in refund calculation.
   */
  withRefundTxHashes(hashes: readonly Hex[]): this {
    this.refundTxHashes.push(...hashes);
    return this;
  }

  /**
   * Build the SignetEthBundle.
   *
   * @throws Error if blockNumber is not set
   * @throws Error if no transactions are provided
   */
  build(): SignetEthBundle {
    if (this.blockNumber === undefined) {
      throw new Error("SignetEthBundle requires a blockNumber");
    }
    if (this.txs.length === 0) {
      throw new Error("SignetEthBundle requires at least one transaction");
    }

    const bundle: SignetEthBundle = {
      txs: this.txs,
      blockNumber: this.blockNumber,
    };

    if (this.minTimestamp !== undefined) {
      (bundle as { minTimestamp?: number }).minTimestamp = this.minTimestamp;
    }
    if (this.maxTimestamp !== undefined) {
      (bundle as { maxTimestamp?: number }).maxTimestamp = this.maxTimestamp;
    }
    if (this.revertingTxHashes.length > 0) {
      (bundle as { revertingTxHashes?: Hex[] }).revertingTxHashes =
        this.revertingTxHashes;
    }
    if (this.replacementUuid !== undefined) {
      (bundle as { replacementUuid?: string }).replacementUuid =
        this.replacementUuid;
    }
    if (this.droppingTxHashes.length > 0) {
      (bundle as { droppingTxHashes?: Hex[] }).droppingTxHashes =
        this.droppingTxHashes;
    }
    if (this.refundPercent !== undefined) {
      (bundle as { refundPercent?: number }).refundPercent = this.refundPercent;
    }
    if (this.refundRecipient !== undefined) {
      (bundle as { refundRecipient?: Address }).refundRecipient =
        this.refundRecipient;
    }
    if (this.refundTxHashes.length > 0) {
      (bundle as { refundTxHashes?: Hex[] }).refundTxHashes =
        this.refundTxHashes;
    }
    if (this.hostTxs.length > 0) {
      (bundle as { hostTxs?: Hex[] }).hostTxs = this.hostTxs;
    }

    return bundle;
  }
}

/**
 * Builder for constructing SignetCallBundle instances.
 *
 * @example
 * ```typescript
 * const bundle = SignetCallBundleBuilder.new()
 *   .withTx("0x02f8...")
 *   .withBlockNumber(12345678n)
 *   .withStateBlockNumber(12345677n)
 *   .build();
 * ```
 */
export class SignetCallBundleBuilder {
  private txs: Hex[] = [];
  private blockNumber?: bigint;
  private stateBlockNumber?: BlockNumberOrTag;
  private timestamp?: bigint;
  private gasLimit?: bigint;
  private difficulty?: bigint;
  private baseFee?: bigint;
  private transactionIndex?: number;
  private coinbase?: Address;
  private timeout?: number;

  private constructor() {}

  /**
   * Create a new SignetCallBundleBuilder.
   */
  static new(): SignetCallBundleBuilder {
    return new SignetCallBundleBuilder();
  }

  /**
   * Add a single transaction to the bundle.
   */
  withTx(tx: Hex): this {
    this.txs.push(tx);
    return this;
  }

  /**
   * Add multiple transactions to the bundle.
   */
  withTxs(txs: readonly Hex[]): this {
    this.txs.push(...txs);
    return this;
  }

  /**
   * Set the target block number for simulation.
   */
  withBlockNumber(blockNumber: bigint): this {
    this.blockNumber = blockNumber;
    return this;
  }

  /**
   * Set the state block number to fork from.
   */
  withStateBlockNumber(stateBlockNumber: BlockNumberOrTag): this {
    this.stateBlockNumber = stateBlockNumber;
    return this;
  }

  /**
   * Set the timestamp override for simulation.
   */
  withTimestamp(timestamp: bigint): this {
    this.timestamp = timestamp;
    return this;
  }

  /**
   * Set the gas limit override for simulation.
   */
  withGasLimit(gasLimit: bigint): this {
    this.gasLimit = gasLimit;
    return this;
  }

  /**
   * Set the difficulty override for simulation (PoW legacy).
   */
  withDifficulty(difficulty: bigint): this {
    this.difficulty = difficulty;
    return this;
  }

  /**
   * Set the base fee override for simulation.
   */
  withBaseFee(baseFee: bigint): this {
    this.baseFee = baseFee;
    return this;
  }

  /**
   * Set the transaction index to start execution from.
   */
  withTransactionIndex(index: number): this {
    this.transactionIndex = index;
    return this;
  }

  /**
   * Set the coinbase address override for simulation.
   */
  withCoinbase(coinbase: Address): this {
    this.coinbase = coinbase;
    return this;
  }

  /**
   * Set the timeout in seconds for simulation.
   */
  withTimeout(timeout: number): this {
    this.timeout = timeout;
    return this;
  }

  /**
   * Build the SignetCallBundle.
   *
   * @throws Error if blockNumber is not set
   * @throws Error if stateBlockNumber is not set
   * @throws Error if no transactions are provided
   */
  build(): SignetCallBundle {
    if (this.blockNumber === undefined) {
      throw new Error("SignetCallBundle requires a blockNumber");
    }
    if (this.stateBlockNumber === undefined) {
      throw new Error("SignetCallBundle requires a stateBlockNumber");
    }
    if (this.txs.length === 0) {
      throw new Error("SignetCallBundle requires at least one transaction");
    }

    const bundle: SignetCallBundle = {
      txs: this.txs,
      blockNumber: this.blockNumber,
      stateBlockNumber: this.stateBlockNumber,
    };

    if (this.timestamp !== undefined) {
      (bundle as { timestamp?: bigint }).timestamp = this.timestamp;
    }
    if (this.gasLimit !== undefined) {
      (bundle as { gasLimit?: bigint }).gasLimit = this.gasLimit;
    }
    if (this.difficulty !== undefined) {
      (bundle as { difficulty?: bigint }).difficulty = this.difficulty;
    }
    if (this.baseFee !== undefined) {
      (bundle as { baseFee?: bigint }).baseFee = this.baseFee;
    }
    if (this.transactionIndex !== undefined) {
      (bundle as { transactionIndex?: number }).transactionIndex =
        this.transactionIndex;
    }
    if (this.coinbase !== undefined) {
      (bundle as { coinbase?: Address }).coinbase = this.coinbase;
    }
    if (this.timeout !== undefined) {
      (bundle as { timeout?: number }).timeout = this.timeout;
    }

    return bundle;
  }
}
