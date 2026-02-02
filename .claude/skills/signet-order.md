# signet-order

Generate TypeScript code for creating and signing Signet orders using @signet/sdk.

## Usage

```
/signet-order [type] [options]
```

**Types:**
- `order` (default) - Create a swap order
- `fill` - Create a fill for an existing order
- `hash` - Compute order hash from existing data

**Options (space-separated after type):**
- `mainnet` or `testnet` - Target network (default: mainnet)
- `multi-input` or `multi-output` - Multiple tokens
- `raw` - Use raw SignedOrder type instead of builder

## Instructions

When invoked, generate TypeScript code for the requested operation. Always:

1. Import from `@signet/sdk` using explicit type imports where appropriate
2. Import viem utilities as needed (`createWalletClient`, `http`, `privateKeyToAccount`)
3. Use the fluent builder API (`UnsignedOrder.new()...`) unless `raw` option is specified
4. Include placeholder addresses with clear comments (e.g., `"0x..." // Your token address`)
5. Use BigInt literals for amounts with human-readable comments (e.g., `1000000n // 1 USDC (6 decimals)`)
6. Set reasonable deadline (1 hour from now by default)
7. Use the appropriate chain config (MAINNET or PARMIGIANA for testnet)

## Examples

### Default: Simple Order

```typescript
import { UnsignedOrder, MAINNET, orderHash } from "@signet/sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

// Configure wallet
const account = privateKeyToAccount("0x..."); // Your private key
const client = createWalletClient({
  account,
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});

// Token addresses
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// Build and sign order
const signedOrder = await UnsignedOrder.new()
  .withInput(USDC, 1000_000000n) // 1000 USDC (6 decimals)
  .withOutput(
    WETH,
    500000000000000000n, // 0.5 WETH (18 decimals)
    account.address,
    MAINNET.rollupChainId
  )
  .withDeadline(BigInt(Math.floor(Date.now() / 1000) + 3600)) // 1 hour
  .withChain({
    chainId: MAINNET.rollupChainId,
    orderContract: MAINNET.rollupOrders,
  })
  .sign(client);

// Get order hash for tracking
const hash = orderHash(signedOrder);
console.log("Order hash:", hash);
console.log("Order:", signedOrder);
```

### Fill Example

```typescript
import { UnsignedFill, MAINNET, type Output } from "@signet/sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const account = privateKeyToAccount("0x..."); // Filler's private key
const client = createWalletClient({
  account,
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});

// Outputs from the order being filled
const orderOutputs: Output[] = [
  {
    token: "0x...", // Output token address
    amount: 500000000000000000n,
    recipient: "0x...", // Original order maker
    chainId: MAINNET.rollupChainId,
  },
];

const signedFill = await UnsignedFill.new()
  .withOutputs(orderOutputs)
  .withDeadline(BigInt(Math.floor(Date.now() / 1000) + 3600))
  .withNonce(BigInt(Date.now())) // Use timestamp as nonce
  .withChain({
    chainId: MAINNET.rollupChainId,
    orderContract: MAINNET.rollupOrders,
  })
  .sign(client);

console.log("Signed fill:", signedFill);
```

### Hash Computation Example

```typescript
import { orderHash, orderHashPreImage, type SignedOrder } from "@signet/sdk";

// Existing signed order (from API, database, etc.)
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
      amount: 500000000000000000n,
      recipient: "0x...",
      chainId: 519n,
    },
  ],
};

const hash = orderHash(order);
const preImage = orderHashPreImage(order); // 128-byte pre-image

console.log("Order hash:", hash);
console.log("Pre-image:", preImage);
```

### Testnet Example

```typescript
import { UnsignedOrder, PARMIGIANA, orderHash } from "@signet/sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0x...");
const client = createWalletClient({
  account,
  chain: {
    id: Number(PARMIGIANA.hostChainId),
    name: "Parmigiana Host",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["http://localhost:8545"] } },
  },
  transport: http("http://localhost:8545"),
});

const signedOrder = await UnsignedOrder.new()
  .withInput("0x...", 1000000n)
  .withOutput("0x...", 500000000000000000n, account.address, PARMIGIANA.rollupChainId)
  .withDeadline(BigInt(Math.floor(Date.now() / 1000) + 3600))
  .withChain({
    chainId: PARMIGIANA.rollupChainId,
    orderContract: PARMIGIANA.rollupOrders,
  })
  .sign(client);

console.log("Testnet order hash:", orderHash(signedOrder));
```

### Multi-Input/Output Example

```typescript
import { UnsignedOrder, MAINNET, orderHash, type Input, type Output } from "@signet/sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const account = privateKeyToAccount("0x...");
const client = createWalletClient({
  account,
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});

// Multiple inputs (tokens you're offering)
const inputs: Input[] = [
  { token: "0x...", amount: 1000_000000n }, // 1000 USDC
  { token: "0x...", amount: 500_000000n },  // 500 USDT
];

// Multiple outputs (tokens you want)
const outputs: Output[] = [
  {
    token: "0x...",
    amount: 1000000000000000000n, // 1 WETH
    recipient: account.address,
    chainId: MAINNET.rollupChainId,
  },
  {
    token: "0x...",
    amount: 50000000000000000000n, // 50 LINK
    recipient: account.address,
    chainId: MAINNET.rollupChainId,
  },
];

const signedOrder = await UnsignedOrder.new()
  .withInputs(inputs)
  .withOutputs(outputs)
  .withDeadline(BigInt(Math.floor(Date.now() / 1000) + 3600))
  .withChain({
    chainId: MAINNET.rollupChainId,
    orderContract: MAINNET.rollupOrders,
  })
  .sign(client);

console.log("Multi-token order:", orderHash(signedOrder));
```

## Response Format

When generating code:

1. Start with a brief explanation of what the code does
2. Provide the complete, runnable TypeScript code
3. Add notes about:
   - Required setup (wallet, RPC endpoint)
   - Token decimal handling
   - How to customize for specific use case
