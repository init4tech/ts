---
name: signet-ts-sdk
description: TypeScript SDK for Signet blockchain operations — order creation/signing, bundle building, event parsing, passage bridging, and chain configuration
---

# @signet-sh/sdk

TypeScript SDK for creating, signing, and submitting Signet orders. Compatible with the Rust `signet-types` crate for cross-implementation interoperability.

## Core Capabilities

### Order Creation & Signing

Build and sign EIP-712 orders using the `UnsignedOrder` builder. Orders use Permit2 for gasless token approvals.

```typescript
import { UnsignedOrder, orderHash, MAINNET } from "@signet-sh/sdk";

const signedOrder = await UnsignedOrder.new()
  .withInput(tokenAddress, amount)
  .withOutput(outputToken, outputAmount, recipient, chainId)
  .withDeadline(deadline)
  .withChain({
    chainId: MAINNET.rollupChainId,
    orderContract: MAINNET.rollupOrders,
  })
  .sign(walletClient);

const hash = orderHash(signedOrder);
```

### Bundle Building

Construct atomic transaction bundles for block builders. Bundles support rollup transactions, host chain transactions, and timing constraints.

```typescript
import { SignetEthBundleBuilder, createTxCacheClient } from "@signet-sh/sdk";

const bundle = SignetEthBundleBuilder.new()
  .withTx(signedTx)
  .withBlockNumber(12345678n)
  .build();

const txCache = createTxCacheClient("https://tx.signet.sh");
await txCache.submitBundle(bundle);
```

Simulate bundles before submission:

```typescript
import { SignetCallBundleBuilder, serializeCallBundle } from "@signet-sh/sdk";

const callBundle = SignetCallBundleBuilder.new()
  .withTx(signedTx)
  .withBlockNumber(12345679n)
  .withStateBlockNumber("latest")
  .build();

const serialized = serializeCallBundle(callBundle);
```

### Event Parsing

Parse RollupOrders contract events with full type safety using viem's `parseEventLogs` and the SDK's typed event interfaces (v0.4.0+).

```typescript
import { parseEventLogs } from "viem";
import {
  rollupOrdersAbi,
  type OrderEvent,
  type FilledEvent,
  type SweepEvent,
} from "@signet-sh/sdk";

const events = parseEventLogs({ abi: rollupOrdersAbi, logs });

for (const event of events) {
  switch (event.eventName) {
    case "Order": {
      const { deadline, inputs, outputs } = event.args as OrderEvent;
      break;
    }
    case "Filled": {
      const { outputs } = event.args as FilledEvent;
      break;
    }
    case "Sweep": {
      const { recipient, token, amount } = event.args as SweepEvent;
      break;
    }
  }
}
```

### Passage Bridging

Bridge native ETH and ERC20 tokens between host chain and Signet rollup using the Passage contract.

```typescript
import { passageAbi, MAINNET } from "@signet-sh/sdk";

// Bridge native ETH
await walletClient.writeContract({
  address: MAINNET.hostPassage,
  abi: passageAbi,
  functionName: "enter",
  args: [recipientAddress],
  value: 1000000000000000000n,
});

// Bridge ERC20 tokens
await walletClient.writeContract({
  address: MAINNET.hostPassage,
  abi: passageAbi,
  functionName: "enterToken",
  args: [MAINNET.rollupChainId, recipientAddress, tokenAddress, amount],
});
```

## Exports

### Types

- `SignedOrder` — A signed order ready for submission
- `SignedFill` — A signed fill for filling orders
- `SignetEthBundle` — Bundle for `signet_sendBundle`
- `SignetCallBundle` — Bundle for `signet_callBundle` (simulation)
- `SignetCallBundleResponse` — Response from `signet_callBundle`
- `Permit2Batch` — Permit2 batch transfer data
- `PermitBatchTransferFrom` — Permit2 batch transfer from structure
- `Output` — Order output specification (token, amount, recipient, chainId)
- `Input` — Order input specification (token, amount)
- `TokenPermissions` — Token permission for Permit2
- `ChainConfig` — Chain configuration for order signing
- `UnsignedOrderParams` — Parameters for building unsigned orders
- `SerializedSignedOrder` — JSON-serializable signed order
- `SerializedSignetEthBundle` — JSON-serializable eth bundle
- `SerializedSignetCallBundle` — JSON-serializable call bundle
- `SerializedSignetCallBundleResponse` — JSON-serializable call bundle response
- `CallBundleTransactionResult` — Result of a simulated bundle transaction
- `SerializedCallBundleTransactionResult` — JSON-serializable transaction result
- `AggregateFills` — Aggregate fill data
- `AggregateOrders` — Aggregate order data
- `BlockNumberOrTag` — Block number or tag (`"latest"`, `"pending"`, etc.)
- `SignetSystemConstants` — Chain configuration interface
- `Eip712SigningParams` — EIP-712 signing parameters
- `FeasibilityResult` — Result of order feasibility check
- `FeasibilityIssue` — Individual feasibility issue
- `FeasibilityIssueType` — Type of feasibility issue
- `Flow` — Entry mechanism: `"passage"` or `"orders"`
- `TokenSymbol` — Supported token symbols
- `TokenMeta` — Token metadata (symbol, decimals, addresses)
- `TxCacheClient` — Tx-cache client interface
- `Address`, `Hex`, `B256`, `Bytes` — Ethereum primitive types (re-exported from viem)

