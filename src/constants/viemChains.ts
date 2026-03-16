/**
 * Viem chain definitions for Signet networks.
 */
import { defineChain } from "viem";

/** Viem chain definition for the Signet mainnet rollup (chain 519). */
export const signetRollup = defineChain({
  id: 519,
  name: "Signet",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.signet.sh"] },
  },
});

/** Viem chain definition for the Parmigiana testnet rollup (chain 88888). */
export const parmigianaRollup = defineChain({
  id: 88888,
  name: "Parmigiana",
  nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.parmigiana.signet.sh"] },
  },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: "https://explorer.parmigiana.signet.sh",
    },
  },
});

/** Viem chain definition for the Parmigiana testnet host chain (chain 3151908). */
export const parmigianaHost = defineChain({
  id: 3151908,
  name: "Parmigiana Host",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://host-rpc.parmigiana.signet.sh"] },
  },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: "https://explorer-host.parmigiana.signet.sh",
    },
  },
});
