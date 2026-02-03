# signet-fill

Generate TypeScript code for filling Signet orders using @signet-sh/sdk.

## Usage

```
/signet-fill [options]
```

**Options (space-separated):**
- `mainnet` or `testnet` - Target network (default: mainnet)
- `encode` - Include calldata encoding for on-chain submission
- `validate` - Include fill validation
- `submit` - Include transaction submission code

## Background

Fills are the mechanism by which orders get executed:
- **Orders** are created on the rollup chain by users wanting to swap tokens
- **Fills** are created on the host chain by fillers who fulfill those orders
- A filler signs a Permit2 batch transfer allowing the HostOrders contract to take their tokens
- The fill's outputs must match the order's expected outputs

## Instructions

When invoked, generate TypeScript code for filling orders. Always:

1. Import from `@signet-sh/sdk` using explicit type imports
2. Import viem utilities (`createWalletClient`, `http`, `privateKeyToAccount`)
3. Use the fluent builder API (`UnsignedFill.new()...`)
4. Configure for the HOST chain (fills happen on mainnet/host, not rollup)
5. Use `hostOrders` contract address, not `rollupOrders`
6. Include comments explaining the fill workflow
7. Set short deadline (fills should execute quickly, ~12-60 seconds)

## Examples

### Basic Fill

```typescript
import { UnsignedFill, MAINNET, validateFill, type Output } from "@signet-sh/sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

// Configure filler's wallet on HOST chain (mainnet)
const account = privateKeyToAccount("0x..."); // Filler's private key
const client = createWalletClient({
  account,
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});

// Outputs from the order being filled
// These come from the order you're filling - the filler provides these tokens
const orderOutputs: Output[] = [
  {
    token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH on mainnet
    amount: 500000000000000000n, // 0.5 WETH (18 decimals)
    recipient: "0x...", // Original order maker's address
    chainId: Number(MAINNET.rollupChainId), // Destination chain (rollup)
  },
];

// Build and sign fill
const signedFill = await UnsignedFill.new()
  .withOutputs(orderOutputs)
  .withConstants(MAINNET) // Uses slotTime for deadline calculation
  .withChain({
    chainId: MAINNET.hostChainId, // Fill happens on HOST chain
    orderContract: MAINNET.hostOrders, // HostOrders contract
  })
  .sign(client);

// Validate fill structure
validateFill(signedFill);

console.log("Signed fill:", signedFill);
console.log("Fill owner:", signedFill.permit.owner);
console.log("Fill deadline:", signedFill.permit.permit.deadline);
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

// Order outputs to fill
const orderOutputs: Output[] = [
  {
    token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    amount: 1000000000000000000n, // 1 WETH
    recipient: "0x...", // Order maker
    chainId: Number(MAINNET.rollupChainId),
  },
];

// Sign the fill
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

// Simulate the fill transaction
const { request } = await publicClient.simulateContract({
  address: MAINNET.hostOrders,
  abi: [
    {
      type: "function",
      name: "fillPermit2",
      inputs: [
        { name: "outputs", type: "tuple[]", components: [
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "recipient", type: "address" },
          { name: "chainId", type: "uint32" },
        ]},
        { name: "permit2", type: "tuple", components: [
          { name: "permit", type: "tuple", components: [
            { name: "permitted", type: "tuple[]", components: [
              { name: "token", type: "address" },
              { name: "amount", type: "uint256" },
            ]},
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ]},
          { name: "owner", type: "address" },
          { name: "signature", type: "bytes" },
        ]},
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
  ],
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
  account,
});

console.log("Simulation successful, ready to submit");
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
// 1. Sufficient token balance
// 2. Approved Permit2 contract for the tokens being transferred

const orderOutputs: Output[] = [
  {
    token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    amount: parseEther("0.5"),
    recipient: "0x...",
    chainId: Number(MAINNET.rollupChainId),
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
  validateFill,
  type Output,
} from "@signet-sh/sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0x...");
const client = createWalletClient({
  account,
  chain: parmigianaHost,
  transport: http(), // Uses default RPC from chain config
});

const orderOutputs: Output[] = [
  {
    token: "0x...", // Token address on Parmigiana host
    amount: 1000000000000000000n,
    recipient: "0x...",
    chainId: Number(PARMIGIANA.rollupChainId),
  },
];

const signedFill = await UnsignedFill.new()
  .withOutputs(orderOutputs)
  .withConstants(PARMIGIANA)
  .withChain({
    chainId: PARMIGIANA.hostChainId,
    orderContract: PARMIGIANA.hostOrders,
  })
  .sign(client);

validateFill(signedFill);
console.log("Testnet fill:", signedFill);
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
const orderOutputs: Output[] = [
  {
    token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    amount: parseEther("1"),
    recipient: "0x...", // Order maker
    chainId: Number(MAINNET.rollupChainId),
  },
  {
    token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
    amount: parseUnits("1000", 6), // 1000 USDC
    recipient: "0x...", // Same or different recipient
    chainId: Number(MAINNET.rollupChainId),
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
   - **Token approvals**: Filler must approve Permit2 for fill tokens
   - **Deadline timing**: Fills should have short deadlines (12-60 seconds)
   - **Chain context**: Fills execute on host chain, not rollup
   - **Output matching**: Fill outputs must match order expectations exactly
