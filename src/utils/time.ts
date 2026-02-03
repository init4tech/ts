/**
 * Returns the current time in seconds as a bigint.
 */
export function nowSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}
