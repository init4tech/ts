# signet-fill

Generate TypeScript code for filling Signet orders using @signet-sh/sdk.

## Usage

```
/signet-fill [options]
```

**Options (space-separated):**
- `mainnet` or `testnet` - Target network (default: mainnet)
- `host` or `rollup` - Fill chain (default: determined by order outputs)
- `encode` - Include calldata encoding for on-chain submission
- `validate` - Include fill validation
- `submit` - Include transaction submission code

## Background

Fills are the mechanism by which orders get executed:
- **Orders** are created by users wanting to swap tokens, specifying outputs with target `chainId`
- **Fills** are created by fillers who fulfill those orders
- **Fill chain is determined by the order**: The order's output `chainId` specifies where the fill must occur
  - If outputs target the **host chain** → fill on host using `hostOrders`
  - If outputs target the **rollup chain** → fill on rollup using `rollupOrders`
- A filler signs a Permit2 batch transfer allowing the Orders contract to take their tokens

## Instructions

When invoked, generate TypeScript code for filling orders. Always:

1. Import from `@signet-sh/sdk` using explicit type imports
2. Import viem utilities (`createWalletClient`, `http`, `privateKeyToAccount`)
3. Use the fluent builder API (`UnsignedFill.new()...`)
4. **Match the chain to the order's output chainId**:
   - Host chain fills use `hostOrders` contract
   - Rollup chain fills use `rollupOrders` contract
5. Include comments explaining chain selection based on order outputs
6. Set short deadline (fills should execute quickly, ~12-60 seconds)

## Examples

### Basic Fill (Host Chain)

```typescript
import { UnsignedFill, MAINNET, validateFill, type Output } from "@signet-sh/sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

// Configure filler's wallet
const account = privateKeyToAccount("0x..."); // Filler's private key
const client = createWalletClient({
  account,
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});

// Outputs from the order being filled
// The chainId in outputs determines WHERE the fill happens
const orderOutputs: Output[] = [
  {
    token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH on mainnet
    amount: 500000000000000000n, // 0.5 WETH (18 decimals)
    recipient: "0x...", // Original order maker's address
    chainId: Number(MAINNET.hostChainId), // Output targets HOST chain
  },
];

// Since outputs target hostChainId, fill on HOST chain with hostOrders
const signedFill = await UnsignedFill.new()
  .withOutputs(orderOutputs)
  .withConstants(MAINNET) // Uses slotTime for deadline calculation
  .withChain({
    chainId: MAINNET.hostChainId, // Fill on HOST chain
    orderContract: MAINNET.hostOrders, // Use hostOrders contract
  })
  .sign(client);

// Validate fill structure
validateFill(signedFill);

console.log("Signed fill:", signedFill);
console.log("Fill owner:", signedFill.permit.owner);
console.log("Fill deadline:", signedFill.permit.permit.deadline);
```

### Fill on Rollup Chain

```typescript
import { UnsignedFill, MAINNET, signetRollup, validateFill, type Output } from "@signet-sh/sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Configure filler's wallet for ROLLUP chain
const account = privateKeyToAccount("0x...");
const client = createWalletClient({
  account,
  chain: signetRollup, // Signet rollup chain
  transport: http("https://rpc.signet.sh"),
});

// Outputs targeting the ROLLUP chain
const orderOutputs: Output[] = [
  {
    token: "0x0000000000000000007369676e65742d77657468", // Rollup WETH
    amount: 500000000000000000n,
    recipient: "0x...",
    chainId: Number(MAINNET.rollupChainId), // Output targets ROLLUP chain
  },
];

// Since outputs target rollupChainId, fill on ROLLUP chain with rollupOrders
const signedFill = await UnsignedFill.new()
  .withOutputs(orderOutputs)
  .withConstants(MAINNET)
  .withChain({
    chainId: MAINNET.rollupChainId, // Fill on ROLLUP chain
    orderContract: MAINNET.rollupOrders, // Use rollupOrders contract
  })
  .sign(client);

validateFill(signedFill);
console.log("Rollup fill:", signedFill);
```

