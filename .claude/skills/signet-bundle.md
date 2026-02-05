# signet-bundle

Generate TypeScript code for creating and submitting Signet bundles using @signet-sh/sdk.

## Usage

```
/signet-bundle [options]
```

**Options (space-separated):**
- `mainnet` or `testnet` - Target network (default: mainnet)
- `call` - Create a CallBundle for simulation instead of EthBundle
- `submit` - Include submission to tx-cache

## ⚠️ CRITICAL SECURITY WARNING ⚠️

**BUNDLES ARE PRIVATE INFORMATION AND MUST BE KEPT SAFE.**

- **NEVER** log bundle contents to public channels or logs
- **NEVER** share bundles with untrusted parties
- **NEVER** store bundles in plaintext in version control
- **NEVER** transmit bundles over unencrypted connections

Bundles contain signed transactions that reveal:
- Your trading strategy and intent
- Transaction ordering preferences
- MEV opportunities you've identified

If a bundle is leaked before inclusion, attackers can:
- Front-run your transactions
- Steal your MEV
- Sandwich attack your trades

**Always treat bundles as sensitive secrets equivalent to private keys.**

## Background

Bundles are atomic transaction packages submitted to block builders:

- **SignetEthBundle**: For `signet_sendBundle` - actual bundle submission
- **SignetCallBundle**: For `signet_callBundle` - simulation only

Key bundle features:
- `txs`: Array of signed, RLP-encoded transactions (in execution order)
- `hostTxs`: Signet-specific field for host chain transactions
- `blockNumber`: Target block for inclusion
- `revertingTxHashes`: Transactions allowed to revert without failing the bundle

## Instructions

When invoked, generate TypeScript code for bundles. Always:

1. Import from `@signet-sh/sdk` using explicit type imports
2. Use the fluent builder API (`SignetEthBundleBuilder.new()...`)
3. Include the security warning in code comments
4. Use `serializeEthBundle()` for JSON-RPC transmission
5. Use `createTxCacheClient()` for submission when `submit` option is used

## Examples

### Basic Bundle Creation

```typescript
import {
  SignetEthBundleBuilder,
  serializeEthBundle,
  type SignetEthBundle,
  type Hex,
} from "@signet-sh/sdk";

// ⚠️ WARNING: Bundles are private! Never log or share bundle contents.

// Signed transaction bytes (from wallet.signTransaction or similar)
const signedTx1: Hex = "0x02f8..."; // Your first signed transaction
const signedTx2: Hex = "0x02f8..."; // Your second signed transaction

// Build the bundle
const bundle: SignetEthBundle = SignetEthBundleBuilder.new()
  .withTx(signedTx1)
  .withTx(signedTx2)
  .withBlockNumber(12345678n) // Target block
  .build();

// Serialize for JSON-RPC transmission
const serialized = serializeEthBundle(bundle);

console.log("Bundle created for block:", bundle.blockNumber);
// ⚠️ Do NOT log serialized bundle contents!
```

### Bundle with Host Transactions

```typescript
import {
  SignetEthBundleBuilder,
  serializeEthBundle,
  type Hex,
} from "@signet-sh/sdk";

// ⚠️ WARNING: Bundles are private! Never log or share bundle contents.

// Rollup transactions
const rollupTx: Hex = "0x02f8...";

// Host chain transactions (Signet-specific)
const hostTx: Hex = "0x02f8...";

const bundle = SignetEthBundleBuilder.new()
  .withTx(rollupTx)
  .withHostTx(hostTx) // Include host chain tx
  .withBlockNumber(12345678n)
  .withMinTimestamp(Math.floor(Date.now() / 1000))
  .withMaxTimestamp(Math.floor(Date.now() / 1000) + 120) // 2 minute window
  .build();

const serialized = serializeEthBundle(bundle);
```

### Bundle with Reverting Transactions

```typescript
import {
  SignetEthBundleBuilder,
  serializeEthBundle,
  type Hex,
} from "@signet-sh/sdk";
import { keccak256 } from "viem";

// ⚠️ WARNING: Bundles are private! Never log or share bundle contents.

const signedTx1: Hex = "0x02f8...";
const signedTx2: Hex = "0x02f8..."; // This tx may revert

// Compute tx hash for the potentially reverting transaction
const tx2Hash = keccak256(signedTx2);

const bundle = SignetEthBundleBuilder.new()
  .withTxs([signedTx1, signedTx2])
  .withBlockNumber(12345678n)
  .withRevertingTxHash(tx2Hash) // Allow tx2 to revert
  .build();

const serialized = serializeEthBundle(bundle);
```

### Submit Bundle to Tx-Cache

