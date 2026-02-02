# @signet/sdk

[![npm version](https://img.shields.io/npm/v/@signet/sdk.svg)](https://www.npmjs.com/package/@signet/sdk)
[![CI](https://github.com/init4tech/signet-sdk-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/init4tech/signet-sdk-ts/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)](LICENSE)

TypeScript SDK for creating and signing Signet orders compatible with the Rust `signet-types` crate.

## Installation

```bash
pnpm add @signet/sdk viem
```

## Quick Start

```typescript
import { UnsignedOrder, orderHash, MAINNET } from "@signet/sdk";
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
import { orderHash } from "@signet/sdk";
import type { SignedOrder } from "@signet/sdk";

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

### Chain Configurations

```typescript
import { MAINNET, PARMIGIANA } from "@signet/sdk";

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
import { MAINNET, PARMIGIANA } from "@signet/sdk/constants";
import { UnsignedOrder } from "@signet/sdk/signing";
import type { SignedOrder } from "@signet/sdk/types";
import { rollupOrdersAbi } from "@signet/sdk/abi";
```

## API Reference

### Types

- `SignedOrder` - A signed order ready for submission
- `SignedFill` - A signed fill for filling orders
- `Permit2Batch` - Permit2 batch transfer data
- `Output` - Order output specification
- `TokenPermissions` - Token permission for Permit2

### Functions

- `orderHash(order)` - Compute the order hash
- `orderHashPreImage(order)` - Get the pre-image used for hashing
- `normalizeSignature(sig)` - Normalize ECDSA signature S-value

### Classes

- `UnsignedOrder` - Builder for creating unsigned orders
- `UnsignedFill` - Builder for creating unsigned fills

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