### Determining Fill Chain from Order

```typescript
import {
  UnsignedFill,
  MAINNET,
  getOrdersContract,
  validateFill,
  type Output,
  type SignedOrder,
} from "@signet-sh/sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

// Helper to determine fill chain from order outputs
function getFillChainConfig(outputs: readonly Output[], constants: typeof MAINNET) {
  // All outputs should target the same chain
  const targetChainId = BigInt(outputs[0].chainId);
  const orderContract = getOrdersContract(constants, targetChainId);

  if (!orderContract) {
    throw new Error(`Unknown target chain: ${targetChainId}`);
  }

  return { chainId: targetChainId, orderContract };
}

// Given an existing order to fill
const orderToFill: SignedOrder = /* ... from API or database ... */;

// Determine which chain to fill on based on order outputs
const fillChainConfig = getFillChainConfig(orderToFill.outputs, MAINNET);

console.log("Fill chain ID:", fillChainConfig.chainId);
console.log("Fill contract:", fillChainConfig.orderContract);

// Configure wallet for the appropriate chain
const account = privateKeyToAccount("0x...");
const isHostChain = fillChainConfig.chainId === MAINNET.hostChainId;

const client = createWalletClient({
  account,
  chain: isHostChain ? mainnet : { id: Number(MAINNET.rollupChainId), name: "Signet" },
  transport: http(isHostChain ? "https://eth.llamarpc.com" : "https://rpc.signet.sh"),
});

// Create fill with correct chain config
const signedFill = await UnsignedFill.new()
  .withOutputs([...orderToFill.outputs])
  .withConstants(MAINNET)
  .withChain(fillChainConfig)
  .sign(client);

validateFill(signedFill);
```

### Fill with Calldata Encoding

```typescript
import {
  UnsignedFill,
  MAINNET,
  encodeFillPermit2,
  validateFill,
  type Output,
} from "@signet-sh/sdk";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const account = privateKeyToAccount("0x...");
const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});

// Order outputs targeting host chain
const orderOutputs: Output[] = [
  {
    token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    amount: 1000000000000000000n, // 1 WETH
    recipient: "0x...", // Order maker
    chainId: Number(MAINNET.hostChainId),
  },
];

// Sign the fill for host chain
const signedFill = await UnsignedFill.new()
  .withOutputs(orderOutputs)
  .withDeadline(BigInt(Math.floor(Date.now() / 1000) + 60)) // 60 second deadline
  .withChain({
    chainId: MAINNET.hostChainId,
    orderContract: MAINNET.hostOrders,
  })
  .sign(walletClient);

validateFill(signedFill);

// Encode calldata for on-chain submission
const calldata = encodeFillPermit2(signedFill);
console.log("Calldata:", calldata);
console.log("Calldata length:", calldata.length / 2 - 1, "bytes");
```

### Fill with Transaction Submission

```typescript
import {
  UnsignedFill,
  MAINNET,
  hostOrdersAbi,
  validateFill,
  type Output,
} from "@signet-sh/sdk";
import { createWalletClient, createPublicClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const account = privateKeyToAccount("0x...");
const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});

// IMPORTANT: Ensure you have approved Permit2 for the fill tokens
// The filler must have:
// 1. Sufficient token balance on the fill chain
// 2. Approved Permit2 contract for the tokens being transferred

const orderOutputs: Output[] = [
  {
    token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    amount: parseEther("0.5"),
    recipient: "0x...",
    chainId: Number(MAINNET.hostChainId), // Host chain fill
  },
];

const signedFill = await UnsignedFill.new()
  .withOutputs(orderOutputs)
  .withConstants(MAINNET)
  .withChain({
    chainId: MAINNET.hostChainId,
    orderContract: MAINNET.hostOrders,
  })
  .sign(walletClient);

validateFill(signedFill);

// Submit the fill transaction
const txHash = await walletClient.writeContract({
  address: MAINNET.hostOrders,
  abi: hostOrdersAbi,
  functionName: "fillPermit2",
  args: [
    signedFill.outputs.map((o) => ({
      token: o.token,
      amount: o.amount,
      recipient: o.recipient,
      chainId: o.chainId,
    })),
    {
      permit: {
        permitted: signedFill.permit.permit.permitted,
        nonce: signedFill.permit.permit.nonce,
        deadline: signedFill.permit.permit.deadline,
      },
      owner: signedFill.permit.owner,
      signature: signedFill.permit.signature,
    },
  ],
});

console.log("Fill transaction submitted:", txHash);

// Wait for confirmation
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
console.log("Fill confirmed in block:", receipt.blockNumber);
console.log("Status:", receipt.status);
```

