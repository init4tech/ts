import type { TokenSymbol } from "./constants.js";

type Direction = "hostToRollup" | "rollupToHost";

const BRIDGEABLE_TOKENS = new Set<TokenSymbol>([
  "WETH",
  "WBTC",
  "USDC",
  "USDT",
]);

export function mapTokenCrossChain(
  symbol: TokenSymbol,
  _direction: Direction
): TokenSymbol | undefined {
  return BRIDGEABLE_TOKENS.has(symbol) ? symbol : undefined;
}

export function needsWethWrap(
  symbol: TokenSymbol,
  direction: Direction
): boolean {
  return symbol === "ETH" && direction === "hostToRollup";
}
