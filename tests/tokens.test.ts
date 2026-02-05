import { describe, expect, it } from "vitest";
import { MAINNET, PARMIGIANA } from "../src/constants/chains.js";
import {
  getTokenAddress,
  resolveTokenSymbol,
  getAvailableTokens,
} from "../src/tokens/addresses.js";
import { getTokenDecimals, TOKENS } from "../src/tokens/constants.js";
import { mapTokenCrossChain, needsWethWrap } from "../src/tokens/mapping.js";

describe("getTokenAddress", () => {
  it("returns mainnet host WETH", () => {
    const addr = getTokenAddress("WETH", MAINNET.hostChainId, MAINNET);
    expect(addr).toBe("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
  });

  it("returns mainnet rollup WETH", () => {
    const addr = getTokenAddress("WETH", MAINNET.rollupChainId, MAINNET);
    expect(addr).toBe("0x0000000000000000007369676e65742d77657468");
  });

  it("returns undefined for unknown chain", () => {
    expect(getTokenAddress("WETH", 999n, MAINNET)).toBeUndefined();
  });
});

describe("resolveTokenSymbol", () => {
  it("resolves parmigiana rollup WETH", () => {
    const symbol = resolveTokenSymbol(
      "0x0000000000000000007369676e65742d77657468",
      PARMIGIANA.rollupChainId,
      PARMIGIANA
    );
    expect(symbol).toBe("WETH");
  });

  it("returns undefined for unknown address", () => {
    expect(
      resolveTokenSymbol(
        "0x0000000000000000000000000000000000000001",
        MAINNET.hostChainId,
        MAINNET
      )
    ).toBeUndefined();
  });
});

describe("getAvailableTokens", () => {
  it("lists mainnet host tokens", () => {
    const tokens = getAvailableTokens(MAINNET.hostChainId, MAINNET);
    expect(tokens).toContain("WETH");
    expect(tokens).toContain("USDC");
  });

  it("lists mainnet rollup tokens", () => {
    const tokens = getAvailableTokens(MAINNET.rollupChainId, MAINNET);
    expect(tokens).toContain("WETH");
    expect(tokens).toContain("WBTC");
    expect(tokens).toContain("WUSD");
  });

  it("returns empty for unknown chain", () => {
    expect(getAvailableTokens(999n, MAINNET)).toEqual([]);
  });
});

describe("mapTokenCrossChain", () => {
  it("maps WETH across chains", () => {
    expect(mapTokenCrossChain("WETH")).toBe("WETH");
  });

  it("returns undefined for non-bridgeable token", () => {
    expect(mapTokenCrossChain("ETH")).toBeUndefined();
  });
});

describe("needsWethWrap", () => {
  describe("orders flow", () => {
    it("ETH needs wrap for host to rollup", () => {
      expect(needsWethWrap("ETH", "hostToRollup", "orders")).toBe(true);
    });

    it("ETH does not need wrap for rollup to host", () => {
      expect(needsWethWrap("ETH", "rollupToHost", "orders")).toBe(false);
    });

    it("WETH does not need wrap", () => {
      expect(needsWethWrap("WETH", "hostToRollup", "orders")).toBe(false);
    });
  });

  describe("passage flow", () => {
    it("ETH does not need wrap for host to rollup", () => {
      expect(needsWethWrap("ETH", "hostToRollup", "passage")).toBe(false);
    });

    it("ETH does not need wrap for rollup to host", () => {
      expect(needsWethWrap("ETH", "rollupToHost", "passage")).toBe(false);
    });

    it("WETH does not need wrap", () => {
      expect(needsWethWrap("WETH", "hostToRollup", "passage")).toBe(false);
    });
  });
});

describe("getTokenDecimals", () => {
  it("returns mainnet decimals by default", () => {
    expect(getTokenDecimals("WUSD")).toBe(6);
    expect(getTokenDecimals("WETH")).toBe(18);
    expect(getTokenDecimals("WBTC")).toBe(8);
  });

  it("returns mainnet decimals with MAINNET config", () => {
    expect(getTokenDecimals("WUSD", MAINNET)).toBe(6);
  });

  it("returns testnet override for PARMIGIANA", () => {
    expect(getTokenDecimals("WUSD", PARMIGIANA)).toBe(18);
  });

  it("returns default when no override exists", () => {
    expect(getTokenDecimals("WETH", PARMIGIANA)).toBe(18);
    expect(getTokenDecimals("WBTC", PARMIGIANA)).toBe(8);
  });

  it("matches TOKENS constant when no override", () => {
    expect(getTokenDecimals("USDC")).toBe(TOKENS.USDC.decimals);
    expect(getTokenDecimals("USDT")).toBe(TOKENS.USDT.decimals);
  });
});
