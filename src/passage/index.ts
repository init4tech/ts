/**
 * Passage bridge operations for entering Signet from Host.
 */
import type {
  Account,
  Address,
  Chain,
  Hash,
  Transport,
  WalletClient,
} from "viem";
import { passageAbi } from "../abi/passage.js";

type ConfiguredWalletClient = WalletClient<Transport, Chain, Account>;

/**
 * Enter Signet with native ETH via Passage.
 *
 * @param client - Wallet client with chain and account configured
 * @param params - Entry parameters
 * @returns Transaction hash
 */
export async function enter(
  client: ConfiguredWalletClient,
  params: {
    passage: Address;
    recipient: Address;
    amount: bigint;
  }
): Promise<Hash> {
  return client.writeContract({
    address: params.passage,
    abi: passageAbi,
    functionName: "enter",
    args: [params.recipient],
    value: params.amount,
  });
}

/**
 * Enter Signet with an ERC20 token via Passage.
 *
 * @param client - Wallet client with chain and account configured
 * @param params - Entry parameters
 * @returns Transaction hash
 */
export async function enterToken(
  client: ConfiguredWalletClient,
  params: {
    passage: Address;
    rollupChainId: bigint;
    recipient: Address;
    token: Address;
    amount: bigint;
  }
): Promise<Hash> {
  return client.writeContract({
    address: params.passage,
    abi: passageAbi,
    functionName: "enterToken",
    args: [params.rollupChainId, params.recipient, params.token, params.amount],
  });
}
