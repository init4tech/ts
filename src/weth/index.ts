/**
 * WETH deposit/withdraw operations.
 */
import type {
  Account,
  Address,
  Chain,
  Hash,
  Transport,
  WalletClient,
} from "viem";
import { wethAbi } from "../abi/weth.js";

type ConfiguredWalletClient = WalletClient<Transport, Chain, Account>;

/**
 * Wrap native ETH into WETH.
 *
 * @param client - Wallet client with chain and account configured
 * @param params - Wrap parameters
 * @returns Transaction hash
 */
export async function wrapEth(
  client: ConfiguredWalletClient,
  params: {
    weth: Address;
    amount: bigint;
  }
): Promise<Hash> {
  return client.writeContract({
    address: params.weth,
    abi: wethAbi,
    functionName: "deposit",
    value: params.amount,
  });
}

/**
 * Unwrap WETH back into native ETH.
 *
 * @param client - Wallet client with chain and account configured
 * @param params - Unwrap parameters
 * @returns Transaction hash
 */
export async function unwrapEth(
  client: ConfiguredWalletClient,
  params: {
    weth: Address;
    amount: bigint;
  }
): Promise<Hash> {
  return client.writeContract({
    address: params.weth,
    abi: wethAbi,
    functionName: "withdraw",
    args: [params.amount],
  });
}