### Testnet Fill (Parmigiana)

```typescript
import {
  UnsignedFill,
  PARMIGIANA,
  parmigianaHost,
  parmigianaRollup,
  validateFill,
  type Output,
} from "@signet-sh/sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0x...");

// Outputs targeting Parmigiana HOST chain
const hostOutputs: Output[] = [
  {
    token: "0x...",
    amount: 1000000000000000000n,
    recipient: "0x...",
    chainId: Number(PARMIGIANA.hostChainId), // Target host
  },
];

// Fill on Parmigiana host
const hostClient = createWalletClient({
  account,
  chain: parmigianaHost,
  transport: http(),
});

const hostFill = await UnsignedFill.new()
  .withOutputs(hostOutputs)
  .withConstants(PARMIGIANA)
  .withChain({
    chainId: PARMIGIANA.hostChainId,
    orderContract: PARMIGIANA.hostOrders,
  })
  .sign(hostClient);

// Outputs targeting Parmigiana ROLLUP chain
const rollupOutputs: Output[] = [
  {
    token: "0x...",
    amount: 1000000000000000000n,
    recipient: "0x...",
    chainId: Number(PARMIGIANA.rollupChainId), // Target rollup
  },
];

// Fill on Parmigiana rollup
const rollupClient = createWalletClient({
  account,
  chain: parmigianaRollup,
  transport: http(),
});

const rollupFill = await UnsignedFill.new()
  .withOutputs(rollupOutputs)
  .withConstants(PARMIGIANA)
  .withChain({
    chainId: PARMIGIANA.rollupChainId,
    orderContract: PARMIGIANA.rollupOrders,
  })
  .sign(rollupClient);

validateFill(hostFill);
validateFill(rollupFill);
```

### Multi-Output Fill

```typescript
import { UnsignedFill, MAINNET, validateFill, type Output } from "@signet-sh/sdk";
import { createWalletClient, http, parseEther, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const account = privateKeyToAccount("0x...");
const client = createWalletClient({
  account,
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});

// Multi-output fill: filler provides multiple tokens
// All outputs must target the same chain
const orderOutputs: Output[] = [
  {
    token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    amount: parseEther("1"),
    recipient: "0x...", // Order maker
    chainId: Number(MAINNET.hostChainId),
  },
  {
    token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
    amount: parseUnits("1000", 6), // 1000 USDC
    recipient: "0x...", // Same or different recipient
    chainId: Number(MAINNET.hostChainId), // Same chain as above
  },
];

const signedFill = await UnsignedFill.new()
  .withOutputs(orderOutputs)
  .withConstants(MAINNET)
  .withChain({
    chainId: MAINNET.hostChainId,
    orderContract: MAINNET.hostOrders,
  })
  .sign(client);

validateFill(signedFill);

console.log("Multi-output fill:");
console.log("  Outputs:", signedFill.outputs.length);
console.log("  Permitted tokens:", signedFill.permit.permit.permitted.length);
```

## Response Format

When generating code:

1. Start with a brief explanation of the fill workflow
2. Provide complete, runnable TypeScript code
3. Add notes about:
   - **Chain selection**: Fill chain must match order output's `chainId`
   - **Token approvals**: Filler must approve Permit2 for fill tokens on the fill chain
   - **Deadline timing**: Fills should have short deadlines (12-60 seconds)
   - **Output matching**: Fill outputs must match order expectations exactly
   - **Contract selection**: Use `hostOrders` for host chain, `rollupOrders` for rollup
