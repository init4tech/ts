/**
 * Faucet client for requesting testnet tokens.
 *
 * @example
 * ```typescript
 * import { createFaucetClient, PARMIGIANA } from "@signet-sh/sdk";
 *
 * const faucet = createFaucetClient(PARMIGIANA.faucetUrl);
 *
 * // Request both USD and ETH
 * const result = await faucet.requestTokens("0x...");
 *
 * // Request specific assets
 * const usdOnly = await faucet.requestTokens("0x...", ["usd"]);
 *
 * // Check cooldown status
 * const status = await faucet.checkCooldown(["0x..."]);
 * ```
 */
import { getAddress } from "viem";
import type { Address } from "viem";
import type {
  FaucetAsset,
  FaucetDripResponse,
  FaucetStatusResponse,
  FaucetAddressStatus,
  FaucetDripData,
} from "../types/faucet.js";
import { FaucetRequestError } from "../types/faucet.js";

/**
 * Faucet client interface for requesting testnet tokens.
 */
export interface FaucetClient {
  /**
   * Request testnet tokens for an address.
   *
   * @param address - Wallet address to fund
   * @param assets - Assets to request (defaults to all available)
   * @returns Drip result with transaction details
   * @throws {FaucetRequestError} On rate limit, invalid address, or network error
   *
   * @example
   * ```typescript
   * // Request all available assets
   * const result = await faucet.requestTokens("0x742d35...");
   * console.log(result.message); // "Successfully sent 1.00 USD + 0.05 ETH"
   *
   * // Request only USD
   * const usdResult = await faucet.requestTokens("0x742d35...", ["usd"]);
   * ```
   */
  requestTokens(
    address: Address,
    assets?: FaucetAsset[]
  ): Promise<FaucetDripData>;

  /**
   * Check cooldown status for one or more addresses.
   *
   * @param addresses - Addresses to check (max 100)
   * @returns Map of address to cooldown status
   * @throws {FaucetRequestError} On invalid input or network error
   *
   * @example
   * ```typescript
   * const status = await faucet.checkCooldown(["0x742d35..."]);
   * const addrStatus = status["0x742d35..."];
   *
   * if (addrStatus.on_cooldown) {
   *   console.log("Already claimed today");
   *   console.log("USD cooldown:", addrStatus.assets.usd.on_cooldown);
   *   console.log("ETH cooldown:", addrStatus.assets.eth.on_cooldown);
   * }
   * ```
   */
  checkCooldown(
    addresses: Address[]
  ): Promise<Record<Address, FaucetAddressStatus>>;

  /**
   * Check if an address can request tokens.
   *
   * @param address - Address to check
   * @param asset - Optional specific asset to check. If omitted, returns true if ANY asset is available.
   * @returns True if the address can request the specified (or any) asset
   *
   * @example
   * ```typescript
   * if (await faucet.canRequest("0x742d35...")) {
   *   await faucet.requestTokens("0x742d35...");
   * }
   *
   * // Check a specific asset
   * if (await faucet.canRequest("0x742d35...", "usd")) {
   *   await faucet.requestTokens("0x742d35...", ["usd"]);
   * }
   * ```
   */
  canRequest(address: Address, asset?: FaucetAsset): Promise<boolean>;
}

/**
 * Options for creating a faucet client.
 */
export interface FaucetClientOptions {
  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  timeout?: number;

  /**
   * Custom fetch implementation (useful for testing or custom environments).
   */
  fetch?: typeof fetch;
}

/**
 * Creates a faucet client for requesting testnet tokens.
 *
 * @param baseUrl - Faucet API base URL (e.g., "https://faucet.parmigiana.signet.sh")
 * @param options - Client options
 * @returns Faucet client instance
 *
 * @example
 * ```typescript
 * import { createFaucetClient, PARMIGIANA } from "@signet-sh/sdk";
 *
 * const faucet = createFaucetClient(PARMIGIANA.faucetUrl);
 *
 * try {
 *   const result = await faucet.requestTokens("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb");
 *   console.log("Funded!", result.results.usd?.transaction_hash);
 * } catch (err) {
 *   if (err instanceof FaucetRequestError && err.isRateLimited) {
 *     console.log("Already claimed today. Try again tomorrow.");
 *   }
 * }
 * ```
 */