### Event Types (v0.4.0+)

Typed interfaces for parsing RollupOrders contract events with `parseEventLogs`:

- `OrderEvent` — Parsed args from an `Order` event: `{ deadline, inputs, outputs }`
- `FilledEvent` — Parsed args from a `Filled` event: `{ outputs }`
- `SweepEvent` — Parsed args from a `Sweep` event: `{ recipient, token, amount }`

### Functions

**Order hashing & signing:**

- `orderHash(order)` — Compute the order hash
- `orderHashPreImage(order)` — Get the pre-image used for hashing
- `computeOrderHash(order)` — Compute order hash (alternate)
- `normalizeSignature(sig)` — Normalize ECDSA signature S-value
- `eip712Components(order)` — Get EIP-712 domain and types
- `eip712SigningHash(order)` — Compute EIP-712 signing hash
- `permit2Domain(chainId)` — Get Permit2 EIP-712 domain
- `permit2DomainSeparator(chainId)` — Compute Permit2 domain separator
- `permitBatchWitnessStructHash(data)` — Compute batch witness struct hash
- `randomNonce()` — Generate a random Permit2 nonce
- `nonceFromSeed(seed)` — Derive a nonce from a seed

**Validation:**

- `validateOrder(order)` — Validate an order's structure
- `validateFill(fill)` — Validate a fill's structure
- `checkOrderFeasibility(order, params)` — Check if an order is feasible on-chain
- `hasPermit2Approval(client, params)` — Check Permit2 approval status
- `isNonceUsed(client, params)` — Check if a Permit2 nonce is used

**Encoding:**

- `encodeInitiatePermit2(order)` — Encode order for Permit2 initiation
- `encodeFillPermit2(fill)` — Encode fill for Permit2 execution

**Serialization:**

- `serializeOrder(order)` — Serialize a signed order for JSON
- `deserializeOrder(data)` — Deserialize a signed order from JSON
- `serializeEthBundle(bundle)` — Serialize eth bundle for JSON-RPC
- `deserializeEthBundle(data)` — Deserialize eth bundle from JSON
- `serializeCallBundle(bundle)` — Serialize call bundle for JSON-RPC
- `deserializeCallBundle(data)` — Deserialize call bundle from JSON
- `deserializeCallBundleResponse(data)` — Deserialize call bundle response
- `deserializeTransactionResult(data)` — Deserialize transaction result

**Permit2:**

- `ensurePermit2Approval(walletClient, publicClient, params)` — Smart Permit2 approval with USDT handling

**Tokens:**

- `getTokenAddress(symbol, chainId, config)` — Get token contract address
- `getTokenDecimals(symbol, config?)` — Get token decimals with chain-specific overrides
- `resolveTokenSymbol(address, chainId, config)` — Resolve address to token symbol
- `getAvailableTokens(chainId, config)` — Get available tokens for a chain
- `mapTokenCrossChain(symbol, fromChainId, toChainId, config)` — Map token across chains
- `needsWethWrap(symbol, direction, flow)` — Check if ETH needs wrapping for operation

**Client:**

- `createTxCacheClient(baseUrl)` — Create a tx-cache client for submitting orders and bundles

**Constants helpers:**

- `getOrdersContract(constants, chainId)` — Get the orders contract for a chain

### Classes

- `UnsignedOrder` — Builder for creating and signing orders. Methods: `new()`, `withInput()`, `withOutput()`, `withDeadline()`, `withChain()`, `sign()`
- `UnsignedFill` — Builder for creating and signing fills
- `SignetEthBundleBuilder` — Builder for eth bundles. Methods: `new()`, `withTx()`, `withTxs()`, `withHostTx()`, `withBlockNumber()`, `withMinTimestamp()`, `withMaxTimestamp()`, `build()`
- `SignetCallBundleBuilder` — Builder for call bundles (simulation). Methods: `new()`, `withTx()`, `withBlockNumber()`, `withStateBlockNumber()`, `build()`

### Constants

