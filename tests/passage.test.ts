import { describe, expect, it, vi } from "vitest";
import { enter, enterToken } from "../src/passage/index.js";
import type { Account, Address, Chain, Transport, WalletClient } from "viem";

type ConfiguredWalletClient = WalletClient<Transport, Chain, Account>;

function mockWalletClient(): ConfiguredWalletClient {
  return {
    writeContract: vi.fn().mockResolvedValue("0xdeadbeef"),
  } as unknown as ConfiguredWalletClient;
}

const PASSAGE: Address = "0x28524D2a753925Ef000C3f0F811cDf452C6256aF";
const RECIPIENT: Address = "0x0000000000000000000000000000000000000001";
const TOKEN: Address = "0xD1278f17e86071f1E658B656084c65b7FD3c90eF";

describe("enter", () => {
  it("calls writeContract with correct args", async () => {
    const client = mockWalletClient();
    const hash = await enter(client, {
      passage: PASSAGE,
      recipient: RECIPIENT,
      amount: 1000000000000000000n,
    });

    expect(hash).toBe("0xdeadbeef");
    expect(client.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: PASSAGE,
        functionName: "enter",
        args: [RECIPIENT],
        value: 1000000000000000000n,
      })
    );
  });
});

describe("enterToken", () => {
  it("calls writeContract with correct args", async () => {
    const client = mockWalletClient();
    const hash = await enterToken(client, {
      passage: PASSAGE,
      rollupChainId: 88888n,
      recipient: RECIPIENT,
      token: TOKEN,
      amount: 1000000n,
    });

    expect(hash).toBe("0xdeadbeef");
    expect(client.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: PASSAGE,
        functionName: "enterToken",
        args: [88888n, RECIPIENT, TOKEN, 1000000n],
      })
    );
  });
});
