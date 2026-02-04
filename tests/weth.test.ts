import { describe, expect, it, vi } from "vitest";
import { wrapEth, unwrapEth } from "../src/weth/index.js";
import type { Account, Address, Chain, Transport, WalletClient } from "viem";

type ConfiguredWalletClient = WalletClient<Transport, Chain, Account>;

function mockWalletClient(): ConfiguredWalletClient {
  return {
    writeContract: vi.fn().mockResolvedValue("0xdeadbeef"),
  } as unknown as ConfiguredWalletClient;
}

const WETH: Address = "0xD1278f17e86071f1E658B656084c65b7FD3c90eF";

describe("wrapEth", () => {
  it("calls deposit with value", async () => {
    const client = mockWalletClient();
    const hash = await wrapEth(client, {
      weth: WETH,
      amount: 1000000000000000000n,
    });

    expect(hash).toBe("0xdeadbeef");
    expect(client.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: WETH,
        functionName: "deposit",
        value: 1000000000000000000n,
      })
    );
  });
});

describe("unwrapEth", () => {
  it("calls withdraw with amount", async () => {
    const client = mockWalletClient();
    const hash = await unwrapEth(client, {
      weth: WETH,
      amount: 1000000000000000000n,
    });

    expect(hash).toBe("0xdeadbeef");
    expect(client.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: WETH,
        functionName: "withdraw",
        args: [1000000000000000000n],
      })
    );
  });
});
