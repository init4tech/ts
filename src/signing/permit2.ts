import type { Account, Address, Hex, WalletClient } from "viem";
import { toOutputObjectArray } from "../types/conversions.js";
import { PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPES } from "../types/permit2.js";
import type { Output, TokenPermissions } from "../types/primitives.js";
import { permit2Domain } from "./domain.js";

/** Parameters for signing a Permit2 witness transfer. */
export interface Permit2SigningParams {
  permitted: TokenPermissions[];
  spender: Address;
  nonce: bigint;
  deadline: bigint;
  outputs: Output[];
}

/**
 * Resolve account from client or explicit account parameter.
 *
 * @throws If no account is available
 */
export function resolveAccount(
  client: WalletClient,
  account?: Account | Address
): { signerAccount: Account | Address; ownerAddress: Address } {
  const signerAccount = account ?? client.account;
  if (!signerAccount) {
    throw new Error("No account provided and client has no default account.");
  }
  const ownerAddress: Address =
    typeof signerAccount === "string" ? signerAccount : signerAccount.address;
  return { signerAccount, ownerAddress };
}

/**
 * Sign a Permit2 witness transfer message.
 */
export async function signPermit2WitnessTransfer(
  client: WalletClient,
  signerAccount: Account | Address,
  chainId: bigint,
  params: Permit2SigningParams
): Promise<Hex> {
  const domain = permit2Domain(chainId);

  const message = {
    permitted: params.permitted,
    spender: params.spender,
    nonce: params.nonce,
    deadline: params.deadline,
    outputs: toOutputObjectArray(params.outputs),
  };

  return client.signTypedData({
    account: signerAccount,
    domain,
    types: PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPES,
    primaryType: "PermitBatchWitnessTransferFrom",
    message,
  });
}
