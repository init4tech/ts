import type { Address, PublicClient } from "viem";
import { erc20Abi } from "viem";
import { PERMIT2_ADDRESS } from "../constants/permit2.js";
import type { SignedOrder } from "../types/order.js";
import type { TokenPermissions } from "../types/primitives.js";
import { nowSeconds } from "../utils/time.js";
import { isNonceUsed } from "./nonce.js";

/**
 * Categories of feasibility issues.
 */
export type FeasibilityIssueType =
  | "insufficient_balance"
  | "insufficient_allowance"
  | "nonce_used"
  | "deadline_expired";

/**
 * A single issue preventing order feasibility.
 */
export interface FeasibilityIssue {
  /** The type of issue */
  readonly type: FeasibilityIssueType;
  /** Human-readable description */
  readonly message: string;
  /** Token address (for balance/allowance issues) */
  readonly token?: Address;
  /** Required amount */
  readonly required?: bigint;
  /** Available amount */
  readonly available?: bigint;
}

/**
 * Result of feasibility check.
 */
export interface FeasibilityResult {
  /** True if the order can be executed */
  readonly feasible: boolean;
  /** List of issues preventing execution (empty if feasible) */
  readonly issues: readonly FeasibilityIssue[];
}

/**
 * Check if an order is feasible to execute.
 *
 * Verifies:
 * - Owner has sufficient balance for all input tokens
 * - Owner has approved sufficient allowance to Permit2 for all input tokens
 *
 * @param client - Public client for reading contract state
 * @param order - The signed order to check
 * @returns Feasibility result with any issues found
 *
 * @example
 * ```typescript
 * const result = await checkOrderFeasibility(publicClient, signedOrder);
 * if (!result.feasible) {
 *   console.log("Order cannot be executed:", result.issues);
 * }
 * ```
 */
export async function checkOrderFeasibility(
  client: PublicClient,
  order: SignedOrder
): Promise<FeasibilityResult> {
  const issues: FeasibilityIssue[] = [];
  const owner = order.permit.owner;
  const tokens = order.permit.permit.permitted;

  // Check if deadline has expired
  if (order.permit.permit.deadline < nowSeconds()) {
    issues.push({
      type: "deadline_expired",
      message: "Order permit deadline has expired",
    });
  }

  // Check if nonce has been consumed
  if (await isNonceUsed(client, owner, order.permit.permit.nonce)) {
    issues.push({
      type: "nonce_used",
      message: "Order permit nonce has already been used",
    });
  }

  // Check balance and allowance for each input token
  const checks = tokens.map(async (token) => {
    const [balance, allowance] = await Promise.all([
      client.readContract({
        address: token.token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [owner],
      }),
      client.readContract({
        address: token.token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, PERMIT2_ADDRESS],
      }),
    ]);

    if (balance < token.amount) {
      issues.push({
        type: "insufficient_balance",
        message: `Insufficient balance for token ${token.token}`,
        token: token.token,
        required: token.amount,
        available: balance,
      });
    }

    if (allowance < token.amount) {
      issues.push({
        type: "insufficient_allowance",
        message: `Insufficient Permit2 allowance for token ${token.token}`,
        token: token.token,
        required: token.amount,
        available: allowance,
      });
    }
  });

  await Promise.all(checks);

  return {
    feasible: issues.length === 0,
    issues,
  };
}

/**
 * Check if tokens have sufficient Permit2 approval.
 *
 * @param client - Public client for reading contract state
 * @param owner - Address of the token owner
 * @param tokens - Array of token permissions to check
 * @returns True if all tokens have sufficient Permit2 approval
 *
 * @example
 * ```typescript
 * const approved = await hasPermit2Approval(publicClient, userAddress, [
 *   { token: usdcAddress, amount: 1000000n },
 * ]);
 * if (!approved) {
 *   console.log("Need to approve tokens for Permit2");
 * }
 * ```
 */
export async function hasPermit2Approval(
  client: PublicClient,
  owner: Address,
  tokens: readonly TokenPermissions[]
): Promise<boolean> {
  const checks = tokens.map(async (token) => {
    const allowance = await client.readContract({
      address: token.token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, PERMIT2_ADDRESS],
    });
    return allowance >= token.amount;
  });

  const results = await Promise.all(checks);
  return results.every(Boolean);
}
