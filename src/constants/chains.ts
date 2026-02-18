import type { Address } from "viem";
import type { TokenSymbol } from "../tokens/constants.js";

export interface SignetSystemConstants {
  readonly hostChainId: bigint;
  readonly rollupChainId: bigint;
  readonly hostOrders: Address;
  readonly rollupOrders: Address;
  readonly hostZenith: Address;
  readonly hostPassage: Address;
  readonly hostTransactor: Address;
  readonly rollupPassage: Address;
  readonly txCacheUrl: string;
  readonly faucetUrl?: string;
  readonly slotTime: bigint;
  readonly tokenDecimals?: Partial<Record<TokenSymbol, number>>;
}

export const MAINNET: SignetSystemConstants = {
  hostChainId: 1n,
  rollupChainId: 519n,
  hostOrders: "0x96f44ddc3Bc8892371305531F1a6d8ca2331fE6C",
  rollupOrders: "0x000000000000007369676e65742d6f7264657273",
  hostZenith: "0xBCe84D45d7be8859bcBd838d4a7b3448B55E6869",
  hostPassage: "0x02a64d6e2c30d2B07ddBD177b24D9D0f6439CcbD",
  hostTransactor: "0xC4388A6f4917B8D392B19b43F9c46FEC1B890f45",
  rollupPassage: "0x0000000000007369676e65742d70617373616765",
  txCacheUrl: "https://transactions.signet.sh",
  slotTime: 12n,
} as const;

export const PARMIGIANA: SignetSystemConstants = {
  hostChainId: 3151908n,
  rollupChainId: 88888n,
  hostOrders: "0x96f44ddc3Bc8892371305531F1a6d8ca2331fE6C",
  rollupOrders: "0x000000000000007369676E65742D6f7264657273",
  hostZenith: "0x143A5BE4E559cA49Dbf0966d4B9C398425C5Fc19",
  hostPassage: "0x28524D2a753925Ef000C3f0F811cDf452C6256aF",
  hostTransactor: "0x0B4fc18e78c585687E01c172a1087Ea687943db9",
  rollupPassage: "0x0000000000007369676E65742D70617373616765",
  txCacheUrl: "https://transactions.parmigiana.signet.sh",
  faucetUrl: "https://faucet.parmigiana.signet.sh",
  slotTime: 12n,
  tokenDecimals: {
    WUSD: 18,
  },
} as const;

export function getOrdersContract(
  constants: SignetSystemConstants,
  chainId: bigint
): Address | undefined {
  if (chainId === constants.hostChainId) {
    return constants.hostOrders;
  }
  if (chainId === constants.rollupChainId) {
    return constants.rollupOrders;
  }
  return undefined;
}
