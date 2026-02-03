import type { Address } from "viem";
import type { SignetSystemConstants } from "../constants/chains.js";
import type { TokenSymbol } from "./constants.js";

type ChainTokenAddresses = Partial<Record<TokenSymbol, Address>>;

interface NetworkTokenAddresses {
  readonly host: ChainTokenAddresses;
  readonly rollup: ChainTokenAddresses;
}

const MAINNET_TOKENS: NetworkTokenAddresses = {
  host: {
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  },
  rollup: {
    WETH: "0x0000000000000000007369676e65742d77657468",
    WBTC: "0x0000000000000000007369676e65742d77627463",
    WUSD: "0x0000000000000000007369676e65742D77757364",
  },
};

const PARMIGIANA_TOKENS: NetworkTokenAddresses = {
  host: {
    WETH: "0xD1278f17e86071f1E658B656084c65b7FD3c90eF",
    WBTC: "0xfb29f7d7a4ce607d6038d44150315e5f69bea08a",
  },
  rollup: {
    WETH: "0x0000000000000000007369676e65742d77657468",
    WBTC: "0x0000000000000000007369676e65742D77627463",
    WUSD: "0x0000000000000000007369676e65742D77757364",
  },
};

const TOKEN_REGISTRY = new Map<bigint, NetworkTokenAddresses>([
  [1n, MAINNET_TOKENS],
  [3151908n, PARMIGIANA_TOKENS],
]);

function getNetworkTokens(
  constants: SignetSystemConstants
): NetworkTokenAddresses | undefined {
  return TOKEN_REGISTRY.get(constants.hostChainId);
}

function getSide(
  network: NetworkTokenAddresses,
  chainId: bigint,
  constants: SignetSystemConstants
): ChainTokenAddresses | undefined {
  if (chainId === constants.hostChainId) return network.host;
  if (chainId === constants.rollupChainId) return network.rollup;
  return undefined;
}

export function getTokenAddress(
  symbol: TokenSymbol,
  chainId: bigint,
  constants: SignetSystemConstants
): Address | undefined {
  const network = getNetworkTokens(constants);
  if (!network) return undefined;
  return getSide(network, chainId, constants)?.[symbol];
}

export function resolveTokenSymbol(
  address: Address,
  chainId: bigint,
  constants: SignetSystemConstants
): TokenSymbol | undefined {
  const network = getNetworkTokens(constants);
  if (!network) return undefined;
  const side = getSide(network, chainId, constants);
  if (!side) return undefined;
  const lower = address.toLowerCase();
  for (const [symbol, addr] of Object.entries(side)) {
    if (addr.toLowerCase() === lower) return symbol as TokenSymbol;
  }
  return undefined;
}

export function getAvailableTokens(
  chainId: bigint,
  constants: SignetSystemConstants
): TokenSymbol[] {
  const network = getNetworkTokens(constants);
  if (!network) return [];
  const side = getSide(network, chainId, constants);
  if (!side) return [];
  return Object.keys(side) as TokenSymbol[];
}
