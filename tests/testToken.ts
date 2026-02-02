/**
 * Test token utilities for Anvil-based E2E tests.
 *
 * Provides helpers to use an existing ERC20 token on the forked chain
 * and manipulate its state for testing purposes.
 *
 * We use storage slot manipulation rather than deploying our own token,
 * which is more reliable when working with forked state.
 */
import {
  type Address,
  type Hex,
  type PublicClient,
  type TestClient,
  type WalletClient,
  encodeAbiParameters,
  keccak256,
  padHex,
  parseAbi,
  toHex,
} from "viem";

/** Standard ERC20 ABI for interacting with tokens */
export const testTokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
]);

/**
 * Compute the storage slot for an ERC20 balanceOf mapping.
 *
 * Different ERC20 implementations use different base slots:
 * - OpenZeppelin (newer): slot 0
 * - Solmate: slot 3
 * - Some custom: various
 *
 * @param address - Account address
 * @param baseSlot - Base slot for balances mapping (default: 0)
 */
export function balanceOfSlot(address: Address, baseSlot = 0n): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [address, baseSlot]
    )
  );
}

/**
 * Compute the storage slot for an ERC20 allowance mapping.
 *
 * @param owner - Token owner address
 * @param spender - Spender address
 * @param baseSlot - Base slot for allowances mapping (default: 1)
 */
export function allowanceSlot(
  owner: Address,
  spender: Address,
  baseSlot = 1n
): Hex {
  const ownerSlot = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [owner, baseSlot]
    )
  );
  return keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "bytes32" }],
      [spender, ownerSlot]
    )
  );
}

/**
 * Set the balance of an account for an ERC20 token via storage manipulation.
 * Tries multiple common storage slots used by different ERC20 implementations.
 *
 * @param testClient - Anvil test client
 * @param publicClient - Public client for reading state
 * @param tokenAddress - Token contract address
 * @param account - Account to set balance for
 * @param balance - Balance to set
 */
export async function setTokenBalance(
  testClient: TestClient,
  tokenAddress: Address,
  account: Address,
  balance: bigint,
  publicClient?: PublicClient
): Promise<void> {
  // Common base slots for balances mapping in different ERC20 implementations
  const commonSlots = [0n, 1n, 2n, 3n, 4n, 5n, 51n, 101n];

  for (const baseSlot of commonSlots) {
    const slot = balanceOfSlot(account, baseSlot);
    await testClient.setStorageAt({
      address: tokenAddress,
      index: slot,
      value: padHex(toHex(balance), { size: 32 }),
    });

    // If we have a public client, verify the balance was set
    if (publicClient) {
      try {
        const actualBalance = await publicClient.readContract({
          address: tokenAddress,
          abi: testTokenAbi,
          functionName: "balanceOf",
          args: [account],
        });
        if (actualBalance === balance) {
          return; // Success
        }
      } catch {
        // Continue trying other slots
      }
    }
  }

  // If no publicClient provided, just set all common slots
  if (!publicClient) {
    return;
  }

  throw new Error(
    `Failed to set token balance - none of the common storage slots worked for ${tokenAddress}`
  );
}

/**
 * Set the allowance for a spender via storage manipulation.
 * Tries multiple common storage slots used by different ERC20 implementations.
 */
export async function setTokenAllowance(
  testClient: TestClient,
  tokenAddress: Address,
  owner: Address,
  spender: Address,
  allowance: bigint,
  publicClient?: PublicClient
): Promise<void> {
  // Common base slots for allowances mapping (usually balances slot + 1)
  const commonSlots = [1n, 2n, 3n, 4n, 5n, 6n, 52n, 102n];

  for (const baseSlot of commonSlots) {
    const slot = allowanceSlot(owner, spender, baseSlot);
    await testClient.setStorageAt({
      address: tokenAddress,
      index: slot,
      value: padHex(toHex(allowance), { size: 32 }),
    });

    // If we have a public client, verify the allowance was set
    if (publicClient) {
      try {
        const actualAllowance = await publicClient.readContract({
          address: tokenAddress,
          abi: testTokenAbi,
          functionName: "allowance",
          args: [owner, spender],
        });
        if (actualAllowance === allowance) {
          return; // Success
        }
      } catch {
        // Continue trying other slots
      }
    }
  }

  if (!publicClient) {
    return;
  }

  throw new Error(
    `Failed to set token allowance - none of the common storage slots worked for ${tokenAddress}`
  );
}

/**
 * Approve a spender via transaction (uses ERC20 approve function).
 */
export async function approveToken(
  walletClient: WalletClient,
  tokenAddress: Address,
  spender: Address,
  amount: bigint
): Promise<Hex> {
  return walletClient.writeContract({
    address: tokenAddress,
    abi: testTokenAbi,
    functionName: "approve",
    args: [spender, amount],
    chain: null,
    account: null,
  });
}

/**
 * Read the balance of an account for a token.
 */
export async function getTokenBalance(
  publicClient: PublicClient,
  tokenAddress: Address,
  account: Address
): Promise<bigint> {
  return publicClient.readContract({
    address: tokenAddress,
    abi: testTokenAbi,
    functionName: "balanceOf",
    args: [account],
  });
}

/**
 * Read the allowance for a spender.
 */
export async function getTokenAllowance(
  publicClient: PublicClient,
  tokenAddress: Address,
  owner: Address,
  spender: Address
): Promise<bigint> {
  return publicClient.readContract({
    address: tokenAddress,
    abi: testTokenAbi,
    functionName: "allowance",
    args: [owner, spender],
  });
}
