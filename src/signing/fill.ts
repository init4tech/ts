import type { Account, Address, WalletClient } from "viem";
import { PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPES } from "../types/permit2.js";
import type {
  Output,
  Permit2Batch,
  PermitBatchTransferFrom,
  TokenPermissions,
} from "../types/primitives.js";
import {
  toOutputObjectArray,
  toTokenPermissionsArray,
} from "../types/conversions.js";
import type { SignedFill } from "../types/fill.js";
import type { ChainConfig } from "../types/order.js";
import { permit2Domain } from "./domain.js";
import { randomNonce } from "./nonce.js";

/**
 * Builder for constructing unsigned fills.
 */
export class UnsignedFill {
  private _outputs: Output[] = [];
  private _deadline: bigint | undefined;
  private _nonce: bigint | undefined;
  private _chainId: bigint | undefined;
  private _orderContract: Address | undefined;

  /**
   * Create a new unsigned fill builder.
   */
  static new(): UnsignedFill {
    return new UnsignedFill();
  }

  /**
   * Add outputs to fill.
   *
   * @param outputs - Array of output objects
   * @returns This builder for chaining
   */
  withOutputs(outputs: readonly Output[]): this {
    this._outputs.push(...outputs);
    return this;
  }

  /**
   * Set the fill deadline.
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
   * Get the current outputs.
   */
  get outputs(): readonly Output[] {
    return this._outputs;
  }

  /**
   * Sign the fill, producing a SignedFill.
   *
   * @param client - Wallet client with signing capability
   * @param account - Account to sign with (optional if client has default)
   * @returns The signed fill
   * @throws If chain configuration is missing
   */
  async sign(
    client: WalletClient,
    account?: Account | Address
  ): Promise<SignedFill> {
    if (this._chainId === undefined || this._orderContract === undefined) {
      throw new Error("Chain not configured. Call withChain() first.");
    }

    const nonce = this._nonce ?? randomNonce();

    const deadline =
      this._deadline ?? BigInt(Math.floor(Date.now() / 1000) + 12);

    const signerAccount = account ?? client.account;
    if (!signerAccount) {
      throw new Error("No account provided and client has no default account.");
    }
    const ownerAddress: Address =
      typeof signerAccount === "string" ? signerAccount : signerAccount.address;

    const permitted: TokenPermissions[] = toTokenPermissionsArray(
      this._outputs
    );

    const domain = permit2Domain(this._chainId);

    const message = {
      permitted,
      spender: this._orderContract,
      nonce,
      deadline,
      outputs: toOutputObjectArray(this._outputs),
    };

    const signature = await client.signTypedData({
      account: signerAccount,
      domain,
      types: PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPES,
      primaryType: "PermitBatchWitnessTransferFrom",
      message,
    });

    const permit: PermitBatchTransferFrom = {
      permitted,
      nonce,
      deadline,
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
