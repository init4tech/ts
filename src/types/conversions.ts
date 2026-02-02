/**
 * Type conversion utilities for EIP-712 message encoding.
 */
import type { Address, Input, Output, TokenPermissions } from "./primitives.js";

/**
 * Plain object form of TokenPermissions for EIP-712 encoding.
 */
export interface TokenPermissionsObject {
  readonly token: Address;
  readonly amount: bigint;
}

/**
 * Plain object form of Output for EIP-712 encoding.
 */
export interface OutputObject {
  readonly token: Address;
  readonly amount: bigint;
  readonly recipient: Address;
  readonly chainId: number;
}

/**
 * Convert Input, Output, or TokenPermissions to a plain object for EIP-712 encoding.
 *
 * @param input - The input to convert
 * @returns Plain object with token and amount fields
 */
export function toTokenPermissions(
  input: Input | Output | TokenPermissions
): TokenPermissionsObject {
  return { token: input.token, amount: input.amount };
}

/**
 * Convert Output to a plain object for EIP-712 encoding.
 *
 * @param output - The output to convert
 * @returns Plain object with all output fields
 */
export function toOutputObject(output: Output): OutputObject {
  return {
    token: output.token,
    amount: output.amount,
    recipient: output.recipient,
    chainId: output.chainId,
  };
}

/**
 * Batch convert inputs to TokenPermissions objects for EIP-712 encoding.
 *
 * @param inputs - Array of inputs to convert
 * @returns Array of plain objects
 */
export function toTokenPermissionsArray(
  inputs: readonly (Input | Output | TokenPermissions)[]
): TokenPermissionsObject[] {
  return inputs.map(toTokenPermissions);
}

/**
 * Batch convert outputs to plain objects for EIP-712 encoding.
 *
 * @param outputs - Array of outputs to convert
 * @returns Array of plain objects
 */
export function toOutputObjectArray(
  outputs: readonly Output[]
): OutputObject[] {
  return outputs.map(toOutputObject);
}