- `PERMIT2_ADDRESS` — Canonical Permit2 contract address
- `PERMIT2_NAME` — Permit2 EIP-712 domain name
- `MAINNET` — Mainnet chain configuration (host chain 1, rollup chain 519)
- `PARMIGIANA` — Parmigiana testnet configuration (host chain 3151908, rollup chain 88888)
- `OUTPUT_WITNESS_TYPE_STRING` — EIP-712 output witness type string
- `PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPES` — Permit2 batch witness transfer types
- `TOKENS` — Token registry with addresses and metadata
- `signetRollup` — Viem chain definition for Signet rollup
- `parmigianaRollup` — Viem chain definition for Parmigiana rollup
- `parmigianaHost` — Viem chain definition for Parmigiana host

### ABIs

- `rollupOrdersAbi` — Rollup orders contract ABI (Order, Filled, Sweep events)
- `hostOrdersAbi` — Host orders contract ABI
- `passageAbi` — Passage bridge contract ABI (Enter, EnterToken events)
- `rollupPassageAbi` — Rollup passage contract ABI
- `permit2Abi` — Permit2 contract ABI
- `wethAbi` — WETH contract ABI (deposit, withdraw)
- `zenithAbi` — Zenith contract ABI
- `transactorAbi` — Transactor contract ABI
- `bundleHelperAbi` — Bundle helper contract ABI

## Subpath Imports

The SDK supports subpath imports for smaller bundle sizes:

```typescript
import { MAINNET, PARMIGIANA } from "@signet-sh/sdk/constants";
import { UnsignedOrder } from "@signet-sh/sdk/signing";
import type { SignedOrder } from "@signet-sh/sdk/types";
import { rollupOrdersAbi, passageAbi, wethAbi } from "@signet-sh/sdk/abi";
import { getTokenAddress, getTokenDecimals } from "@signet-sh/sdk/tokens";
import { createTxCacheClient } from "@signet-sh/sdk/client";
import { ensurePermit2Approval } from "@signet-sh/sdk/permit2";
```

## Chain Configurations

### MAINNET

| Field           | Value                                        |
| --------------- | -------------------------------------------- |
| `hostChainId`   | `1n` (Ethereum)                              |
| `rollupChainId` | `519n`                                       |
| `hostPassage`   | `0x02a64d6e2c30d2B07ddBD177b24D9D0f6439CcbD` |
| `rollupOrders`  | `0x000000000000007369676e65742d6f7264657273` |
| `hostOrders`    | `0x96f44ddc3Bc8892371305531F1a6d8ca2331fE6C` |
| `txCacheUrl`    | `https://transactions.signet.sh`             |

### PARMIGIANA (Testnet)

| Field           | Value                                        |
| --------------- | -------------------------------------------- |
| `hostChainId`   | `3151908n`                                   |
| `rollupChainId` | `88888n`                                     |
| `hostPassage`   | `0x28524D2a753925Ef000C3f0F811cDf452C6256aF` |
| `rollupOrders`  | `0x000000000000007369676E65742D6f7264657273` |
| `hostOrders`    | `0x96f44ddc3Bc8892371305531F1a6d8ca2331fE6C` |
| `txCacheUrl`    | `https://transactions.parmigiana.signet.sh`  |
| `tokenDecimals` | `{ WUSD: 18 }` (testnet override)            |

## Common Patterns

### Order Signing Flow

1. Approve token to Permit2 (one-time per token)
2. Build order with `UnsignedOrder` builder
3. Sign with wallet (off-chain EIP-712 via Permit2)
4. Submit to tx-cache with `createTxCacheClient`

### Permit2 Approval (USDT-safe)

```typescript
import { ensurePermit2Approval } from "@signet-sh/sdk";

const { approved, txHash } = await ensurePermit2Approval(
  walletClient,
  publicClient,
  {
    token: tokenAddress,
    owner: account.address,
    amount: 1000000n,
  }
);
```

### Token Address Lookup

```typescript
import { getTokenAddress, getTokenDecimals, MAINNET } from "@signet-sh/sdk";

const weth = getTokenAddress("WETH", MAINNET.hostChainId, MAINNET);
const decimals = getTokenDecimals("WETH", MAINNET);
```

### WETH Wrap Check

```typescript
import { needsWethWrap } from "@signet-sh/sdk";

// Check if ETH needs wrapping for an Orders flow (Permit2 requires WETH)
const wrap = needsWethWrap("ETH", "input", "orders"); // true
const noWrap = needsWethWrap("ETH", "input", "passage"); // false — Passage accepts native ETH
```

### Order Feasibility Check

```typescript
import { checkOrderFeasibility } from "@signet-sh/sdk";

const result = await checkOrderFeasibility(order, {
  publicClient,
  config: MAINNET,
});
if (result.issues.length > 0) {
  console.log("Issues:", result.issues);
}
```