```typescript
import {
  SignetEthBundleBuilder,
  createTxCacheClient,
  PARMIGIANA,
  type Hex,
} from "@signet-sh/sdk";

// ⚠️ WARNING: Bundles are private! Never log or share bundle contents.
// Only submit to trusted endpoints over HTTPS.

const signedTx: Hex = "0x02f8...";

const bundle = SignetEthBundleBuilder.new()
  .withTx(signedTx)
  .withBlockNumber(12345678n)
  .build();

// Create client for tx-cache
// For testnet (Parmigiana):
const txCache = createTxCacheClient("https://tx.parmigiana.signet.sh");

// For mainnet:
// const txCache = createTxCacheClient("https://tx.signet.sh");

// Submit bundle
const response = await txCache.submitBundle(bundle);
console.log("Bundle submitted, ID:", response.id);
// ⚠️ Store the bundle ID securely for tracking
```

### Bundle Replacement

```typescript
import {
  SignetEthBundleBuilder,
  createTxCacheClient,
  type Hex,
} from "@signet-sh/sdk";
import { randomUUID } from "crypto";

// ⚠️ WARNING: Bundles are private! Never log or share bundle contents.

// Generate a stable UUID for bundle replacement
const bundleUuid = randomUUID();

// Original bundle
const originalTx: Hex = "0x02f8...";
const originalBundle = SignetEthBundleBuilder.new()
  .withTx(originalTx)
  .withBlockNumber(12345678n)
  .withReplacementUuid(bundleUuid)
  .build();

// Submit original
const txCache = createTxCacheClient("https://tx.signet.sh");
await txCache.submitBundle(originalBundle);

// Later: replacement bundle with better gas price
const replacementTx: Hex = "0x02f8..."; // Same nonce, higher gas
const replacementBundle = SignetEthBundleBuilder.new()
  .withTx(replacementTx)
  .withBlockNumber(12345678n)
  .withReplacementUuid(bundleUuid) // Same UUID replaces original
  .build();

await txCache.submitBundle(replacementBundle);
console.log("Bundle replaced");
```

### Call Bundle (Simulation)

```typescript
import {
  SignetCallBundleBuilder,
  serializeCallBundle,
  deserializeCallBundleResponse,
  type Hex,
  type SerializedSignetCallBundleResponse,
} from "@signet-sh/sdk";

// ⚠️ WARNING: Even simulation bundles reveal strategy. Keep private.

const signedTx: Hex = "0x02f8...";

const callBundle = SignetCallBundleBuilder.new()
  .withTx(signedTx)
  .withBlockNumber(12345679n) // Simulate at future block
  .withStateBlockNumber("latest") // Fork from latest state
  .withTimeout(30) // 30 second simulation timeout
  .build();

const serialized = serializeCallBundle(callBundle);

// Submit to simulation endpoint (example with fetch)
const response = await fetch("https://rpc.signet.sh", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    method: "signet_callBundle",
    params: [serialized],
    id: 1,
  }),
});

const json = await response.json();
const result = deserializeCallBundleResponse(
  json.result as SerializedSignetCallBundleResponse
);

console.log("Simulation results:");
console.log("  Total gas used:", result.totalGasUsed);
console.log("  Coinbase diff:", result.coinbaseDiff);
console.log("  Transaction results:", result.results.length);
```

### Full Workflow: Sign, Bundle, Submit

```typescript
import {
  SignetEthBundleBuilder,
  createTxCacheClient,
  MAINNET,
} from "@signet-sh/sdk";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

// ⚠️ CRITICAL: Bundles are private information!
// - Never log bundle contents
// - Never share with untrusted parties
// - Only submit over HTTPS to trusted endpoints

const account = privateKeyToAccount("0x...");
const client = createWalletClient({
  account,
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});

// Get current block for targeting
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});
const currentBlock = await publicClient.getBlockNumber();
const targetBlock = currentBlock + 2n; // Target 2 blocks ahead

// Sign a transaction
const signedTx = await client.signTransaction({
  to: "0x...",
  value: parseEther("0.1"),
  gas: 21000n,
  maxFeePerGas: parseGwei("50"),
  maxPriorityFeePerGas: parseGwei("2"),
});

// Build bundle
const bundle = SignetEthBundleBuilder.new()
  .withTx(signedTx)
  .withBlockNumber(targetBlock)
  .build();

// Submit to tx-cache
const txCache = createTxCacheClient("https://tx.signet.sh");
const response = await txCache.submitBundle(bundle);

console.log("Bundle submitted for block", targetBlock);
console.log("Bundle ID:", response.id);
// Store bundle ID securely for status tracking
```

## Response Format

When generating code:

1. **Always include the security warning** at the top of generated code
2. Provide complete, runnable TypeScript code
3. Add notes about:
   - **Security**: Emphasize bundle privacy
   - **Block targeting**: How to choose target block
   - **Error handling**: What can go wrong
   - **Replacement**: How to update bundles if needed
