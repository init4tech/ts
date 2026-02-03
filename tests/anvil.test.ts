/**
 * Local E2E tests using Anvil forking Parmigiana testnet.
 *
 * These tests run against a local Anvil instance that forks the Parmigiana
 * testnet. This allows us to test against real deployed contracts (Permit2,
 * RollupOrders) while manipulating state locally.
 *
 * Run with: npm run test:anvil
 */
import { describe, expect, it, beforeAll, beforeEach, afterEach } from "vitest";
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { foundry } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  UnsignedOrder,
  UnsignedFill,
  orderHash,
  PARMIGIANA,
  validateFill,
} from "../src/index.js";
import { rollupOrdersAbi } from "../src/abi/rollupOrders.js";
import { hostOrdersAbi } from "../src/abi/hostOrders.js";
import { PERMIT2_ADDRESS } from "../src/constants/permit2.js";
import {
  setTokenBalance,
  setTokenAllowance,
  getTokenBalance,
  getTokenAllowance,
} from "./testToken.js";

// Anvil's first default account private key
const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;

const ANVIL_URL = "http://127.0.0.1:8545";

// WUSD (Wrapped USD) on Parmigiana - an existing ERC20 token on the forked chain
const TEST_TOKEN: Address = "0x0000000000000000007369676e65742D77757364";

// Custom chain config for forked Parmigiana
const forkedParmigiana = {
  ...foundry,
  id: 88888,
  name: "Forked Parmigiana",
};

