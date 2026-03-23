import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFaucetClient, FaucetRequestError } from "../src/index.js";
import type {
  FaucetDripResponse,
  FaucetStatusResponse,
  Address,
} from "../src/index.js";

describe("FaucetClient", () => {
  const TEST_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0" as Address;
  const FAUCET_URL = "https://faucet.example.com";

  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  function createClient() {
    return createFaucetClient(FAUCET_URL, {
      fetch: mockFetch as unknown as typeof fetch,
    });
  }

  function mockResponse<T>(data: T, ok = true, status = ok ? 200 : 400) {
    return {
      ok,
      status,
      statusText: ok ? "OK" : "Bad Request",
      json: () => Promise.resolve(data),
    };
  }

  describe("requestTokens", () => {
    it("should request tokens successfully", async () => {
      const response: FaucetDripResponse = {
        success: true,
        data: {
          address: TEST_ADDRESS,
          results: {
            usd: {
              amount: "1.00",
              currency: "USD",
              transaction_hash: "0xabc123",
              chain_id: 88888,
              claimed_at: 1234567890,
            },
            eth: {
              amount: "0.0500",
              currency: "ETH",
              transaction_hash: "0xdef456",
              chain_id: 3151908,
              claimed_at: 1234567890,
            },
          },
          message: "Successfully sent 1.00 USD + 0.05 ETH to your address",
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse(response));

      const client = createClient();
      const result = await client.requestTokens(TEST_ADDRESS);

      expect(result.address).toBe(TEST_ADDRESS);
      expect(result.results.usd.amount).toBe("1.00");
      expect(result.results.eth.amount).toBe("0.0500");
      expect(result.message).toContain("Successfully sent");

      expect(mockFetch).toHaveBeenCalledWith(
        `${FAUCET_URL}/drip`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: TEST_ADDRESS }),
        })
      );
    });

    it("should request specific assets", async () => {
      const response: FaucetDripResponse = {
        success: true,
        data: {
          address: TEST_ADDRESS,
          results: {
            usd: {
              amount: "1.00",
              currency: "USD",
              transaction_hash: "0xabc123",
              chain_id: 88888,
              claimed_at: 1234567890,
            },
            eth: {},
          },
          message: "Successfully sent 1.00 USD to your address",
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse(response));

      const client = createClient();
      await client.requestTokens(TEST_ADDRESS, ["usd"]);

      expect(mockFetch).toHaveBeenCalledWith(
        `${FAUCET_URL}/drip`,
        expect.objectContaining({
          body: JSON.stringify({ address: TEST_ADDRESS, assets: ["usd"] }),
        })
      );
    });

    it("should throw FaucetRequestError on rate limit", async () => {
      const response: FaucetDripResponse = {
        success: false,
        error: {
          code: "ALREADY_CLAIMED",
          message: "Already received funds today",
          details: "Try again in 5 hours 23 minutes",
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse(response, false, 429));

      const client = createClient();

      const err = await client
        .requestTokens(TEST_ADDRESS)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(FaucetRequestError);
      const faucetErr = err as FaucetRequestError;
      expect(faucetErr.code).toBe("ALREADY_CLAIMED");
      expect(faucetErr.isRateLimited).toBe(true);
      expect(faucetErr.isOnCooldown).toBe(true);
    });

    it("should throw FaucetRequestError on invalid address", async () => {
      const client = createClient();

      await expect(
        client.requestTokens("0xnotanaddress" as Address)
      ).rejects.toThrow(FaucetRequestError);

      const err = await client
        .requestTokens("0xnotanaddress" as Address)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(FaucetRequestError);
      const faucetErr = err as FaucetRequestError;
      expect(faucetErr.code).toBe("INVALID_ADDRESS");
      expect(faucetErr.isRateLimited).toBe(false);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const client = createClient();

      await expect(client.requestTokens(TEST_ADDRESS)).rejects.toThrow(
        FaucetRequestError
      );

      mockFetch.mockRejectedValueOnce(new Error("Network failure"));
      const err = await client
        .requestTokens(TEST_ADDRESS)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(FaucetRequestError);
      expect((err as FaucetRequestError).code).toBe("NETWORK_ERROR");
    });

    it("should handle partial success (one asset fails)", async () => {
      const response: FaucetDripResponse = {
        success: true, // At least one succeeded
        data: {
          address: TEST_ADDRESS,
          results: {
            usd: {
              amount: "1.00",
              currency: "USD",
              transaction_hash: "0xabc123",
              chain_id: 88888,
              claimed_at: 1234567890,
            },
            eth: {
              error: "Already received ETH today",
              error_code: "ALREADY_CLAIMED",
            },
          },
          message: "Sent 1.00 USD. Failed: ETH: Already received ETH today",
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse(response));

      const client = createClient();
      const result = await client.requestTokens(TEST_ADDRESS);

      // Should not throw - partial success is still success
      expect(result.results.usd.transaction_hash).toBe("0xabc123");
      expect(result.results.eth.error).toBe("Already received ETH today");
    });
  });

  describe("checkCooldown", () => {
    it("should check cooldown status for addresses", async () => {
      const response: FaucetStatusResponse = {
        success: true,
        data: {
          [TEST_ADDRESS]: {
            on_cooldown: true,
            assets: {
              usd: {
                on_cooldown: true,
                expires_at: 1234567890,
                tx_hash: "0xabc123",
              },
              eth: {
                on_cooldown: false,
              },
            },
          },
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse(response));

      const client = createClient();
      const result = await client.checkCooldown([TEST_ADDRESS]);

      expect(result[TEST_ADDRESS].on_cooldown).toBe(true);
      expect(result[TEST_ADDRESS].assets.usd.on_cooldown).toBe(true);
      expect(result[TEST_ADDRESS].assets.eth.on_cooldown).toBe(false);

      expect(mockFetch).toHaveBeenCalledWith(
        `${FAUCET_URL}/drip/status`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ addresses: [TEST_ADDRESS] }),
        })
      );
    });

    it("should return empty object for empty addresses array", async () => {
      const client = createClient();
      const result = await client.checkCooldown([]);

      expect(result).toEqual({});
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should throw on too many addresses", async () => {
      const client = createClient();
      const addresses = Array(101)
        .fill(null)
        .map((_, i): Address => `0x${i.toString().padStart(40, "0")}`);

      await expect(client.checkCooldown(addresses)).rejects.toThrow(
        FaucetRequestError
      );
    });
  });

  describe("canRequest", () => {
    it("should return true when not on cooldown", async () => {
      const response: FaucetStatusResponse = {
        success: true,
        data: {
          [TEST_ADDRESS]: {
            on_cooldown: false,
            assets: {
              usd: { on_cooldown: false },
              eth: { on_cooldown: false },
            },
          },
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse(response));

      const client = createClient();
      const canRequest = await client.canRequest(TEST_ADDRESS);

      expect(canRequest).toBe(true);
    });

    it("should return false when all assets on cooldown", async () => {
      const response: FaucetStatusResponse = {
        success: true,
        data: {
          [TEST_ADDRESS]: {
            on_cooldown: true,
            assets: {
              usd: { on_cooldown: true, expires_at: 1234567890 },
              eth: { on_cooldown: true, expires_at: 1234567890 },
            },
          },
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse(response));

      const client = createClient();
      const canRequest = await client.canRequest(TEST_ADDRESS);

      expect(canRequest).toBe(false);
    });

    it("should return true when ANY asset is available", async () => {
      const response: FaucetStatusResponse = {
        success: true,
        data: {
          [TEST_ADDRESS]: {
            on_cooldown: true,
            assets: {
              usd: { on_cooldown: true, expires_at: 1234567890 },
              eth: { on_cooldown: false },
            },
          },
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse(response));

      const client = createClient();
      expect(await client.canRequest(TEST_ADDRESS)).toBe(true);
    });

    it("should check a specific asset", async () => {
      const response: FaucetStatusResponse = {
        success: true,
        data: {
          [TEST_ADDRESS]: {
            on_cooldown: true,
            assets: {
              usd: { on_cooldown: true, expires_at: 1234567890 },
              eth: { on_cooldown: false },
            },
          },
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse(response));
      const client = createClient();
      expect(await client.canRequest(TEST_ADDRESS, "usd")).toBe(false);

      mockFetch.mockResolvedValueOnce(mockResponse(response));
      expect(await client.canRequest(TEST_ADDRESS, "eth")).toBe(true);
    });
  });

  describe("FaucetRequestError", () => {
    it("should identify ALREADY_CLAIMED as isOnCooldown", () => {
      const err = new FaucetRequestError(
        "Already claimed",
        "ALREADY_CLAIMED",
        "Try again tomorrow"
      );
      expect(err.isOnCooldown).toBe(true);
      expect(err.isIpRateLimited).toBe(false);
      expect(err.isRateLimited).toBe(true);
    });

    it("should identify IP_RATE_LIMITED as isIpRateLimited", () => {
      const err = new FaucetRequestError(
        "Rate limited",
        "IP_RATE_LIMITED",
        undefined,
        429
      );
      expect(err.isIpRateLimited).toBe(true);
      expect(err.isOnCooldown).toBe(false);
      expect(err.isRateLimited).toBe(true);
    });

    it("should identify 429 status as isIpRateLimited", () => {
      const err = new FaucetRequestError(
        "Rate limited",
        "UNKNOWN",
        undefined,
        429
      );
      expect(err.isIpRateLimited).toBe(true);
      expect(err.isRateLimited).toBe(true);
    });

    it("should not identify non-rate-limit errors as rate limited", () => {
      const err = new FaucetRequestError("Invalid address", "INVALID_ADDRESS");
      expect(err.isRateLimited).toBe(false);
      expect(err.isOnCooldown).toBe(false);
      expect(err.isIpRateLimited).toBe(false);
    });
  });

  describe("timeout", () => {
    it("should throw TIMEOUT on abort", async () => {
      const abortErr = new Error("The operation was aborted");
      abortErr.name = "AbortError";
      mockFetch.mockRejectedValueOnce(abortErr);

      const client = createFaucetClient(FAUCET_URL, {
        fetch: mockFetch as unknown as typeof fetch,
        timeout: 5,
      });

      const err = await client
        .requestTokens(TEST_ADDRESS)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(FaucetRequestError);
      expect((err as FaucetRequestError).code).toBe("TIMEOUT");
    });
  });

  describe("URL normalization", () => {
    it("should handle trailing slash in base URL", async () => {
      const response: FaucetStatusResponse = {
        success: true,
        data: {},
      };

      mockFetch.mockResolvedValueOnce(mockResponse(response));

      // URL with trailing slash
      const client = createFaucetClient("https://faucet.example.com/", {
        fetch: mockFetch as unknown as typeof fetch,
      });
      await client.checkCooldown([TEST_ADDRESS]);

      // Should not have double slash
      expect(mockFetch).toHaveBeenCalledWith(
        "https://faucet.example.com/drip/status",
        expect.anything()
      );
    });
  });
});
