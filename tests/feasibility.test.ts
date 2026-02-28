/**
 * Tests for order feasibility validation.
 *
 * These tests run against a local Anvil instance forking Parmigiana.
 * Run with: npm run test:anvil
 */
import {
  describe,
  expect,
  it,
  beforeAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  http,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { foundry } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  checkOrderFeasibility,
  hasPermit2Approval,
  UnsignedOrder,
  PARMIGIANA,
} from "../src/index.js";
import { PERMIT2_ADDRESS } from "../src/constants/permit2.js";
import { setTokenAllowance, setTokenBalance } from "./testToken.js";

const mockIsNonceUsed = vi.fn().mockResolvedValue(false);

vi.mock("../src/signing/nonce.js", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    isNonceUsed: mockIsNonceUsed,
  };
});

const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
const ANVIL_URL = "http://127.0.0.1:8545";
const TEST_TOKEN: Address = "0x0000000000000000000000007369676e65742D77757364";

const forkedParmigiana = {
  ...foundry,
  id: 88888,
  name: "Forked Parmigiana",
};

describe("Order feasibility", () => {
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
    const chainId = await publicClient.getChainId();
    expect(chainId).toBe(88888);

    await testClient.setBalance({
      address: account.address,
      value: parseEther("100"),
    });
  });

  beforeEach(async () => {
    snapshotId = await testClient.snapshot();
  });

  afterEach(async () => {
    await testClient.revert({ id: snapshotId });
  });

  describe("checkOrderFeasibility", () => {
    it("returns feasible for order with sufficient balance and allowance", async () => {
      const inputAmount = parseEther("100");

      await setTokenBalance(
        testClient,
        TEST_TOKEN,
        account.address,
        inputAmount,
        publicClient
      );
      await setTokenAllowance(
        testClient,
        TEST_TOKEN,
        account.address,
        PERMIT2_ADDRESS,
        inputAmount,
        publicClient
      );

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const order = await UnsignedOrder.new()
        .withInput(TEST_TOKEN, inputAmount)
        .withOutput(
          TEST_TOKEN,
          parseEther("99"),
          account.address,
          Number(PARMIGIANA.hostChainId)
        )
        .withDeadline(deadline)
        .withChain({
          chainId: PARMIGIANA.rollupChainId,
          orderContract: PARMIGIANA.rollupOrders,
        })
        .sign(walletClient);

      const result = await checkOrderFeasibility(publicClient, order);

      expect(result.feasible).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("returns insufficient_balance issue when balance is low", async () => {
      const inputAmount = parseEther("100");

      // Set balance to less than required
      await setTokenBalance(
        testClient,
        TEST_TOKEN,
        account.address,
        parseEther("50"),
        publicClient
      );
      await setTokenAllowance(
        testClient,
        TEST_TOKEN,
        account.address,
        PERMIT2_ADDRESS,
        inputAmount,
        publicClient
      );

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const order = await UnsignedOrder.new()
        .withInput(TEST_TOKEN, inputAmount)
        .withOutput(
          TEST_TOKEN,
          parseEther("99"),
          account.address,
          Number(PARMIGIANA.hostChainId)
        )
        .withDeadline(deadline)
        .withChain({
          chainId: PARMIGIANA.rollupChainId,
          orderContract: PARMIGIANA.rollupOrders,
        })
        .sign(walletClient);

      const result = await checkOrderFeasibility(publicClient, order);

      expect(result.feasible).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe("insufficient_balance");
      expect(result.issues[0].token).toBe(TEST_TOKEN);
      expect(result.issues[0].required).toBe(inputAmount);
      expect(result.issues[0].available).toBe(parseEther("50"));
    });

    it("returns insufficient_allowance issue when allowance is low", async () => {
      const inputAmount = parseEther("100");

      await setTokenBalance(
        testClient,
        TEST_TOKEN,
        account.address,
        inputAmount,
        publicClient
      );
      // Set allowance to less than required
      await setTokenAllowance(
        testClient,
        TEST_TOKEN,
        account.address,
        PERMIT2_ADDRESS,
        parseEther("50"),
        publicClient
      );

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const order = await UnsignedOrder.new()
        .withInput(TEST_TOKEN, inputAmount)
        .withOutput(
          TEST_TOKEN,
          parseEther("99"),
          account.address,
          Number(PARMIGIANA.hostChainId)
        )
        .withDeadline(deadline)
        .withChain({
          chainId: PARMIGIANA.rollupChainId,
          orderContract: PARMIGIANA.rollupOrders,
        })
        .sign(walletClient);

      const result = await checkOrderFeasibility(publicClient, order);

      expect(result.feasible).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe("insufficient_allowance");
      expect(result.issues[0].token).toBe(TEST_TOKEN);
      expect(result.issues[0].required).toBe(inputAmount);
      expect(result.issues[0].available).toBe(parseEther("50"));
    });

    it("returns multiple issues when both balance and allowance are low", async () => {
      const inputAmount = parseEther("100");

      await setTokenBalance(
        testClient,
        TEST_TOKEN,
        account.address,
        parseEther("25"),
        publicClient
      );
      await setTokenAllowance(
        testClient,
        TEST_TOKEN,
        account.address,
        PERMIT2_ADDRESS,
        parseEther("50"),
        publicClient
      );

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const order = await UnsignedOrder.new()
        .withInput(TEST_TOKEN, inputAmount)
        .withOutput(
          TEST_TOKEN,
          parseEther("99"),
          account.address,
          Number(PARMIGIANA.hostChainId)
        )
        .withDeadline(deadline)
        .withChain({
          chainId: PARMIGIANA.rollupChainId,
          orderContract: PARMIGIANA.rollupOrders,
        })
        .sign(walletClient);

      const result = await checkOrderFeasibility(publicClient, order);

      expect(result.feasible).toBe(false);
      expect(result.issues).toHaveLength(2);

      const issueTypes = result.issues.map((i) => i.type);
      expect(issueTypes).toContain("insufficient_balance");
      expect(issueTypes).toContain("insufficient_allowance");
    });

    it("returns deadline_expired issue when deadline is in the past", async () => {
      const inputAmount = parseEther("100");

      await setTokenBalance(
        testClient,
        TEST_TOKEN,
        account.address,
        inputAmount,
        publicClient
      );
      await setTokenAllowance(
        testClient,
        TEST_TOKEN,
        account.address,
        PERMIT2_ADDRESS,
        inputAmount,
        publicClient
      );

      const deadline = BigInt(Math.floor(Date.now() / 1000) - 3600);
      const order = await UnsignedOrder.new()
        .withInput(TEST_TOKEN, inputAmount)
        .withOutput(
          TEST_TOKEN,
          parseEther("99"),
          account.address,
          Number(PARMIGIANA.hostChainId)
        )
        .withDeadline(deadline)
        .withChain({
          chainId: PARMIGIANA.rollupChainId,
          orderContract: PARMIGIANA.rollupOrders,
        })
        .sign(walletClient);

      const result = await checkOrderFeasibility(publicClient, order);

      expect(result.feasible).toBe(false);
      expect(result.issues.some((i) => i.type === "deadline_expired")).toBe(
        true
      );
    });

    it("returns nonce_used issue when nonce has been consumed", async () => {
      const inputAmount = parseEther("100");

      await setTokenBalance(
        testClient,
        TEST_TOKEN,
        account.address,
        inputAmount,
        publicClient
      );
      await setTokenAllowance(
        testClient,
        TEST_TOKEN,
        account.address,
        PERMIT2_ADDRESS,
        inputAmount,
        publicClient
      );

      mockIsNonceUsed.mockResolvedValueOnce(true);

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const order = await UnsignedOrder.new()
        .withInput(TEST_TOKEN, inputAmount)
        .withOutput(
          TEST_TOKEN,
          parseEther("99"),
          account.address,
          Number(PARMIGIANA.hostChainId)
        )
        .withDeadline(deadline)
        .withChain({
          chainId: PARMIGIANA.rollupChainId,
          orderContract: PARMIGIANA.rollupOrders,
        })
        .sign(walletClient);

      const result = await checkOrderFeasibility(publicClient, order);

      expect(result.feasible).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe("nonce_used");
    });
  });

  describe("hasPermit2Approval", () => {
    it("returns true when allowance is sufficient", async () => {
      const amount = parseEther("100");
      await setTokenAllowance(
        testClient,
        TEST_TOKEN,
        account.address,
        PERMIT2_ADDRESS,
        amount,
        publicClient
      );

      const result = await hasPermit2Approval(publicClient, account.address, [
        { token: TEST_TOKEN, amount },
      ]);

      expect(result).toBe(true);
    });

    it("returns false when allowance is insufficient", async () => {
      const amount = parseEther("100");
      await setTokenAllowance(
        testClient,
        TEST_TOKEN,
        account.address,
        PERMIT2_ADDRESS,
        parseEther("50"),
        publicClient
      );

      const result = await hasPermit2Approval(publicClient, account.address, [
        { token: TEST_TOKEN, amount },
      ]);

      expect(result).toBe(false);
    });

    it("returns true for empty token list", async () => {
      const result = await hasPermit2Approval(
        publicClient,
        account.address,
        []
      );

      expect(result).toBe(true);
    });
  });
});