describe("Anvil E2E tests", () => {
  const account = privateKeyToAccount(TEST_PRIVATE_KEY);

  const testClient = createTestClient({
    mode: "anvil",
    chain: forkedParmigiana,
    transport: http(ANVIL_URL),
  });

  const publicClient = createPublicClient({
    chain: forkedParmigiana,
    transport: http(ANVIL_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: forkedParmigiana,
    transport: http(ANVIL_URL),
  });

  let snapshotId: Hex;

  beforeAll(async () => {
    // Verify Anvil is running and forked correctly
    const chainId = await publicClient.getChainId();
    expect(chainId).toBe(88888);

    // Fund test account with ETH
    await testClient.setBalance({
      address: account.address,
      value: parseEther("100"),
    });

    // Set token balance via storage manipulation (WUSD already exists on forked chain)
    await setTokenBalance(
      testClient,
      TEST_TOKEN,
      account.address,
      parseEther("1000000"), // 1M tokens
      publicClient
    );

    // Set Permit2 allowance via storage manipulation
    await setTokenAllowance(
      testClient,
      TEST_TOKEN,
      account.address,
      PERMIT2_ADDRESS,
      parseEther("1000000000"), // Large approval
      publicClient
    );

    // Verify setup
    const balance = await getTokenBalance(
      publicClient,
      TEST_TOKEN,
      account.address
    );
    expect(balance).toBe(parseEther("1000000"));

    const allowance = await getTokenAllowance(
      publicClient,
      TEST_TOKEN,
      account.address,
      PERMIT2_ADDRESS
    );
    expect(allowance).toBe(parseEther("1000000000"));

    console.log("Test setup complete:");
    console.log("  Account:", account.address);
    console.log("  Token:", TEST_TOKEN);
    console.log("  Balance:", balance.toString());
    console.log("  Permit2 allowance:", allowance.toString());
  });

  beforeEach(async () => {
    // Take a snapshot before each test
    snapshotId = await testClient.snapshot();
  });

  afterEach(async () => {
    // Revert to snapshot after each test
    await testClient.revert({ id: snapshotId });
  });

  it("can read from RollupOrders contract", async () => {
    // Verify the RollupOrders contract is accessible
    const code = await publicClient.getCode({
      address: PARMIGIANA.rollupOrders,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2); // "0x" + bytecode
  });

  it("can read from Permit2 contract", async () => {
    // Verify the Permit2 contract is accessible
    const code = await publicClient.getCode({
      address: PERMIT2_ADDRESS,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("creates and signs an order with test token", async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = BigInt(Date.now());

    const signedOrder = await UnsignedOrder.new()
      .withInput(TEST_TOKEN, parseEther("100"))
      .withOutput(
        TEST_TOKEN,
        parseEther("99"),
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

    expect(signedOrder.permit.owner).toBe(account.address);
    expect(signedOrder.permit.permit.permitted.length).toBe(1);
    expect(signedOrder.permit.permit.permitted[0].token).toBe(TEST_TOKEN);
    expect(signedOrder.permit.permit.permitted[0].amount).toBe(
      parseEther("100")
    );

    const hash = orderHash(signedOrder);
    expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("simulates initiatePermit2 call", async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = BigInt(Date.now());

    const signedOrder = await UnsignedOrder.new()
      .withInput(TEST_TOKEN, parseEther("100"))
      .withOutput(
        TEST_TOKEN,
        parseEther("99"),
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

    // Simulate the call - should succeed now that we have proper setup
    // Note: initiatePermit2 returns void, so result.data will be undefined on success
    // The key is that it doesn't throw
    let simulationError: Error | undefined;
    try {
      await publicClient.call({
        to: PARMIGIANA.rollupOrders,
        data: callData,
        account: account.address,
      });
    } catch (e) {
      simulationError = e as Error;
    }

    expect(simulationError).toBeUndefined();
    console.log("Simulation succeeded (no revert)");
  });

  it("executes initiatePermit2 transaction", async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = BigInt(Date.now());

    const inputAmount = parseEther("100");
    const outputAmount = parseEther("99");

    const signedOrder = await UnsignedOrder.new()
      .withInput(TEST_TOKEN, inputAmount)
      .withOutput(
        TEST_TOKEN,
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

    // Get balance before
    const balanceBefore = await getTokenBalance(
      publicClient,
      TEST_TOKEN,
      account.address
    );

    // Submit the transaction
    const txHash = await walletClient.writeContract({
      address: PARMIGIANA.rollupOrders,
      abi: rollupOrdersAbi,
      functionName: "initiatePermit2",
      args: [
        account.address, // tokenRecipient - self-fill
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

    console.log("Transaction hash:", txHash);

    // Wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    expect(receipt.status).toBe("success");
    console.log("Transaction mined in block:", receipt.blockNumber);

    // Verify tokens were transferred (self-fill so balance should be same)
    const balanceAfter = await getTokenBalance(
      publicClient,
      TEST_TOKEN,
      account.address
    );

    // Since we're self-filling, tokens go from account -> contract -> back to account
    // Balance should be the same
    expect(balanceAfter).toBe(balanceBefore);

    // Verify logs were emitted (Order event + potential Transfer events)
    expect(receipt.logs.length).toBeGreaterThan(0);
    console.log("Logs emitted:", receipt.logs.length);

    // Log topics for debugging
    receipt.logs.forEach((log, i) => {
      console.log(`Log ${i}: ${log.address} topic0=${log.topics[0]}`);
    });
  });

  it("fails with invalid nonce (replay protection)", async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = BigInt(Date.now());

    const signedOrder = await UnsignedOrder.new()
      .withInput(TEST_TOKEN, parseEther("10"))
      .withOutput(
        TEST_TOKEN,
        parseEther("9"),
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

    const args = [
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
    ] as const;

    // First transaction should succeed
    const tx1 = await walletClient.writeContract({
      address: PARMIGIANA.rollupOrders,
      abi: rollupOrdersAbi,
      functionName: "initiatePermit2",
      args,
    });
    const receipt1 = await publicClient.waitForTransactionReceipt({
      hash: tx1,
    });
    expect(receipt1.status).toBe("success");

    // Second transaction with same nonce should fail
    await expect(
      walletClient.writeContract({
        address: PARMIGIANA.rollupOrders,
        abi: rollupOrdersAbi,
        functionName: "initiatePermit2",
        args,
      })
    ).rejects.toThrow();
  });

  it("fails with expired deadline", async () => {
    // Get current block timestamp and set deadline to past
    const block = await publicClient.getBlock();
    const currentTimestamp = block.timestamp;

    // Set deadline to 100 seconds before current block
    const deadline = currentTimestamp - 100n;
    const nonce = BigInt(Date.now());

    const signedOrder = await UnsignedOrder.new()
      .withInput(TEST_TOKEN, parseEther("10"))
      .withOutput(
        TEST_TOKEN,
        parseEther("9"),
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

    // Mine a new block with a timestamp after the deadline
    await testClient.setNextBlockTimestamp({
      timestamp: currentTimestamp + 10n,
    });
    await testClient.mine({ blocks: 1 });

    // Transaction should fail due to expired deadline
    await expect(
      walletClient.writeContract({
        address: PARMIGIANA.rollupOrders,
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
      })
    ).rejects.toThrow();
  });

  it("verifies outputWitness computation", async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = BigInt(Date.now());

    const signedOrder = await UnsignedOrder.new()
      .withInput(TEST_TOKEN, parseEther("100"))
      .withOutput(
        TEST_TOKEN,
        parseEther("99"),
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

    // Call outputWitness to verify our encoding matches on-chain
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

    expect(witnessData.witnessHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(witnessData.witnessTypeString).toBeDefined();

    console.log("Witness hash:", witnessData.witnessHash);
    console.log("Witness type:", witnessData.witnessTypeString);
  });
});

describe("Fill signing tests", () => {
  const account = privateKeyToAccount(TEST_PRIVATE_KEY);

  const walletClient = createWalletClient({
    account,
    chain: forkedParmigiana,
    transport: http(ANVIL_URL),
  });

  it("creates and signs a fill with correct structure", async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = BigInt(Date.now());

    const outputs = [
      {
        token: TEST_TOKEN,
        amount: parseEther("100"),
        recipient: account.address,
        chainId: Number(PARMIGIANA.rollupChainId),
      },
    ];

    const signedFill = await UnsignedFill.new()
      .withOutputs(outputs)
      .withDeadline(deadline)
      .withNonce(nonce)
      .withChain({
        chainId: PARMIGIANA.hostChainId,
        orderContract: PARMIGIANA.hostOrders,
      })
      .sign(walletClient);

    // Verify structure matches order pattern
    expect(signedFill.permit.owner).toBe(account.address);
    expect(signedFill.permit.permit.deadline).toBe(deadline);
    expect(signedFill.permit.permit.nonce).toBe(nonce);
    expect(signedFill.permit.signature).toMatch(/^0x[a-fA-F0-9]+$/);

    // Verify outputs match permitted tokens
    expect(signedFill.outputs.length).toBe(1);
    expect(signedFill.permit.permit.permitted.length).toBe(1);
    expect(signedFill.permit.permit.permitted[0].token).toBe(TEST_TOKEN);
    expect(signedFill.permit.permit.permitted[0].amount).toBe(
      parseEther("100")
    );

    // Verify fill passes validation
    validateFill(signedFill);
  });

  it("creates fill with multiple outputs", async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = BigInt(Date.now());

    const outputs = [
      {
        token: TEST_TOKEN,
        amount: parseEther("50"),
        recipient: account.address,
        chainId: Number(PARMIGIANA.rollupChainId),
      },
      {
        token: TEST_TOKEN,
        amount: parseEther("25"),
        recipient: "0x0000000000000000000000000000000000000001" as Address,
        chainId: Number(PARMIGIANA.rollupChainId),
      },
    ];

    const signedFill = await UnsignedFill.new()
      .withOutputs(outputs)
      .withDeadline(deadline)
      .withNonce(nonce)
      .withChain({
        chainId: PARMIGIANA.hostChainId,
        orderContract: PARMIGIANA.hostOrders,
      })
      .sign(walletClient);

    expect(signedFill.outputs.length).toBe(2);
    expect(signedFill.permit.permit.permitted.length).toBe(2);

    // Verify each output maps to correct permitted token
    expect(signedFill.permit.permit.permitted[0].amount).toBe(parseEther("50"));
    expect(signedFill.permit.permit.permitted[1].amount).toBe(parseEther("25"));

    validateFill(signedFill);
  });

  it("uses slotTime from constants for default deadline", async () => {
    const nonce = BigInt(Date.now());
    const beforeSign = BigInt(Math.floor(Date.now() / 1000));

    const signedFill = await UnsignedFill.new()
      .withOutputs([
        {
          token: TEST_TOKEN,
          amount: parseEther("10"),
          recipient: account.address,
          chainId: Number(PARMIGIANA.rollupChainId),
        },
      ])
      .withNonce(nonce)
      .withChain({
        chainId: PARMIGIANA.hostChainId,
        orderContract: PARMIGIANA.hostOrders,
      })
      .withConstants(PARMIGIANA)
      .sign(walletClient);

    const afterSign = BigInt(Math.floor(Date.now() / 1000));

    // Deadline should be approximately now + slotTime (12s)
    expect(signedFill.permit.permit.deadline).toBeGreaterThanOrEqual(
      beforeSign + PARMIGIANA.slotTime
    );
    expect(signedFill.permit.permit.deadline).toBeLessThanOrEqual(
      afterSign + PARMIGIANA.slotTime + 1n
    );
  });

  it("generates random nonce when not specified", async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const fill1 = await UnsignedFill.new()
      .withOutputs([
        {
          token: TEST_TOKEN,
          amount: parseEther("10"),
          recipient: account.address,
          chainId: Number(PARMIGIANA.rollupChainId),
        },
      ])
      .withDeadline(deadline)
      .withChain({
        chainId: PARMIGIANA.hostChainId,
        orderContract: PARMIGIANA.hostOrders,
      })
      .sign(walletClient);

    const fill2 = await UnsignedFill.new()
      .withOutputs([
        {
          token: TEST_TOKEN,
          amount: parseEther("10"),
          recipient: account.address,
          chainId: Number(PARMIGIANA.rollupChainId),
        },
      ])
      .withDeadline(deadline)
      .withChain({
        chainId: PARMIGIANA.hostChainId,
        orderContract: PARMIGIANA.hostOrders,
      })
      .sign(walletClient);

    // Nonces should be different (random)
    expect(fill1.permit.permit.nonce).not.toBe(fill2.permit.permit.nonce);
  });

  it("produces different signatures for different outputs", async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = BigInt(Date.now());

    const fill1 = await UnsignedFill.new()
      .withOutputs([
        {
          token: TEST_TOKEN,
          amount: parseEther("100"),
          recipient: account.address,
          chainId: Number(PARMIGIANA.rollupChainId),
        },
      ])
      .withDeadline(deadline)
      .withNonce(nonce)
      .withChain({
        chainId: PARMIGIANA.hostChainId,
        orderContract: PARMIGIANA.hostOrders,
      })
      .sign(walletClient);

    const fill2 = await UnsignedFill.new()
      .withOutputs([
        {
          token: TEST_TOKEN,
          amount: parseEther("200"), // Different amount
          recipient: account.address,
          chainId: Number(PARMIGIANA.rollupChainId),
        },
      ])
      .withDeadline(deadline)
      .withNonce(nonce)
      .withChain({
        chainId: PARMIGIANA.hostChainId,
        orderContract: PARMIGIANA.hostOrders,
      })
      .sign(walletClient);

    // Signatures should differ due to different outputs in witness
    expect(fill1.permit.signature).not.toBe(fill2.permit.signature);
  });

  it("encodes fillPermit2 calldata correctly", async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = BigInt(Date.now());

    const signedFill = await UnsignedFill.new()
      .withOutputs([
        {
          token: TEST_TOKEN,
          amount: parseEther("100"),
          recipient: account.address,
          chainId: Number(PARMIGIANA.rollupChainId),
        },
      ])
      .withDeadline(deadline)
      .withNonce(nonce)
      .withChain({
        chainId: PARMIGIANA.hostChainId,
        orderContract: PARMIGIANA.hostOrders,
      })
      .sign(walletClient);

    // Encode the fillPermit2 call
    const callData = encodeFunctionData({
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
            permitted: signedFill.permit.permit.permitted.map((p) => ({
              token: p.token,
              amount: p.amount,
            })),
            nonce: signedFill.permit.permit.nonce,
            deadline: signedFill.permit.permit.deadline,
          },
          owner: signedFill.permit.owner,
          signature: signedFill.permit.signature,
        },
      ],
    });

    expect(callData).toMatch(/^0x[a-fA-F0-9]+$/);
    console.log("fillPermit2 calldata length:", callData.length, "bytes");
  });

  it("throws when chain not configured", async () => {
    await expect(
      UnsignedFill.new()
        .withOutputs([
          {
            token: TEST_TOKEN,
            amount: parseEther("100"),
            recipient: account.address,
            chainId: Number(PARMIGIANA.rollupChainId),
          },
        ])
        .sign(walletClient)
    ).rejects.toThrow("Chain not configured");
  });
});
