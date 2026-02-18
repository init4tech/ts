/**
 * Faucet types for requesting testnet tokens.
 */
import type { Address, Hex } from "viem";

/**
 * Supported faucet assets.
 */
export type FaucetAsset = "usd" | "eth";

/**
 * Request payload for faucet drip.
 */
export interface FaucetDripRequest {
  /** Wallet address to receive funds */
  address: Address;
  /** Assets to request (defaults to all if omitted) */
  assets?: FaucetAsset[];
}

/**
 * Result for a single asset drip.
 */
export interface FaucetAssetResult {
  /** Amount received (human-readable, e.g., "1.00") */
  amount?: string;
  /** Currency symbol (e.g., "USD", "ETH") */
  currency?: string;
  /** Transaction hash */
  transaction_hash?: Hex;
  /** Chain ID where funds were sent */
  chain_id?: number;
  /** Unix timestamp when claimed */
  claimed_at?: number;
  /** Error message if this asset failed */
  error?: string;
  /** Error code if this asset failed */
  error_code?: string;
  /** Additional error details */
  error_details?: string;
}

/**
 * Data returned on successful drip (may be partial success).
 */
export interface FaucetDripData {
  /** Recipient address */
  address: Address;
  /** Per-asset results */
  results: Record<FaucetAsset, FaucetAssetResult>;
  /** Human-readable summary message */
  message: string;
}

/**
 * Error details from faucet API.
 */
export interface FaucetError {
  /** Error code (e.g., "ALREADY_CLAIMED", "INVALID_ADDRESS") */
  code: string;
  /** Error message */
  message: string;
  /** Additional details */
  details?: string;
}

/**
 * Response from faucet drip endpoint.
 */
export interface FaucetDripResponse {
  /** Whether at least one asset was successfully sent */
  success: boolean;
  /** Drip data (present on success or partial success) */
  data?: FaucetDripData;
  /** Error details (present on complete failure) */
  error?: FaucetError;
}

/**
 * Request payload for checking cooldown status.
 */
export interface FaucetStatusRequest {
  /** Addresses to check (max 100) */
  addresses: Address[];
}

/**
 * Cooldown status for a single asset.
 */
export interface FaucetAssetCooldown {
  /** Whether this asset is on cooldown */
  on_cooldown: boolean;
  /** Unix timestamp when cooldown expires (midnight UTC) */
  expires_at?: number;
  /** Transaction hash from the last claim */
  tx_hash?: Hex;
}

/**
 * Cooldown status for a single address.
 */
export interface FaucetAddressStatus {
  /** Whether any asset is on cooldown */
  on_cooldown: boolean;
  /** Per-asset cooldown status */
  assets: Record<FaucetAsset, FaucetAssetCooldown>;
}

/**
 * Response from faucet status endpoint.
 */
export interface FaucetStatusResponse {
  /** Whether the request succeeded */
  success: boolean;
  /** Per-address cooldown status */
  data?: Record<Address, FaucetAddressStatus>;
  /** Error details */
  error?: FaucetError;
}

/**
 * Error thrown when faucet request fails.
 */
export class FaucetRequestError extends Error {
  /** Error code from API */
  readonly code: string;
  /** Additional details */
  readonly details?: string;
  /** HTTP status code */
  readonly statusCode?: number;

  constructor(
    message: string,
    code: string,
    details?: string,
    statusCode?: number
  ) {
    super(message);
    this.name = "FaucetRequestError";
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }

  /** Whether this is a rate limit / cooldown error */
  get isRateLimited(): boolean {
    return this.code === "ALREADY_CLAIMED" || this.statusCode === 429;
  }
}
