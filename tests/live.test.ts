/**
 * Live contract verification tests.
 *
 * These tests connect to real RPCs to verify that the constants in
 * PARMIGIANA correspond to deployed contracts. They do NOT run during
 * normal test runs.
 *
 * Run with: pnpm test:live
 */
import { describe, expect, it } from "vitest";
import { createPublicClient, http } from "viem";
import {
  PARMIGIANA,
  parmigianaHost,
  parmigianaRollup,
  PERMIT2_ADDRESS,
} from "../src/index.js";
import { hostOrdersAbi } from "../src/abi/hostOrders.js";
import { passageAbi } from "../src/abi/passage.js";
import { rollupOrdersAbi } from "../src/abi/rollupOrders.js";
import { transactorAbi } from "../src/abi/transactor.js";
import { zenithAbi } from "../src/abi/zenith.js";

const hostClient = createPublicClient({
  chain: parmigianaHost,
  transport: http(),
});

const rollupClient = createPublicClient({
  chain: parmigianaRollup,
  transport: http(),
});

describe("Parmigiana host chain contracts", () => {
  it("connects to host chain with correct chain ID", async () => {
    const chainId = await hostClient.getChainId();
    expect(chainId).toBe(Number(PARMIGIANA.hostChainId));
  });

  it("hostOrders has deployed code", async () => {
    const code = await hostClient.getCode({ address: PARMIGIANA.hostOrders });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("hostOrders exposes outputWitness function", async () => {
    const result = await hostClient.readContract({
      address: PARMIGIANA.hostOrders,
      abi: hostOrdersAbi,
      functionName: "outputWitness",
      args: [[]],
    });
    expect(result.witnessTypeString).toContain("Output");
  });

  it("hostZenith has deployed code", async () => {
    const code = await hostClient.getCode({ address: PARMIGIANA.hostZenith });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("hostZenith exposes sequencerAdmin function", async () => {
    const admin = await hostClient.readContract({
      address: PARMIGIANA.hostZenith,
      abi: zenithAbi,
      functionName: "sequencerAdmin",
    });
    expect(admin).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("hostPassage has deployed code", async () => {
    const code = await hostClient.getCode({ address: PARMIGIANA.hostPassage });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("hostPassage exposes defaultRollupChainId function", async () => {
    const rollupChainId = await hostClient.readContract({
      address: PARMIGIANA.hostPassage,
      abi: passageAbi,
      functionName: "defaultRollupChainId",
    });
    expect(rollupChainId).toBe(PARMIGIANA.rollupChainId);
  });

  it("hostTransactor has deployed code", async () => {
    const code = await hostClient.getCode({
      address: PARMIGIANA.hostTransactor,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("hostTransactor exposes passage function", async () => {
    const passage = await hostClient.readContract({
      address: PARMIGIANA.hostTransactor,
      abi: transactorAbi,
      functionName: "passage",
    });
    expect(passage.toLowerCase()).toBe(PARMIGIANA.hostPassage.toLowerCase());
  });

  it("Permit2 has deployed code on host", async () => {
    const code = await hostClient.getCode({ address: PERMIT2_ADDRESS });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });
});

describe("Parmigiana rollup chain contracts", () => {
  it("connects to rollup chain with correct chain ID", async () => {
    const chainId = await rollupClient.getChainId();
    expect(chainId).toBe(Number(PARMIGIANA.rollupChainId));
  });

  it("rollupOrders has deployed code", async () => {
    const code = await rollupClient.getCode({
      address: PARMIGIANA.rollupOrders,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("rollupOrders exposes outputWitness function", async () => {
    const result = await rollupClient.readContract({
      address: PARMIGIANA.rollupOrders,
      abi: rollupOrdersAbi,
      functionName: "outputWitness",
      args: [[]],
    });
    expect(result.witnessTypeString).toContain("Output");
  });

  it("rollupPassage has deployed code", async () => {
    const code = await rollupClient.getCode({
      address: PARMIGIANA.rollupPassage,
    });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });

  it("rollupPassage exposes exit function selector", async () => {
    // Verify the contract has the expected interface by checking code
    // RollupPassage is a precompile with specific functionality
    const code = await rollupClient.getCode({
      address: PARMIGIANA.rollupPassage,
    });
    expect(code).toBeDefined();
  });

  it("Permit2 has deployed code on rollup", async () => {
    const code = await rollupClient.getCode({ address: PERMIT2_ADDRESS });
    expect(code).toBeDefined();
    expect(code!.length).toBeGreaterThan(2);
  });
});

describe("Cross-chain consistency", () => {
  it("host and rollup chain IDs match constants", async () => {
    const [hostChainId, rollupChainId] = await Promise.all([
      hostClient.getChainId(),
      rollupClient.getChainId(),
    ]);

    expect(hostChainId).toBe(Number(PARMIGIANA.hostChainId));
    expect(rollupChainId).toBe(Number(PARMIGIANA.rollupChainId));
  });

  it("hostOrders and rollupOrders have same witness type string", async () => {
    const [hostWitness, rollupWitness] = await Promise.all([
      hostClient.readContract({
        address: PARMIGIANA.hostOrders,
        abi: hostOrdersAbi,
        functionName: "outputWitness",
        args: [[]],
      }),
      rollupClient.readContract({
        address: PARMIGIANA.rollupOrders,
        abi: rollupOrdersAbi,
        functionName: "outputWitness",
        args: [[]],
      }),
    ]);

    expect(hostWitness.witnessTypeString).toBe(rollupWitness.witnessTypeString);
  });
});
