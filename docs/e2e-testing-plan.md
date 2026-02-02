# E2E Testing Plan for Signet SDK

This document describes the requirements for running full end-to-end tests of the Signet SDK against the Parmigiana testnet with real Permit2 flows.

## Overview

The current integration tests verify:

- Order signing produces valid signatures
- Call encoding is accepted by the RPC
- Witness hash computation matches on-chain

To complete a full e2e test where `initiatePermit2` succeeds, we need:

1. A funded test account with ERC20 tokens
2. ERC20 approval to Permit2
3. Valid Permit2 signature (already implemented)

## Required Setup

### Test Account

Use a dedicated test wallet with the following:

| Item        | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Address     | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (Anvil default)         |
| Private Key | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |

**Note**: This is the well-known Anvil/Hardhat test key. Never use for real funds.

### Token Requirements

The test account needs ERC20 tokens on the **Parmigiana rollup** (chain ID: 88888).

#### Option A: Use existing testnet tokens

| Token              | Address                                      | Decimals | Required Balance |
| ------------------ | -------------------------------------------- | -------- | ---------------- |
| WUSD (Wrapped USD) | `0x0000000000000000007369676e65742D77757364` | 18       | ~100 tokens      |

#### Option B: Deploy a test token

Deploy a simple ERC20 with a public mint function:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    constructor() ERC20("Test Token", "TEST") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

### Permit2 Approval

Before running e2e tests, the test account must approve Permit2 to spend tokens:

```typescript
import { parseUnits } from "viem";

// Permit2 address (same on all EVM chains)
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

// Approve Permit2 to spend tokens (do this once)
await walletClient.writeContract({
  address: TOKEN_ADDRESS,
  abi: erc20Abi,
  functionName: "approve",
  args: [PERMIT2_ADDRESS, parseUnits("1000000", 18)], // Large approval
});
```

## Contract Addresses

### Parmigiana Rollup (Chain ID: 88888)

| Contract     | Address                                      |
| ------------ | -------------------------------------------- |
| RollupOrders | `0x000000000000007369676E65742D6f7264657273` |
| Permit2      | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |

### Parmigiana Host (Chain ID: 3018788)

| Contract   | Address                                      |
| ---------- | -------------------------------------------- |
| HostOrders | `0x000000000000007369676E65742D6f7264657273` |
| Permit2    | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |

## Test Flow

Once the account is funded and Permit2 is approved:

```typescript
import { parseUnits } from "viem";
import { UnsignedOrder, PARMIGIANA } from "@signet-sh/sdk";

// 1. Create and sign an order
const signedOrder = await UnsignedOrder.new()
  .withInput(TOKEN_ADDRESS, parseUnits("10", 18))
  .withOutput(
    TOKEN_ADDRESS,
    parseUnits("9.9", 18),
    recipientAddress,
    Number(PARMIGIANA.hostChainId)
  )
  .withDeadline(BigInt(Math.floor(Date.now() / 1000) + 3600))
  .withNonce(BigInt(Date.now()))
  .withChain({
    chainId: PARMIGIANA.rollupChainId,
    orderContract: PARMIGIANA.rollupOrders,
  })
  .sign(walletClient);

// 2. Submit the order (as a filler)
const txHash = await walletClient.writeContract({
  address: PARMIGIANA.rollupOrders,
  abi: rollupOrdersAbi,
  functionName: "initiatePermit2",
  args: [
    fillerAddress, // tokenRecipient - receives the input tokens
    signedOrder.outputs,
    {
      permit: signedOrder.permit.permit,
      owner: signedOrder.permit.owner,
      signature: signedOrder.permit.signature,
    },
  ],
});

console.log("Order submitted:", txHash);
```

## Expected Errors

When setup is incomplete, you'll see these errors:

| Error                   | Cause                     | Fix                                     |
| ----------------------- | ------------------------- | --------------------------------------- |
| `TRANSFER_FROM_FAILED`  | No token balance          | Fund the test account                   |
| `InsufficientAllowance` | No Permit2 approval       | Call `token.approve(PERMIT2, amount)`   |
| `InvalidSigner`         | Wrong signer or signature | Verify signing key matches permit owner |
| `InvalidNonce`          | Nonce already used        | Use a fresh nonce (timestamp works)     |
| `SignatureExpired`      | Deadline passed           | Use future deadline                     |

## Running E2E Tests

### Environment Variables

| Variable             | Required | Description                                           |
| -------------------- | -------- | ----------------------------------------------------- |
| `PARMIGIANA_RPC_URL` | Yes      | RPC URL for the Parmigiana rollup                     |
| `TEST_TOKEN_ADDRESS` | For e2e  | ERC20 token address with balance and Permit2 approval |

### Commands

```bash
# Run simulation-only tests (no funding required)
export PARMIGIANA_RPC_URL=https://rpc.parmigiana.signet.sh
npm run test:run -- integration.test.ts

# Run full e2e tests (requires funded account)
export PARMIGIANA_RPC_URL=https://rpc.parmigiana.signet.sh
export TEST_TOKEN_ADDRESS=0x0000000000000000007369676e65742D77757364  # WUSD or your test token
npm run test:run -- integration.test.ts
```

### Test Suites

The integration test file contains two test suites:

1. **"Parmigiana integration tests"** - Runs with `PARMIGIANA_RPC_URL` only
   - Creates signed orders and verifies encoding
   - Uses `eth_call` simulation (no actual transactions)

2. **"E2E Permit2 tests"** - Runs with both `PARMIGIANA_RPC_URL` and `TEST_TOKEN_ADDRESS`
   - Verifies token balance and Permit2 approval
   - Submits real `initiatePermit2` transaction
   - Verifies transaction success and event emission

## Checklist

Before running full e2e tests:

- [ ] Test account has native token for gas (if needed)
- [ ] Test account has ERC20 token balance
- [ ] Test account has approved Permit2 for the ERC20 token
- [ ] RPC URL is accessible
- [ ] Permit2 contract is deployed on the target chain
- [ ] RollupOrders contract is deployed on the target chain
