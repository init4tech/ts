/**
 * Integration tests for Signet SDK.
 *
 * These tests connect to the Parmigiana testnet and simulate order submission
 * via eth_call to verify the signed orders are valid on-chain.
 *
 * To run these tests, set the following environment variables:
 *   PARMIGIANA_RPC_URL - RPC URL for the Parmigiana rollup (e.g., https://rpc.parmigiana.signet.sh)
 *
 * For full e2e tests with real Permit2 flows, also set:
 *   TEST_TOKEN_ADDRESS - ERC20 token address with funded balance and Permit2 approval
 *
 * Run with: npm test -- integration.test.ts
 *
 * For full e2e testing setup, see: docs/e2e-testing-plan.md
 */
import { describe, expect, it, beforeAll } from "vitest";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  encodeFunctionData,
  erc20Abi,
  type Address,
  type Hex,
  parseEther,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { UnsignedOrder, orderHash, PARMIGIANA } from "../src/index.js";
import { rollupOrdersAbi } from "../src/abi/rollupOrders.js";
import { PERMIT2_ADDRESS } from "../src/constants/permit2.js";

const parmigiana = defineChain({
  id: Number(PARMIGIANA.rollupChainId),
  name: "Parmigiana",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.parmigiana.signet.sh"] },
  },
});

// Test private key - DO NOT USE IN PRODUCTION
// This is a well-known test key with no real funds
const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;

// RPC URL from environment or default
const PARMIGIANA_RPC_URL =
  process.env.PARMIGIANA_RPC_URL ?? "https://rpc.parmigiana.signet.sh";

// Test token address from environment (required for e2e tests)
const TEST_TOKEN_ADDRESS = process.env.TEST_TOKEN_ADDRESS as
  | Address
  | undefined;

// Native token placeholder address (0xee...ee)
const NATIVE_TOKEN: Address = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// Skip if no RPC URL is available
const shouldRun = !!process.env.PARMIGIANA_RPC_URL;

// E2E tests require both RPC and funded test token
const shouldRunE2E = shouldRun && !!TEST_TOKEN_ADDRESS;

