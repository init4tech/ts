import type { Account, Address, WalletClient } from "viem";
import type { SignetSystemConstants } from "../constants/chains.js";
import { toTokenPermissionsArray } from "../types/conversions.js";
import type { SignedFill } from "../types/fill.js";
import type { ChainConfig } from "../types/order.js";
import type {
  Output,
  Permit2Batch,
  PermitBatchTransferFrom,
} from "../types/primitives.js";
import { nowSeconds } from "../utils/time.js";
import { randomNonce } from "./nonce.js";
import { resolveAccount, signPermit2WitnessTransfer } from "./permit2.js";

/**
 * Builder for constructing unsigned fills.
 */
export class UnsignedFill {
  private _outputs: Output[] = [];
  private _deadline: bigint | undefined;
  private _nonce: bigint | undefined;
  private _chainId: bigint | undefined;
  private _orderContract: Address | undefined;
  private _constants: SignetSystemConstants | undefined;

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
   * Set the system constants for deadline calculation.
   *
   * @param constants - Signet system constants
   * @returns This builder for chaining
   */
  withConstants(constants: SignetSystemConstants): this {
    this._constants = constants;
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
      this._deadline ?? nowSeconds() + (this._constants?.slotTime ?? 12n);
    const { signerAccount, ownerAddress } = resolveAccount(client, account);

    const permitted = toTokenPermissionsArray(this._outputs);

    const signature = await signPermit2WitnessTransfer(
      client,
      signerAccount,
      this._chainId,
      {
        permitted,
        spender: this._orderContract,
        nonce,
        deadline,
        outputs: this._outputs,
      }
    );

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
