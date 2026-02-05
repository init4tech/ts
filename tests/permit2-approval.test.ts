import { describe, expect, it, vi } from "vitest";
import {
  getPermit2Allowance,
  approvePermit2,
  ensurePermit2Approval,
} from "../src/permit2/index.js";
import { PERMIT2_ADDRESS } from "../src/constants/permit2.js";
import type {
  Account,
  Address,
  Chain,
  PublicClient,
  Transport,
  WalletClient,
} from "viem";
import { maxUint256 } from "viem";

type ConfiguredWalletClient = WalletClient<Transport, Chain, Account>;

const TOKEN: Address = "0xD1278f17e86071f1E658B656084c65b7FD3c90eF";
const OWNER: Address = "0x0000000000000000000000000000000000000001";

function mockPublicClient(allowance: bigint = 0n): PublicClient {
  return {
    readContract: vi.fn().mockResolvedValue(allowance),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({}),
  } as unknown as PublicClient;
}

function mockWalletClient(): ConfiguredWalletClient {
  return {
    writeContract: vi.fn().mockResolvedValue("0xdeadbeef"),
  } as unknown as ConfiguredWalletClient;
}

describe("getPermit2Allowance", () => {
  it("reads allowance for Permit2", async () => {
    const client = mockPublicClient(1000n);
    const allowance = await getPermit2Allowance(client, {
      token: TOKEN,
      owner: OWNER,
    });

    expect(allowance).toBe(1000n);
    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: TOKEN,
        functionName: "allowance",
        args: [OWNER, PERMIT2_ADDRESS],
      })
    );
  });
});

describe("approvePermit2", () => {
  it("approves max by default", async () => {
    const client = mockWalletClient();
    await approvePermit2(client, { token: TOKEN });

    expect(client.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: TOKEN,
        functionName: "approve",
        args: [PERMIT2_ADDRESS, maxUint256],
      })
    );
  });

  it("approves specific amount", async () => {
    const client = mockWalletClient();
    await approvePermit2(client, { token: TOKEN, amount: 500n });

    expect(client.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [PERMIT2_ADDRESS, 500n],
      })
    );
  });
});

describe("ensurePermit2Approval", () => {
  it("skips if allowance sufficient", async () => {
    const pub = mockPublicClient(maxUint256);
    const wallet = mockWalletClient();

    const result = await ensurePermit2Approval(wallet, pub, {
      token: TOKEN,
      owner: OWNER,
      amount: 1000n,
    });

    expect(result.approved).toBe(false);
    expect(result.txHash).toBeUndefined();
    expect(wallet.writeContract).not.toHaveBeenCalled();
  });

  it("approves when allowance insufficient", async () => {
    const pub = mockPublicClient(0n);
    const wallet = mockWalletClient();

    const result = await ensurePermit2Approval(wallet, pub, {
      token: TOKEN,
      owner: OWNER,
      amount: 1000n,
    });

    expect(result.approved).toBe(true);
    expect(result.txHash).toBe("0xdeadbeef");
  });

  it("resets to zero for USDT-style tokens", async () => {
    const pub = mockPublicClient(500n);
    const wallet = mockWalletClient();

    const result = await ensurePermit2Approval(wallet, pub, {
      token: TOKEN,
      owner: OWNER,
      amount: 1000n,
    });

    expect(result.approved).toBe(true);
    /* First call: reset to 0, second call: approve max */
    expect(wallet.writeContract).toHaveBeenCalledTimes(2);
    expect(pub.waitForTransactionReceipt).toHaveBeenCalledTimes(1);
  });
});