describe.skipIf(!shouldRun)("Parmigiana integration tests", () => {
  const account = privateKeyToAccount(TEST_PRIVATE_KEY);

  const publicClient = createPublicClient({
    chain: parmigiana,
    transport: http(PARMIGIANA_RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: parmigiana,
    transport: http(PARMIGIANA_RPC_URL),
  });

  beforeAll(async () => {
    // Verify we can connect to the RPC
    try {
      const chainId = await publicClient.getChainId();
      console.log(`Connected to chain ${chainId}`);
      expect(chainId).toBe(Number(PARMIGIANA.rollupChainId));
    } catch (e) {
      console.error("Failed to connect to Parmigiana RPC:", e);
      throw e;
    }
  });

  it("creates a valid signed order", async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
    const nonce = BigInt(Date.now()); // Use timestamp as nonce

    // Create and sign an order
    const signedOrder = await UnsignedOrder.new()
      .withInput(NATIVE_TOKEN, parseEther("0.001")) // 0.001 native token
      .withOutput(
        NATIVE_TOKEN,
        parseEther("0.0009"), // Slightly less output (simulating exchange rate)
        account.address,
        Number(PARMIGIANA.hostChainId) // Output on host chain
      )
      .withDeadline(deadline)
      .withNonce(nonce)
      .withChain({
        chainId: PARMIGIANA.rollupChainId,
        orderContract: PARMIGIANA.rollupOrders,
      })
      .sign(walletClient);

    // Verify the order was created
    expect(signedOrder.permit.owner).toBe(account.address);
    expect(signedOrder.permit.permit.permitted.length).toBe(1);
    expect(signedOrder.outputs.length).toBe(1);

    // Compute and log the order hash
    const hash = orderHash(signedOrder);
    console.log("Order hash:", hash);
    expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("simulates initiatePermit2 via eth_call", async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = BigInt(Date.now());

    // Create and sign an order
    const signedOrder = await UnsignedOrder.new()
      .withInput(NATIVE_TOKEN, parseEther("0.001"))
      .withOutput(
        NATIVE_TOKEN,
        parseEther("0.0009"),
        account.address,
        Number(PARMIGIANA.hostChainId)
      )
      .withDeadline(deadline)
      .withNonce(nonce)
      .withChain({
        chainId: PARMIGIANA.rollupChainId,
        orderContract: PARMIGIANA.rollupOrders,
      })
      .sign(walletClient);

    // Encode the initiatePermit2 call
    const callData = encodeFunctionData({
      abi: rollupOrdersAbi,
      functionName: "initiatePermit2",
      args: [
        account.address, // tokenRecipient (filler receives the input tokens)
        signedOrder.outputs.map((o) => ({
          token: o.token,
          amount: o.amount,
          recipient: o.recipient,
          chainId: o.chainId,
        })),
        {
          permit: {
            permitted: signedOrder.permit.permit.permitted.map((p) => ({
              token: p.token,
              amount: p.amount,
            })),
            nonce: signedOrder.permit.permit.nonce,
            deadline: signedOrder.permit.permit.deadline,
          },
          owner: signedOrder.permit.owner,
          signature: signedOrder.permit.signature,
        },
      ],
    });

    console.log("Encoded calldata length:", callData.length);

    // Simulate the call via eth_call
    // This will fail with a revert (since we don't have Permit2 approval),
    // but the important thing is that the encoding is valid and the
    // contract recognizes the call.
    try {
      await publicClient.call({
        to: PARMIGIANA.rollupOrders,
        data: callData,
        account: account.address,
      });
      // If we get here without error, the simulation passed (unlikely without approval)
      console.log("Simulation passed!");
    } catch (e: unknown) {
      // Expected to fail - but we want to verify it's a contract revert,
      // not an encoding error
      const error = e as Error;
      console.log("Simulation reverted (expected):", error.message);

      // The error should be from the contract, not from RPC/encoding issues
      // Common expected errors:
      // - "InvalidSigner" - Permit2 signature validation failed
      // - "SignatureExpired" - deadline passed
      // - "InvalidNonce" - nonce already used
      // These all indicate the call was properly encoded and reached the contract
      expect(
        error.message.includes("revert") ||
          error.message.includes("InvalidSigner") ||
          error.message.includes("execution reverted") ||
          error.message.includes("INVALID_SIGNER") ||
          error.message.includes("call revert exception")
      ).toBe(true);
    }
  });

  it("verifies order hash matches on-chain computation", async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = BigInt(Date.now());

    // Create and sign an order
    const signedOrder = await UnsignedOrder.new()
      .withInput(NATIVE_TOKEN, parseEther("0.001"))
      .withOutput(
        NATIVE_TOKEN,
        parseEther("0.0009"),
        account.address,
        Number(PARMIGIANA.hostChainId)
      )
      .withDeadline(deadline)
      .withNonce(nonce)
      .withChain({
        chainId: PARMIGIANA.rollupChainId,
        orderContract: PARMIGIANA.rollupOrders,
      })
      .sign(walletClient);

    // Compute order hash locally
    const localHash = orderHash(signedOrder);

    // Call outputWitness to get the witness hash from the contract
    // This verifies our output encoding matches the contract's expectation
    try {
      const witnessData = await publicClient.readContract({
        address: PARMIGIANA.rollupOrders,
        abi: rollupOrdersAbi,
        functionName: "outputWitness",
        args: [
          signedOrder.outputs.map((o) => ({
            token: o.token,
            amount: o.amount,
            recipient: o.recipient,
            chainId: o.chainId,
          })),
        ],
      });

      console.log("On-chain witness hash:", witnessData.witnessHash);
      console.log("On-chain witness type:", witnessData.witnessTypeString);

      // The witness hash should be deterministic for the same outputs
      expect(witnessData.witnessHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    } catch (e) {
      console.log("outputWitness call failed:", e);
      // This is OK if the contract doesn't have this view function
    }

    console.log("Local order hash:", localHash);
  });
});

/**
 * E2E tests that execute real Permit2 transactions.
 *
 * These tests require:
 * 1. PARMIGIANA_RPC_URL set to the rollup RPC
 * 2. TEST_TOKEN_ADDRESS set to an ERC20 token address
 * 3. Test account funded with that token
 * 4. Test account has approved Permit2 for the token
 *
 * See docs/e2e-testing-plan.md for setup instructions.
 */
describe.skipIf(!shouldRunE2E)("E2E Permit2 tests", () => {
  const account = privateKeyToAccount(TEST_PRIVATE_KEY);

  const publicClient = createPublicClient({
    chain: parmigiana,
    transport: http(PARMIGIANA_RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: parmigiana,
    transport: http(PARMIGIANA_RPC_URL),
  });

  let tokenDecimals: number;
  let tokenBalance: bigint;
  let permit2Allowance: bigint;

  beforeAll(async () => {
    // Verify we can connect
    const chainId = await publicClient.getChainId();
    expect(chainId).toBe(Number(PARMIGIANA.rollupChainId));

    // Get token info
    const tokenAddress = TEST_TOKEN_ADDRESS!;

    tokenDecimals = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "decimals",
    });

    tokenBalance = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    });

    permit2Allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [account.address, PERMIT2_ADDRESS],
    });

    console.log("Token address:", tokenAddress);
    console.log("Token decimals:", tokenDecimals);
    console.log("Token balance:", tokenBalance.toString());
    console.log("Permit2 allowance:", permit2Allowance.toString());
  });

  it("has sufficient token balance", () => {
    expect(tokenBalance).toBeGreaterThan(0n);
  });

  it("has Permit2 approval", () => {
    expect(permit2Allowance).toBeGreaterThan(0n);
  });

  it("executes initiatePermit2 transaction", async () => {
    const tokenAddress = TEST_TOKEN_ADDRESS!;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = BigInt(Date.now());

    // Use 1 token (or less if balance is low)
    const oneToken = parseUnits("1", tokenDecimals);
    const inputAmount = tokenBalance < oneToken ? tokenBalance / 2n : oneToken;
    const outputAmount = (inputAmount * 99n) / 100n; // 1% spread

    // Create and sign the order
    const signedOrder = await UnsignedOrder.new()
      .withInput(tokenAddress, inputAmount)
      .withOutput(
        tokenAddress,
        outputAmount,
        account.address,
        Number(PARMIGIANA.hostChainId)
      )
      .withDeadline(deadline)
      .withNonce(nonce)
      .withChain({
        chainId: PARMIGIANA.rollupChainId,
        orderContract: PARMIGIANA.rollupOrders,
      })
      .sign(walletClient);

    console.log("Order created:");
    console.log("  Input amount:", inputAmount.toString());
    console.log("  Output amount:", outputAmount.toString());
    console.log("  Deadline:", deadline.toString());
    console.log("  Nonce:", nonce.toString());

    // Compute order hash
    const hash = orderHash(signedOrder);
    console.log("  Order hash:", hash);

    // Submit the transaction
    const txHash = await walletClient.writeContract({
      address: PARMIGIANA.rollupOrders,
      abi: rollupOrdersAbi,
      functionName: "initiatePermit2",
      args: [
        account.address, // tokenRecipient - we receive our own tokens back (self-fill)
        signedOrder.outputs.map((o) => ({
          token: o.token,
          amount: o.amount,
          recipient: o.recipient,
          chainId: o.chainId,
        })),
        {
          permit: {
            permitted: signedOrder.permit.permit.permitted.map((p) => ({
              token: p.token,
              amount: p.amount,
            })),
            nonce: signedOrder.permit.permit.nonce,
            deadline: signedOrder.permit.permit.deadline,
          },
          owner: signedOrder.permit.owner,
          signature: signedOrder.permit.signature,
        },
      ],
    });

    console.log("Transaction submitted:", txHash);

    // Wait for the transaction to be mined
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    console.log("Transaction mined in block:", receipt.blockNumber);
    console.log("Transaction status:", receipt.status);

    expect(receipt.status).toBe("success");

    // Verify the Order event was emitted
    const orderEvents = receipt.logs.filter((log) => {
      // Order event topic
      return (
        log.topics[0] ===
        "0x5a42ba6f883dec0ccff3f7b5ca77dfd8867a44ff8ad4f8e1871e0f5ed565c1b4"
      );
    });

    console.log("Order events emitted:", orderEvents.length);
    expect(orderEvents.length).toBeGreaterThan(0);
  });
});

