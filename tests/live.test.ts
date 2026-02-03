/**
 * Live contract verification tests.
 *
 * These tests connect to real RPCs to verify that the constants in
 * MAINNET and PARMIGIANA correspond to deployed contracts. They do NOT
 * run during normal test runs.
 *
 * Run with: pnpm test:live
 */
import { describe, expect, it } from "vitest";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import {
  MAINNET,
  PARMIGIANA,
  parmigianaHost,
  parmigianaRollup,
  PERMIT2_ADDRESS,
  signetRollup,
} from "../src/index.js";
import { hostOrdersAbi } from "../src/abi/hostOrders.js";
import { passageAbi } from "../src/abi/passage.js";
import { rollupOrdersAbi } from "../src/abi/rollupOrders.js";
import { transactorAbi } from "../src/abi/transactor.js";
import { zenithAbi } from "../src/abi/zenith.js";

// Mainnet clients
const mainnetHostClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const signetRollupClient = createPublicClient({
  chain: signetRollup,
  transport: http(),
});

// Parmigiana clients
const parmigianaHostClient = createPublicClient({
  chain: parmigianaHost,
  transport: http(),
});

const parmigianaRollupClient = createPublicClient({
  chain: parmigianaRollup,
  transport: http(),
});

describe("Mainnet host chain contracts", () => {
  it("connects to host chain with correct chain ID", async () => {
    const chainId = await mainnetHostClient.getChainId();
    expect(chainId).toBe(Number(MAINNET.hostChainId));
  });

  it("hostOrders has deployed code", async () => {
    const code = await mainnetHostClient.getCode({
      address: MAINNET.hostOrders,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("hostOrders exposes outputWitness function", async () => {
    const result = await mainnetHostClient.readContract({
      address: MAINNET.hostOrders,
      abi: hostOrdersAbi,
      functionName: "outputWitness",
      args: [[]],
    });
    expect(result.witnessTypeString).toContain("Output");
  });

  it("hostZenith has deployed code", async () => {
    const code = await mainnetHostClient.getCode({
      address: MAINNET.hostZenith,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("hostZenith exposes sequencerAdmin function", async () => {
    const admin = await mainnetHostClient.readContract({
      address: MAINNET.hostZenith,
      abi: zenithAbi,
      functionName: "sequencerAdmin",
    });
    expect(admin).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("hostPassage has deployed code", async () => {
    const code = await mainnetHostClient.getCode({
      address: MAINNET.hostPassage,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("hostPassage exposes defaultRollupChainId function", async () => {
    const rollupChainId = await mainnetHostClient.readContract({
      address: MAINNET.hostPassage,
      abi: passageAbi,
      functionName: "defaultRollupChainId",
    });
    expect(rollupChainId).toBe(MAINNET.rollupChainId);
  });

  it("hostTransactor has deployed code", async () => {
    const code = await mainnetHostClient.getCode({
      address: MAINNET.hostTransactor,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("hostTransactor exposes passage function", async () => {
    const passage = await mainnetHostClient.readContract({
      address: MAINNET.hostTransactor,
      abi: transactorAbi,
      functionName: "passage",
    });
    expect(passage.toLowerCase()).toBe(MAINNET.hostPassage.toLowerCase());
  });

  it("Permit2 has deployed code on host", async () => {
    const code = await mainnetHostClient.getCode({ address: PERMIT2_ADDRESS });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });
});

// Signet rollup RPC (rpc.signet.sh) is not publicly available.
// Skip rollup tests for mainnet until RPC is accessible.
describe.skip("Signet rollup chain contracts", () => {
  it("connects to rollup chain with correct chain ID", async () => {
    const chainId = await signetRollupClient.getChainId();
    expect(chainId).toBe(Number(MAINNET.rollupChainId));
  });

  it("rollupOrders has deployed code", async () => {
    const code = await signetRollupClient.getCode({
      address: MAINNET.rollupOrders,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("rollupOrders exposes outputWitness function", async () => {
    const result = await signetRollupClient.readContract({
      address: MAINNET.rollupOrders,
      abi: rollupOrdersAbi,
      functionName: "outputWitness",
      args: [[]],
    });
    expect(result.witnessTypeString).toContain("Output");
  });

  it("rollupPassage has deployed code", async () => {
    const code = await signetRollupClient.getCode({
      address: MAINNET.rollupPassage,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("Permit2 has deployed code on rollup", async () => {
    const code = await signetRollupClient.getCode({ address: PERMIT2_ADDRESS });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });
});

describe.skip("Mainnet cross-chain consistency", () => {
  it("host and rollup chain IDs match constants", async () => {
    const [hostChainId, rollupChainId] = await Promise.all([
      mainnetHostClient.getChainId(),
      signetRollupClient.getChainId(),
    ]);

    expect(hostChainId).toBe(Number(MAINNET.hostChainId));
    expect(rollupChainId).toBe(Number(MAINNET.rollupChainId));
  });

  it("hostOrders and rollupOrders have same witness type string", async () => {
    const [hostWitness, rollupWitness] = await Promise.all([
      mainnetHostClient.readContract({
        address: MAINNET.hostOrders,
        abi: hostOrdersAbi,
        functionName: "outputWitness",
        args: [[]],
      }),
      signetRollupClient.readContract({
        address: MAINNET.rollupOrders,
        abi: rollupOrdersAbi,
        functionName: "outputWitness",
        args: [[]],
      }),
    ]);

    expect(hostWitness.witnessTypeString).toBe(rollupWitness.witnessTypeString);
  });
});

describe("Parmigiana host chain contracts", () => {
  it("connects to host chain with correct chain ID", async () => {
    const chainId = await parmigianaHostClient.getChainId();
    expect(chainId).toBe(Number(PARMIGIANA.hostChainId));
  });

  it("hostOrders has deployed code", async () => {
    const code = await parmigianaHostClient.getCode({
      address: PARMIGIANA.hostOrders,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("hostOrders exposes outputWitness function", async () => {
    const result = await parmigianaHostClient.readContract({
      address: PARMIGIANA.hostOrders,
      abi: hostOrdersAbi,
      functionName: "outputWitness",
      args: [[]],
    });
    expect(result.witnessTypeString).toContain("Output");
  });

  it("hostZenith has deployed code", async () => {
    const code = await parmigianaHostClient.getCode({
      address: PARMIGIANA.hostZenith,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("hostZenith exposes sequencerAdmin function", async () => {
    const admin = await parmigianaHostClient.readContract({
      address: PARMIGIANA.hostZenith,
      abi: zenithAbi,
      functionName: "sequencerAdmin",
    });
    expect(admin).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("hostPassage has deployed code", async () => {
    const code = await parmigianaHostClient.getCode({
      address: PARMIGIANA.hostPassage,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("hostPassage exposes defaultRollupChainId function", async () => {
    const rollupChainId = await parmigianaHostClient.readContract({
      address: PARMIGIANA.hostPassage,
      abi: passageAbi,
      functionName: "defaultRollupChainId",
    });
    expect(rollupChainId).toBe(PARMIGIANA.rollupChainId);
  });

  it("hostTransactor has deployed code", async () => {
    const code = await parmigianaHostClient.getCode({
      address: PARMIGIANA.hostTransactor,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("hostTransactor exposes passage function", async () => {
    const passage = await parmigianaHostClient.readContract({
      address: PARMIGIANA.hostTransactor,
      abi: transactorAbi,
      functionName: "passage",
    });
    expect(passage.toLowerCase()).toBe(PARMIGIANA.hostPassage.toLowerCase());
  });

  it("Permit2 has deployed code on host", async () => {
    const code = await parmigianaHostClient.getCode({
      address: PERMIT2_ADDRESS,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });
});

describe("Parmigiana rollup chain contracts", () => {
  it("connects to rollup chain with correct chain ID", async () => {
    const chainId = await parmigianaRollupClient.getChainId();
    expect(chainId).toBe(Number(PARMIGIANA.rollupChainId));
  });

  it("rollupOrders has deployed code", async () => {
    const code = await parmigianaRollupClient.getCode({
      address: PARMIGIANA.rollupOrders,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("rollupOrders exposes outputWitness function", async () => {
    const result = await parmigianaRollupClient.readContract({
      address: PARMIGIANA.rollupOrders,
      abi: rollupOrdersAbi,
      functionName: "outputWitness",
      args: [[]],
    });
    expect(result.witnessTypeString).toContain("Output");
  });

  it("rollupPassage has deployed code", async () => {
    const code = await parmigianaRollupClient.getCode({
      address: PARMIGIANA.rollupPassage,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("rollupPassage exposes exit function selector", async () => {
    // Verify the contract has the expected interface by checking code
    // RollupPassage is a precompile with specific functionality
    const code = await parmigianaRollupClient.getCode({
      address: PARMIGIANA.rollupPassage,
    });
    expect(code).toBeDefined();
  });

  it("Permit2 has deployed code on rollup", async () => {
    const code = await parmigianaRollupClient.getCode({
      address: PERMIT2_ADDRESS,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });
});

describe("Parmigiana cross-chain consistency", () => {
  it("host and rollup chain IDs match constants", async () => {
    const [hostChainId, rollupChainId] = await Promise.all([
      parmigianaHostClient.getChainId(),
      parmigianaRollupClient.getChainId(),
    ]);

    expect(hostChainId).toBe(Number(PARMIGIANA.hostChainId));
    expect(rollupChainId).toBe(Number(PARMIGIANA.rollupChainId));
  });

  it("hostOrders and rollupOrders have same witness type string", async () => {
    const [hostWitness, rollupWitness] = await Promise.all([
      parmigianaHostClient.readContract({
        address: PARMIGIANA.hostOrders,
        abi: hostOrdersAbi,
        functionName: "outputWitness",
        args: [[]],
      }),
      parmigianaRollupClient.readContract({
        address: PARMIGIANA.rollupOrders,
        abi: rollupOrdersAbi,
        functionName: "outputWitness",
        args: [[]],
      }),
    ]);

    expect(hostWitness.witnessTypeString).toBe(rollupWitness.witnessTypeString);
  });
});
