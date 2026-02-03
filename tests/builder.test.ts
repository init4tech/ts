/**
 * Tests for builder misuse scenarios.
 *
 * These tests verify that builders throw appropriate errors
 * when used incorrectly.
 */
import { describe, expect, it } from "vitest";
import {
  createWalletClient,
  http,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { foundry } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { UnsignedOrder, UnsignedFill, PARMIGIANA } from "../src/index.js";

const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;

const TEST_TOKEN: Address = "0x0000000000000000000000007369676e65742D77757364";

describe("UnsignedOrder builder", () => {
  const account = privateKeyToAccount(TEST_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: foundry,
    transport: http(),
  });

  describe("missing chain configuration", () => {
    it("throws when signing without chain config", async () => {
      await expect(
        UnsignedOrder.new()
          .withInput(TEST_TOKEN, parseEther("100"))
          .withOutput(
            TEST_TOKEN,
            parseEther("99"),
            account.address,
            Number(PARMIGIANA.hostChainId)
          )
          .withDeadline(BigInt(Math.floor(Date.now() / 1000) + 3600))
          .sign(walletClient)
      ).rejects.toThrow("Chain not configured");
    });
  });

  describe("empty inputs", () => {
    it("allows signing with no inputs (empty array)", () => {
      // This is valid from a builder perspective - contract may reject
      const order = UnsignedOrder.new()
        .withOutput(
          TEST_TOKEN,
          parseEther("99"),
          account.address,
          Number(PARMIGIANA.hostChainId)
        )
        .withDeadline(BigInt(Math.floor(Date.now() / 1000) + 3600))
        .withChain({
          chainId: PARMIGIANA.rollupChainId,
          orderContract: PARMIGIANA.rollupOrders,
        });

      expect(order.inputs).toHaveLength(0);
    });
  });

  describe("empty outputs", () => {
    it("allows building with no outputs (empty array)", () => {
      const order = UnsignedOrder.new()
        .withInput(TEST_TOKEN, parseEther("100"))
        .withDeadline(BigInt(Math.floor(Date.now() / 1000) + 3600))
        .withChain({
          chainId: PARMIGIANA.rollupChainId,
          orderContract: PARMIGIANA.rollupOrders,
        });

      expect(order.outputs).toHaveLength(0);
    });
  });

  describe("builder state", () => {
    it("accumulates multiple inputs", () => {
      const token1 = "0x0000000000000000000000000000000000000001" as Address;
      const token2 = "0x0000000000000000000000000000000000000002" as Address;

      const order = UnsignedOrder.new()
        .withInput(token1, 100n)
        .withInput(token2, 200n);

      expect(order.inputs).toHaveLength(2);
      expect(order.inputs[0].token).toBe(token1);
      expect(order.inputs[0].amount).toBe(100n);
      expect(order.inputs[1].token).toBe(token2);
      expect(order.inputs[1].amount).toBe(200n);
    });

    it("accumulates multiple outputs", () => {
      const token = TEST_TOKEN;
      const recipient1 =
        "0x0000000000000000000000000000000000000001" as Address;
      const recipient2 =
        "0x0000000000000000000000000000000000000002" as Address;

      const order = UnsignedOrder.new()
        .withOutput(token, 100n, recipient1, 1)
        .withOutput(token, 200n, recipient2, 1);

      expect(order.outputs).toHaveLength(2);
      expect(order.outputs[0].recipient).toBe(recipient1);
      expect(order.outputs[1].recipient).toBe(recipient2);
    });

    it("withInputs adds multiple inputs at once", () => {
      const inputs = [
        {
          token: "0x0000000000000000000000000000000000000001" as Address,
          amount: 100n,
        },
        {
          token: "0x0000000000000000000000000000000000000002" as Address,
          amount: 200n,
        },
      ];

      const order = UnsignedOrder.new().withInputs(inputs);

      expect(order.inputs).toHaveLength(2);
    });

    it("withOutputs adds multiple outputs at once", () => {
      const outputs = [
        {
          token: TEST_TOKEN,
          amount: 100n,
          recipient: "0x0000000000000000000000000000000000000001" as Address,
          chainId: 1,
        },
        {
          token: TEST_TOKEN,
          amount: 200n,
          recipient: "0x0000000000000000000000000000000000000002" as Address,
          chainId: 1,
        },
      ];

      const order = UnsignedOrder.new().withOutputs(outputs);

      expect(order.outputs).toHaveLength(2);
    });
  });
});

describe("UnsignedFill builder", () => {
  const account = privateKeyToAccount(TEST_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: foundry,
    transport: http(),
  });

  describe("missing chain configuration", () => {
    it("throws when signing without chain config", async () => {
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

  describe("empty outputs", () => {
    it("allows building with no outputs", () => {
      const fill = UnsignedFill.new()
        .withDeadline(BigInt(Math.floor(Date.now() / 1000) + 3600))
        .withChain({
          chainId: PARMIGIANA.hostChainId,
          orderContract: PARMIGIANA.hostOrders,
        });

      expect(fill.outputs).toHaveLength(0);
    });
  });

  describe("builder state", () => {
    it("accumulates outputs from multiple withOutputs calls", () => {
      const fill = UnsignedFill.new()
        .withOutputs([
          {
            token: TEST_TOKEN,
            amount: 100n,
            recipient: "0x0000000000000000000000000000000000000001" as Address,
            chainId: 1,
          },
        ])
        .withOutputs([
          {
            token: TEST_TOKEN,
            amount: 200n,
            recipient: "0x0000000000000000000000000000000000000002" as Address,
            chainId: 1,
          },
        ]);

      expect(fill.outputs).toHaveLength(2);
    });
  });
});
