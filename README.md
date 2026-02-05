# @signet-sh/sdk

[![npm version](https://img.shields.io/npm/v/@signet-sh/sdk.svg)](https://www.npmjs.com/package/@signet-sh/sdk)
[![CI](https://github.com/init4tech/signet-sdk-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/init4tech/signet-sdk-ts/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)](LICENSE)

TypeScript SDK for creating and signing Signet orders compatible with the Rust `signet-types` crate.

## Installation

```bash
pnpm add @signet-sh/sdk viem
```

## Quick Start

```typescript
import { UnsignedOrder, orderHash, MAINNET } from "@signet-sh/sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

// Create a wallet client
const account = privateKeyToAccount("0x...");
const client = createWalletClient({
  account,
  chain: mainnet,
  transport: http(),
});

// Build and sign an order
const signedOrder = await UnsignedOrder.new()
  .withInput("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 1000000n) // 1 USDC
  .withOutput(
    "0x0000000000000000000000000000000000000000", // Native token
    500000000000000000n, // 0.5 ETH
    account.address,
    1 // Mainnet
  )
  .withDeadline(BigInt(Math.floor(Date.now() / 1000) + 3600)) // 1 hour
  .withChain({
    chainId: MAINNET.rollupChainId,
    orderContract: MAINNET.rollupOrders,
  })
  .sign(client);

// Compute the order hash
const hash = orderHash(signedOrder);
```

## Usage

### Computing Order Hash from Existing Data

```typescript
import { orderHash } from "@signet-sh/sdk";
import type { SignedOrder } from "@signet-sh/sdk";

const order: SignedOrder = {
  permit: {
    permit: {
      permitted: [{ token: "0x...", amount: 1000000n }],
      nonce: 12345n,
      deadline: 1700000000n,
    },
    owner: "0x...",
    signature: "0x...",
  },
  outputs: [
    {
      token: "0x...",
      amount: 500000n,
      recipient: "0x...",
      chainId: 1,
    },
  ],
};

const hash = orderHash(order);
```

### Submitting Orders to the Transaction Pool

After signing an order, submit it to the Signet transaction pool for fillers to discover and execute:

```typescript
import { createTxCacheClient } from "@signet-sh/sdk/client";

// Create a client pointing to the Signet tx-cache
const txCache = createTxCacheClient("https://tx.signet.sh");

// Submit a signed order
const { id } = await txCache.submitOrder(signedOrder);
console.log(`Order submitted with ID: ${id}`);
```

### On-Chain Operations

The SDK provides helpers for common on-chain operations:

#### Bridging with Passage

Enter Signet from the host chain:

```typescript
import { enter, enterToken, MAINNET } from "@signet-sh/sdk";
import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";

const client = createWalletClient({
  account,
  chain: mainnet,
  transport: http(),
});

// Bridge native ETH
const hash = await enter(client, {
  passage: MAINNET.hostPassage,
  recipient: "0x...",
  amount: 1000000000000000000n, // 1 ETH
});

// Bridge ERC20 tokens (requires prior approval)
const hash = await enterToken(client, {
  passage: MAINNET.hostPassage,
  rollupChainId: MAINNET.rollupChainId,
  recipient: "0x...",
  token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  amount: 1000000n, // 1 USDC
});
```

#### WETH Wrapping

Convert between ETH and WETH:

```typescript
import { wrapEth, unwrapEth, getTokenAddress, MAINNET } from "@signet-sh/sdk";

const wethAddress = getTokenAddress("WETH", MAINNET.hostChainId, MAINNET)!;

// Wrap ETH → WETH
await wrapEth(client, { weth: wethAddress, amount: 1000000000000000000n });

// Unwrap WETH → ETH
await unwrapEth(client, { weth: wethAddress, amount: 1000000000000000000n });
```

#### Permit2 Approvals

Manage ERC20 approvals for Permit2:

```typescript
import {
  getPermit2Allowance,
  approvePermit2,
  ensurePermit2Approval,
} from "@signet-sh/sdk";

// Check current allowance
const allowance = await getPermit2Allowance(publicClient, {
  token: usdcAddress,
  owner: account.address,
});

// Approve Permit2 (max by default)
await approvePermit2(walletClient, { token: usdcAddress });

// Smart approval - handles USDT-style tokens that require reset to zero
const { approved, txHash } = await ensurePermit2Approval(
  walletClient,
  publicClient,
  {
    token: usdtAddress,
    owner: account.address,
    amount: 1000000n,
  }
);
```

### Chain Configurations

```typescript
import { MAINNET, PARMIGIANA } from "@signet-sh/sdk";

// Mainnet configuration
console.log(MAINNET.hostChainId); // 1n
console.log(MAINNET.rollupChainId); // 519n

// Parmigiana testnet
console.log(PARMIGIANA.hostChainId); // 3151908n
console.log(PARMIGIANA.rollupChainId); // 88888n
```

### Subpath Imports

```typescript
// Import specific modules for smaller bundle sizes
import { MAINNET, PARMIGIANA } from "@signet-sh/sdk/constants";
import { UnsignedOrder } from "@signet-sh/sdk/signing";
import type { SignedOrder } from "@signet-sh/sdk/types";
import { rollupOrdersAbi } from "@signet-sh/sdk/abi";
import { createTxCacheClient } from "@signet-sh/sdk/client";
import { enter, enterToken } from "@signet-sh/sdk/passage";
import { wrapEth, unwrapEth } from "@signet-sh/sdk/weth";
import { ensurePermit2Approval } from "@signet-sh/sdk/permit2";
```

### Bundles

> **⚠️ SECURITY WARNING: Bundles are private information and MUST be kept safe.**
>
> Never log, share, or transmit bundles over unencrypted connections. Leaked bundles expose your trading strategy and can be front-run.

Bundles are atomic transaction packages for block builders:

```typescript
import {
  SignetEthBundleBuilder,
  createTxCacheClient,
  type Hex,
} from "@signet-sh/sdk";

// Build a bundle from signed transactions
const signedTx: Hex = "0x02f8..."; // Your signed transaction

const bundle = SignetEthBundleBuilder.new()
  .withTx(signedTx)
  .withBlockNumber(12345678n)
  .build();

// Submit to tx-cache
const txCache = createTxCacheClient("https://tx.signet.sh");
const response = await txCache.submitBundle(bundle);
console.log("Bundle ID:", response.id);
```

Bundle with host transactions and timing constraints:

```typescript
const bundle = SignetEthBundleBuilder.new()
  .withTxs([tx1, tx2]) // Rollup transactions
  .withHostTx(hostTx) // Host chain transaction
  .withBlockNumber(12345678n)
  .withMinTimestamp(Math.floor(Date.now() / 1000))
  .withMaxTimestamp(Math.floor(Date.now() / 1000) + 120)
  .build();
```

Simulate a bundle before submission:

```typescript
import { SignetCallBundleBuilder, serializeCallBundle } from "@signet-sh/sdk";

const callBundle = SignetCallBundleBuilder.new()
  .withTx(signedTx)
  .withBlockNumber(12345679n)
  .withStateBlockNumber("latest")
  .build();

const serialized = serializeCallBundle(callBundle);
// Use with signet_callBundle RPC method
```

## API Reference

### Types

- `SignedOrder` - A signed order ready for submission
- `SignedFill` - A signed fill for filling orders
- `SignetEthBundle` - Bundle for `signet_sendBundle`
- `SignetCallBundle` - Bundle for `signet_callBundle` (simulation)
- `Permit2Batch` - Permit2 batch transfer data
- `Output` - Order output specification
- `TokenPermissions` - Token permission for Permit2

### Functions

- `orderHash(order)` - Compute the order hash
- `orderHashPreImage(order)` - Get the pre-image used for hashing
- `normalizeSignature(sig)` - Normalize ECDSA signature S-value
- `serializeEthBundle(bundle)` - Serialize bundle for JSON-RPC
- `serializeCallBundle(bundle)` - Serialize call bundle for JSON-RPC
- `createTxCacheClient(url)` - Create a tx-cache client for bundle submission
- `enter(client, params)` - Bridge native ETH to Signet via Passage
- `enterToken(client, params)` - Bridge ERC20 tokens to Signet via Passage
- `wrapEth(client, params)` - Wrap native ETH into WETH
- `unwrapEth(client, params)` - Unwrap WETH back to native ETH
- `getPermit2Allowance(client, params)` - Get ERC20 allowance for Permit2
- `approvePermit2(client, params)` - Approve Permit2 to spend ERC20
- `ensurePermit2Approval(walletClient, publicClient, params)` - Smart Permit2 approval with USDT handling

### Classes

- `UnsignedOrder` - Builder for creating unsigned orders
- `UnsignedFill` - Builder for creating unsigned fills
- `SignetEthBundleBuilder` - Builder for creating eth bundles
- `SignetCallBundleBuilder` - Builder for creating call bundles

### Client

- `createTxCacheClient(baseUrl)` - Create a client for submitting orders to the transaction pool
  - `submitOrder(order)` - Submit a signed order

### Constants

- `PERMIT2_ADDRESS` - Canonical Permit2 contract address
- `MAINNET` - Mainnet chain configuration
- `PARMIGIANA` - Parmigiana testnet configuration

## Compatibility

This SDK produces signed orders that are byte-for-byte compatible with the Rust `signet-types` crate. The order hash computation matches exactly, ensuring interoperability between TypeScript and Rust implementations.

## Development

```bash
pnpm install    # Install dependencies
pnpm build      # Build the package
pnpm test       # Run tests in watch mode
pnpm test:run   # Run tests once
pnpm lint       # Run ESLint
pnpm format     # Format with Prettier
pnpm typecheck  # Type check
```

## License

MIT OR Apache-2.0
