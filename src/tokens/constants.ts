export interface TokenMeta {
  readonly symbol: string;
  readonly name: string;
  readonly decimals: number;
}

export const TOKENS = {
  ETH: { symbol: "ETH", name: "Ether", decimals: 18 },
  WETH: { symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  WBTC: { symbol: "WBTC", name: "Wrapped Bitcoin", decimals: 8 },
  USDC: { symbol: "USDC", name: "USD Coin", decimals: 6 },
  USDT: { symbol: "USDT", name: "Tether USD", decimals: 6 },
  WUSD: { symbol: "WUSD", name: "Wrapped USD", decimals: 6 },
  USD: { symbol: "USD", name: "USD", decimals: 18 },
} as const satisfies Record<string, TokenMeta>;

export type TokenSymbol = keyof typeof TOKENS;