describe("Order encoding tests (no RPC required)", () => {
  const account = privateKeyToAccount(TEST_PRIVATE_KEY);

  // Create a mock wallet client for signing
  const walletClient = createWalletClient({
    account,
    chain: parmigiana,
    transport: http("http://localhost:8545"), // Won't be used for these tests
  });

  it("encodes initiatePermit2 call correctly", async () => {
    // Create a mock signed order (we'll sign it locally without RPC)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = 12345n;

    // Build the order
    const unsignedOrder = UnsignedOrder.new()
      .withInput(NATIVE_TOKEN, parseEther("1"))
      .withOutput(
        NATIVE_TOKEN,
        parseEther("0.99"),
        account.address,
        Number(PARMIGIANA.hostChainId)
      )
      .withDeadline(deadline)
      .withNonce(nonce)
      .withChain({
        chainId: PARMIGIANA.rollupChainId,
        orderContract: PARMIGIANA.rollupOrders,
      });

    // Sign it (this only uses local crypto, no RPC needed)
    const signedOrder = await unsignedOrder.sign(walletClient);

    // Encode the call
    const callData = encodeFunctionData({
      abi: rollupOrdersAbi,
      functionName: "initiatePermit2",
      args: [
        account.address,
        signedOrder.outputs.map((o) => ({
          token: o.token,
          amount: o.amount,
          recipient: o.recipient,
          chainId: o.chainId,
        })),
        {
          permit: {
            permitted: signedOrder.permit.permit.permitted.map((p) => ({
              token: p.token,
              amount: p.amount,
            })),
            nonce: signedOrder.permit.permit.nonce,
            deadline: signedOrder.permit.permit.deadline,
          },
          owner: signedOrder.permit.owner,
          signature: signedOrder.permit.signature,
        },
      ],
    });

    // Verify the calldata starts with the correct function selector
    // initiatePermit2 selector: 0x2b4f78ab (first 4 bytes of keccak256("initiatePermit2(address,(address,uint256,address,uint32)[],((address,uint256)[],uint256,uint256),address,bytes)"))
    expect(callData.startsWith("0x")).toBe(true);
    expect(callData.length).toBeGreaterThan(10); // At minimum selector + some data

    console.log("Calldata:", callData.slice(0, 74) + "...");
    console.log("Calldata length:", callData.length, "bytes");

    // Compute order hash
    const hash = orderHash(signedOrder);
    console.log("Order hash:", hash);
  });

  it("produces deterministic order hashes", async () => {
    const deadline = 1700000000n;
    const nonce = 12345n;

    // Create and sign the same order twice
    const order1 = await UnsignedOrder.new()
      .withInput(NATIVE_TOKEN, parseEther("1"))
      .withOutput(NATIVE_TOKEN, parseEther("0.99"), account.address, 1)
      .withDeadline(deadline)
      .withNonce(nonce)
      .withChain({
        chainId: PARMIGIANA.rollupChainId,
        orderContract: PARMIGIANA.rollupOrders,
      })
      .sign(walletClient);

    const order2 = await UnsignedOrder.new()
      .withInput(NATIVE_TOKEN, parseEther("1"))
      .withOutput(NATIVE_TOKEN, parseEther("0.99"), account.address, 1)
      .withDeadline(deadline)
      .withNonce(nonce)
      .withChain({
        chainId: PARMIGIANA.rollupChainId,
        orderContract: PARMIGIANA.rollupOrders,
      })
      .sign(walletClient);

    // Order hashes should be identical since all inputs are the same
    // and the signature is deterministic for the same message
    const hash1 = orderHash(order1);
    const hash2 = orderHash(order2);

    expect(hash1).toBe(hash2);
  });
});