export function createFaucetClient(
  baseUrl: string,
  options: FaucetClientOptions = {}
): FaucetClient {
  const { timeout = 30000, fetch: customFetch = fetch } = options;

  // Normalize base URL (remove trailing slash)
  const normalizedUrl = baseUrl.replace(/\/+$/, "");

  async function post<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await customFetch(`${normalizedUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorData:
          | { error?: { code?: string; message?: string; details?: string } }
          | undefined;
        try {
          errorData = (await response.json()) as typeof errorData;
        } catch {
          // No JSON body available
        }
        throw new FaucetRequestError(
          errorData?.error?.message ??
            `Request failed (${String(response.status)} ${response.statusText})`,
          errorData?.error?.code ?? "HTTP_ERROR",
          errorData?.error?.details ?? response.statusText,
          response.status
        );
      }

      let data: T;
      try {
        data = (await response.json()) as T;
      } catch {
        throw new FaucetRequestError(
          `Request failed (${String(response.status)})`,
          "PARSE_ERROR",
          response.statusText,
          response.status
        );
      }

      return data;
    } catch (err) {
      if (err instanceof FaucetRequestError) {
        throw err;
      }
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          throw new FaucetRequestError(
            "Request timed out",
            "TIMEOUT",
            `Request did not complete within ${String(timeout)}ms`
          );
        }
        throw new FaucetRequestError(
          "Network error",
          "NETWORK_ERROR",
          err.message
        );
      }
      throw new FaucetRequestError("Unknown error", "UNKNOWN", String(err));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    async requestTokens(
      address: Address,
      assets?: FaucetAsset[]
    ): Promise<FaucetDripData> {
      try {
        getAddress(address);
      } catch {
        throw new FaucetRequestError(
          "Invalid Ethereum address",
          "INVALID_ADDRESS",
          `"${address}" is not a valid address`
        );
      }

      const response = await post<FaucetDripResponse>("/drip", {
        address,
        ...(assets && assets.length > 0 ? { assets } : {}),
      });

      // Return per-asset results if data is present (includes partial success)
      if (response.data) {
        return response.data;
      }

      // Handle complete failure (no data, only error)
      if (response.error) {
        throw new FaucetRequestError(
          response.error.message,
          response.error.code,
          response.error.details
        );
      }

      throw new FaucetRequestError(
        "Invalid response: missing data",
        "INVALID_RESPONSE"
      );
    },

    async checkCooldown(
      addresses: Address[]
    ): Promise<Record<Address, FaucetAddressStatus>> {
      for (const addr of addresses) {
        try {
          getAddress(addr);
        } catch {
          throw new FaucetRequestError(
            "Invalid Ethereum address",
            "INVALID_ADDRESS",
            `"${addr}" is not a valid address`
          );
        }
      }

      if (addresses.length === 0) {
        return {};
      }

      if (addresses.length > 100) {
        throw new FaucetRequestError(
          "Too many addresses",
          "TOO_MANY_ADDRESSES",
          "Maximum 100 addresses per request"
        );
      }

      const response = await post<FaucetStatusResponse>("/drip/status", {
        addresses,
      });

      if (!response.success && response.error) {
        throw new FaucetRequestError(
          response.error.message,
          response.error.code,
          response.error.details
        );
      }

      if (!response.data) {
        throw new FaucetRequestError(
          "Invalid response: missing data",
          "INVALID_RESPONSE"
        );
      }

      return response.data;
    },

    async canRequest(address: Address, asset?: FaucetAsset): Promise<boolean> {
      const status = await this.checkCooldown([address]);
      const addrStatus = status[address];

      if (asset) {
        return !addrStatus.assets[asset].on_cooldown;
      }

      // Return true if ANY asset is not on cooldown
      return Object.values(addrStatus.assets).some((a) => !a.on_cooldown);
    },
  };
}
