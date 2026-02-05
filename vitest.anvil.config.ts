import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/anvil.test.ts", "tests/feasibility.test.ts"],
    globalSetup: ["tests/globalSetup.ts"],
    testTimeout: 30000, // 30s timeout for blockchain operations
    hookTimeout: 60000, // 60s for setup/teardown
  },
});
