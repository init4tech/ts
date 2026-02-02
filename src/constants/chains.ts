/**
 * Chain configuration constants for Signet.
 */
import type { Address } from "viem";

/**
 * System constants for a Signet chain pair (host + rollup).
 */
export interface SignetSystemConstants {
  /** Host chain ID */
  readonly hostChainId: bigint;
  /** Rollup chain ID */
  readonly rollupChainId: bigint;
  /** Orders contract on host chain */
  readonly hostOrders: Address;
  /** Orders contract on rollup chain */
  readonly rollupOrders: Address;
  /** Zenith contract on host chain */
  readonly hostZenith: Address;
  /** Passage contract on host chain */
  readonly hostPassage: Address;
  /** Transactor contract on host chain */
  readonly hostTransactor: Address;
  /** Passage contract on rollup chain */
  readonly rollupPassage: Address;
}

/**
 * Mainnet Signet system constants.
 */
export const MAINNET: SignetSystemConstants = {
  hostChainId: 1n,
  rollupChainId: 519n,
  hostOrders: "0x96f44ddc3Bc8892371305531F1a6d8ca2331fE6C",
  rollupOrders: "0x000000000000007369676e65742d6f7264657273",
  hostZenith: "0xBCe84D45d7be8859bcBd838d4a7b3448B55E6869",
  hostPassage: "0x02a64d6e2c30d2B07ddBD177b24D9D0f6439CcbD",
  hostTransactor: "0xC4388A6f4917B8D392B19b43F9c46FEC1B890f45",
  rollupPassage: "0x0000000000007369676e65742d70617373616765",
} as const;

/**
 * Parmigiana testnet Signet system constants.
 */
export const PARMIGIANA: SignetSystemConstants = {
  hostChainId: 3151908n,
  rollupChainId: 88888n,
  hostOrders: "0x96f44ddc3Bc8892371305531F1a6d8ca2331fE6C",
  rollupOrders: "0x000000000000007369676E65742D6f7264657273",
  hostZenith: "0x143A5BE4E559cA49Dbf0966d4B9C398425C5Fc19",
  hostPassage: "0x28524D2a753925Ef000C3f0F811cDf452C6256aF",
  hostTransactor: "0x0B4fc18e78c585687E01c172a1087Ea687943db9",
  rollupPassage: "0x0000000000007369676E65742D70617373616765",
} as const;

/**
 * Get the orders contract address for a given chain ID.
 */
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
