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

      try {
        await client.requestTokens(TEST_ADDRESS);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(FaucetRequestError);
        const faucetErr = err as FaucetRequestError;
        expect(faucetErr.code).toBe("ALREADY_CLAIMED");
        expect(faucetErr.isRateLimited).toBe(true);
      }
    });

    it("should throw FaucetRequestError on invalid address", async () => {
      const response: FaucetDripResponse = {
        success: false,
        error: {
          code: "INVALID_ADDRESS",
          message: "Invalid Ethereum address",
          details: "Address must be a valid 40-character hex string",
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse(response, false));

      const client = createClient();

      try {
        await client.requestTokens(TEST_ADDRESS);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(FaucetRequestError);
        const faucetErr = err as FaucetRequestError;
        expect(faucetErr.code).toBe("INVALID_ADDRESS");
        expect(faucetErr.isRateLimited).toBe(false);
      }
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const client = createClient();

      try {
        await client.requestTokens(TEST_ADDRESS);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(FaucetRequestError);
        const faucetErr = err as FaucetRequestError;
        expect(faucetErr.code).toBe("NETWORK_ERROR");
      }
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

      try {
        await client.checkCooldown(addresses);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(FaucetRequestError);
        const faucetErr = err as FaucetRequestError;
        expect(faucetErr.code).toBe("TOO_MANY_ADDRESSES");
      }
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

    it("should return false when on cooldown", async () => {
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
  });

  describe("FaucetRequestError", () => {
    it("should correctly identify rate limit errors by code", () => {
      const err = new FaucetRequestError(
        "Already claimed",
        "ALREADY_CLAIMED",
        "Try again tomorrow"
      );
      expect(err.isRateLimited).toBe(true);
    });

    it("should correctly identify rate limit errors by status code", () => {
      const err = new FaucetRequestError(
        "Rate limited",
        "UNKNOWN",
        undefined,
        429
      );
      expect(err.isRateLimited).toBe(true);
    });

    it("should not identify non-rate-limit errors as rate limited", () => {
      const err = new FaucetRequestError("Invalid address", "INVALID_ADDRESS");
      expect(err.isRateLimited).toBe(false);
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
