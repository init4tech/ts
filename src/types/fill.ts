/**
 * Fill types for Signet SDK.
 */
import type { Output, Permit2Batch } from "./primitives.js";

/**
 * A SignedFill is constructed by Fillers to fill a batch of Orders.
 * It represents the Orders' Outputs after they have been permit2-encoded and signed.
 *
 * Corresponds to the parameters for `fillPermit2` on the OrderDestination contract.
 *
 * WARNING: A SignedFill must remain private until mined, as there is no guarantee
 * that desired Order Inputs will be received in return.
 */
export interface SignedFill {
  /** The permit batch with owner and signature */
  readonly permit: Permit2Batch;
  /** The outputs being filled */
  readonly outputs: readonly Output[];
}
