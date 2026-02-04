/**
 * Permit2 ERC20 approval helpers.
 *
 * Manages the ERC20 allowance for the canonical Permit2 contract.
 * Handles USDT-style tokens that require resetting allowance to zero
 * before setting a new value.
 */
import type {
  Account,
  Address,
  Chain,
  Hash,
  PublicClient,
  Transport,
  WalletClient,
} from "viem";
import { erc20Abi, maxUint256 } from "viem";
import { PERMIT2_ADDRESS } from "../constants/permit2.js";

type ConfiguredWalletClient = WalletClient<Transport, Chain, Account>;

/**
 * Read the ERC20 allowance granted to the Permit2 contract.
 *
 * @param client - Public client for reading chain state
 * @param params - Query parameters
 * @returns Current allowance
 */
export async function getPermit2Allowance(
  client: PublicClient,
  params: {
    token: Address;
    owner: Address;
  }
): Promise<bigint> {
  return client.readContract({
    address: params.token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [params.owner, PERMIT2_ADDRESS],
  });
}

/**
 * Approve the Permit2 contract to spend an ERC20 token.
 *
 * @param client - Wallet client with chain and account configured
 * @param params - Approval parameters
 * @returns Transaction hash
 */
export async function approvePermit2(
  client: ConfiguredWalletClient,
  params: {
    token: Address;
    amount?: bigint;
  }
): Promise<Hash> {
  return client.writeContract({
    address: params.token,
    abi: erc20Abi,
    functionName: "approve",
    args: [PERMIT2_ADDRESS, params.amount ?? maxUint256],
  });
}

/**
 * Ensure the Permit2 contract has sufficient ERC20 allowance.
 * Handles USDT-style tokens by resetting to zero before approving.
 *
 * @param walletClient - Wallet client with chain and account configured
 * @param publicClient - Public client for reading chain state
 * @param params - Approval parameters
 * @returns Whether an approval tx was sent, and the tx hash if so
 */
export async function ensurePermit2Approval(
  walletClient: ConfiguredWalletClient,
  publicClient: PublicClient,
  params: {
    token: Address;
    owner: Address;
    amount: bigint;
  }
): Promise<{ approved: boolean; txHash?: Hash }> {
  const allowance = await getPermit2Allowance(publicClient, {
    token: params.token,
    owner: params.owner,
  });

  if (allowance >= params.amount) {
    return { approved: false };
  }

  /* USDT-style: reset to zero first if non-zero */
  if (allowance > 0n) {
    const resetHash = await walletClient.writeContract({
      address: params.token,
      abi: erc20Abi,
      functionName: "approve",
      args: [PERMIT2_ADDRESS, 0n],
    });
    await publicClient.waitForTransactionReceipt({ hash: resetHash });
  }

  const txHash = await approvePermit2(walletClient, {
    token: params.token,
  });

  return { approved: true, txHash };
}
