import type { Account, Address, WalletClient } from "viem";
import { toTokenPermissionsArray } from "../types/conversions.js";
import type { ChainConfig, SignedOrder } from "../types/order.js";
import type {
  Output,
  Permit2Batch,
  PermitBatchTransferFrom,
  TokenPermissions,
} from "../types/primitives.js";
import { randomNonce } from "./nonce.js";
import { resolveAccount, signPermit2WitnessTransfer } from "./permit2.js";

/**
 * Builder for constructing unsigned orders.
 */
export class UnsignedOrder {
  private _inputs: TokenPermissions[] = [];
  private _outputs: Output[] = [];
  private _deadline: bigint = 0n;
  private _nonce: bigint | undefined;
  private _chainId: bigint | undefined;
  private _orderContract: Address | undefined;

  /**
   * Create a new unsigned order builder.
   */
  static new(): UnsignedOrder {
    return new UnsignedOrder();
  }

  /**
   * Add an input to the order.
   *
   * @param token - Token contract address
   * @param amount - Amount to transfer
   * @returns This builder for chaining
   */
  withInput(token: Address, amount: bigint): this {
    this._inputs.push({ token, amount });
    return this;
  }

  /**
   * Add multiple inputs to the order.
   *
   * @param inputs - Array of token/amount pairs
   * @returns This builder for chaining
   */
  withInputs(inputs: readonly { token: Address; amount: bigint }[]): this {
    this._inputs.push(
      ...inputs.map(({ token, amount }) => ({ token, amount }))
    );
    return this;
  }

  /**
   * Add an output to the order.
   *
   * @param token - Token contract address
   * @param amount - Amount to receive
   * @param recipient - Recipient address
   * @param chainId - Target chain ID
   * @returns This builder for chaining
   */
  withOutput(
    token: Address,
    amount: bigint,
    recipient: Address,
    chainId: number
  ): this {
    this._outputs.push({ token, amount, recipient, chainId });
    return this;
  }

  /**
   * Add multiple outputs to the order.
   *
   * @param outputs - Array of output objects
   * @returns This builder for chaining
   */
  withOutputs(outputs: readonly Output[]): this {
    this._outputs.push(...outputs);
    return this;
  }

  /**
   * Set the order deadline.
   *
   * @param deadline - Unix timestamp deadline
   * @returns This builder for chaining
   */
  withDeadline(deadline: bigint): this {
    this._deadline = deadline;
    return this;
  }

  /**
   * Set the Permit2 nonce.
   *
   * @param nonce - Permit2 nonce value
   * @returns This builder for chaining
   */
  withNonce(nonce: bigint): this {
    this._nonce = nonce;
    return this;
  }

  /**
   * Set the chain configuration.
   *
   * @param config - Chain configuration with chainId and orderContract
   * @returns This builder for chaining
   */
  withChain(config: ChainConfig): this {
    this._chainId = config.chainId;
    this._orderContract = config.orderContract;
    return this;
  }

  /**
   * Get the current inputs.
   */
  get inputs(): readonly TokenPermissions[] {
    return this._inputs;
  }

  /**
   * Get the current outputs.
   */
  get outputs(): readonly Output[] {
    return this._outputs;
  }

  /**
   * Sign the order, producing a SignedOrder.
   *
   * @param client - Wallet client with signing capability
   * @param account - Account to sign with (optional if client has default)
   * @returns The signed order
   * @throws If chain configuration is missing
   */
  async sign(
    client: WalletClient,
    account?: Account | Address
  ): Promise<SignedOrder> {
    if (this._chainId === undefined || this._orderContract === undefined) {
      throw new Error("Chain not configured. Call withChain() first.");
    }

    const nonce = this._nonce ?? randomNonce();
    const { signerAccount, ownerAddress } = resolveAccount(client, account);
    const permitted = toTokenPermissionsArray(this._inputs);

    const signature = await signPermit2WitnessTransfer(
      client,
      signerAccount,
      this._chainId,
      {
        permitted,
        spender: this._orderContract,
        nonce,
        deadline: this._deadline,
        outputs: this._outputs,
      }
    );

    const permit: PermitBatchTransferFrom = {
      permitted,
      nonce,
      deadline: this._deadline,
    };

    const permit2Batch: Permit2Batch = {
      permit,
      owner: ownerAddress,
      signature,
    };

    return {
      permit: permit2Batch,
      outputs: this._outputs,
    };
  }
}
