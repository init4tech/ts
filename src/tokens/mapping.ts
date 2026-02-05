import type { TokenSymbol } from "./constants.js";

type Direction = "hostToRollup" | "rollupToHost";

/**
 * The flow type determines which entry mechanism is being used.
 *
 * - `passage`: Direct entry via Passage contract. Passage.enter() accepts
 *   native ETH directly with `{ value: amount }`, so no WETH wrap is needed.
 * - `orders`: Entry via Permit2 orders. Permit2 requires ERC20 tokens, so
 *   native ETH must be wrapped to WETH before creating an order.
 */
export type Flow = "passage" | "orders";

const BRIDGEABLE_TOKENS = new Set<TokenSymbol>([
  "WETH",
  "WBTC",
  "USDC",
  "USDT",
]);

export function mapTokenCrossChain(
  symbol: TokenSymbol
): TokenSymbol | undefined {
  return BRIDGEABLE_TOKENS.has(symbol) ? symbol : undefined;
}

/**
 * Determines whether ETH needs to be wrapped to WETH for a given operation.
 *
 * @param symbol - The token symbol
 * @param direction - The direction of the transfer
 * @param flow - The entry mechanism being used
 * @returns true if ETH needs to be wrapped to WETH
 *
 * @example
 * ```ts
 * // Passage flow: enter() accepts native ETH directly
 * needsWethWrap("ETH", "hostToRollup", "passage"); // false
 *
 * // Orders flow: Permit2 requires ERC20, so wrap is needed
 * needsWethWrap("ETH", "hostToRollup", "orders"); // true
 *
 * // Exit direction: rollup only has WETH, no wrap needed
 * needsWethWrap("ETH", "rollupToHost", "orders"); // false
 * ```
 */
export function needsWethWrap(
  symbol: TokenSymbol,
  direction: Direction,
  flow: Flow
): boolean {
  if (symbol !== "ETH") return false;

  // Passage flow: enter() accepts native ETH directly, no wrap needed
  if (flow === "passage") return false;

  // Orders flow: Permit2 requires ERC20, wrap needed for host→rollup entry
  return direction === "hostToRollup";
}
