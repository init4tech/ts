import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: ["tests/anvil.test.ts", "tests/live.test.ts", "node_modules/**"],
  },
});
