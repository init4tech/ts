/**
 * Global setup and teardown for Anvil-based tests.
 *
 * This module spawns an Anvil instance forking Parmigiana testnet,
 * waits for it to be ready, and tears it down after tests complete.
 */
import { spawn, type ChildProcess } from "child_process";
import { createPublicClient, http } from "viem";

let anvilProcess: ChildProcess | undefined;

const ANVIL_PORT = 8545;
const ANVIL_URL = `http://127.0.0.1:${ANVIL_PORT}`;
const PARMIGIANA_RPC = "https://rpc.parmigiana.signet.sh";
const PARMIGIANA_CHAIN_ID = 88888;

async function waitForAnvil(
  url: string,
  maxAttempts = 30,
  intervalMs = 200
): Promise<void> {
  const client = createPublicClient({
    transport: http(url),
  });

  for (let i = 0; i < maxAttempts; i++) {
    try {
      await client.getChainId();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  throw new Error(`Anvil did not start within ${maxAttempts * intervalMs}ms`);
}

export async function setup(): Promise<void> {
  console.log("Starting Anvil forking Parmigiana...");

  anvilProcess = spawn(
    "anvil",
    [
      "--fork-url",
      PARMIGIANA_RPC,
      "--chain-id",
      String(PARMIGIANA_CHAIN_ID),
      "--port",
      String(ANVIL_PORT),
      "--silent",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    }
  );

  anvilProcess.on("error", (err) => {
    console.error("Failed to start Anvil:", err);
    throw err;
  });

  anvilProcess.on("exit", (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`Anvil exited with code ${code}`);
    }
    if (signal) {
      console.log(`Anvil killed with signal ${signal}`);
    }
    anvilProcess = undefined;
  });

  await waitForAnvil(ANVIL_URL);
  console.log("Anvil is ready");
}

export async function teardown(): Promise<void> {
  if (anvilProcess) {
    console.log("Stopping Anvil...");
    anvilProcess.kill("SIGTERM");
    // Wait briefly for clean shutdown
    await new Promise((resolve) => setTimeout(resolve, 500));
    anvilProcess = undefined;
  }
}
