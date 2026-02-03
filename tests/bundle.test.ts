/**
 * Bundle type tests.
 *
 * These tests verify that the TypeScript SDK correctly serializes and
 * deserializes bundle types to match the Rust signet-bundle crate.
 */
import { describe, expect, it } from "vitest";
import type { Address, Hex } from "viem";
import {
  deserializeCallBundle,
  deserializeCallBundleResponse,
  deserializeEthBundle,
  serializeCallBundle,
  serializeEthBundle,
  SignetCallBundleBuilder,
  SignetEthBundleBuilder,
} from "../src/index.js";
import type {
  SerializedSignetCallBundle,
  SerializedSignetCallBundleResponse,
  SerializedSignetEthBundle,
} from "../src/index.js";
import vectors from "./bundle-vectors.json";

interface EthBundleVector {
  name: string;
  bundle: SerializedSignetEthBundle;
}

interface CallBundleVector {
  name: string;
  bundle: SerializedSignetCallBundle;
}

interface CallBundleResponseVector {
  name: string;
  response: SerializedSignetCallBundleResponse;
}

describe("SignetEthBundle", () => {
  const ethBundles = vectors.ethBundles as EthBundleVector[];

  describe("vector tests", () => {
    for (const v of ethBundles) {
      it(`deserializes and re-serializes ${v.name}`, () => {
        const deserialized = deserializeEthBundle(v.bundle);
        const reserialized = serializeEthBundle(deserialized);
        expect(reserialized).toEqual(v.bundle);
      });
    }
  });

  describe("round-trip tests", () => {
    for (const v of ethBundles) {
      it(`round-trips ${v.name}`, () => {
        const first = deserializeEthBundle(v.bundle);
        const serialized = serializeEthBundle(first);
        const second = deserializeEthBundle(serialized);
        expect(second).toEqual(first);
      });
    }
  });

  describe("builder tests", () => {
    it("builds minimal bundle", () => {
      const bundle = SignetEthBundleBuilder.new()
        .withTx("0x02f8746573745f74785f31")
        .withBlockNumber(12345678n)
        .build();

      expect(bundle.txs).toEqual(["0x02f8746573745f74785f31"]);
      expect(bundle.blockNumber).toBe(12345678n);
      expect(bundle.hostTxs).toBeUndefined();
    });

    it("builds bundle with host txs", () => {
      const bundle = SignetEthBundleBuilder.new()
        .withTx("0x02f8rollup")
        .withHostTx("0x02f8host1")
        .withHostTx("0x02f8host2")
        .withBlockNumber(12345678n)
        .build();

      expect(bundle.txs).toEqual(["0x02f8rollup"]);
      expect(bundle.hostTxs).toEqual(["0x02f8host1", "0x02f8host2"]);
    });

    it("builds bundle with timestamps", () => {
      const bundle = SignetEthBundleBuilder.new()
        .withTx("0x02f8test")
        .withBlockNumber(12345678n)
        .withMinTimestamp(1700000000)
        .withMaxTimestamp(1700003600)
        .build();

      expect(bundle.minTimestamp).toBe(1700000000);
      expect(bundle.maxTimestamp).toBe(1700003600);
    });

    it("builds bundle with reverting hashes", () => {
      const hash1 =
        "0xabababababababababababababababababababababababababababababababab" as Hex;
      const hash2 =
        "0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd" as Hex;

      const bundle = SignetEthBundleBuilder.new()
        .withTx("0x02f8test")
        .withBlockNumber(12345678n)
        .withRevertingTxHashes([hash1, hash2])
        .build();

      expect(bundle.revertingTxHashes).toEqual([hash1, hash2]);
    });

    it("builds replacement bundle", () => {
      const bundle = SignetEthBundleBuilder.new()
        .withTx("0x02f8replacement")
        .withBlockNumber(12345678n)
        .withReplacementUuid("550e8400-e29b-41d4-a716-446655440000")
        .build();

      expect(bundle.replacementUuid).toBe(
        "550e8400-e29b-41d4-a716-446655440000"
      );
    });

    it("builds full bundle", () => {
      const bundle = SignetEthBundleBuilder.new()
        .withTxs(["0x02f8tx1", "0x02f8tx2"])
        .withHostTxs(["0x02f8host"])
        .withBlockNumber(12345678n)
        .withMinTimestamp(1700000000)
        .withMaxTimestamp(1700003600)
        .withRevertingTxHash(
          "0xefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefef"
        )
        .withDroppingTxHash(
          "0x1111111111111111111111111111111111111111111111111111111111111111"
        )
        .withRefundPercent(90)
        .withRefundRecipient(
          "0x2222222222222222222222222222222222222222" as Address
        )
        .withRefundTxHash(
          "0x3333333333333333333333333333333333333333333333333333333333333333"
        )
        .build();

      expect(bundle.txs).toHaveLength(2);
      expect(bundle.hostTxs).toHaveLength(1);
      expect(bundle.refundPercent).toBe(90);
      expect(bundle.refundRecipient).toBe(
        "0x2222222222222222222222222222222222222222"
      );
    });

    it("throws without blockNumber", () => {
      expect(() =>
        SignetEthBundleBuilder.new().withTx("0x02f8test").build()
      ).toThrow("SignetEthBundle requires a blockNumber");
    });

    it("throws without transactions", () => {
      expect(() =>
        SignetEthBundleBuilder.new().withBlockNumber(12345678n).build()
      ).toThrow("SignetEthBundle requires at least one transaction");
    });
  });
});

describe("SignetCallBundle", () => {
  const callBundles = vectors.callBundles as CallBundleVector[];

  describe("vector tests", () => {
    for (const v of callBundles) {
      it(`deserializes and re-serializes ${v.name}`, () => {
        const deserialized = deserializeCallBundle(v.bundle);
        const reserialized = serializeCallBundle(deserialized);
        expect(reserialized).toEqual(v.bundle);
      });
    }
  });

  describe("round-trip tests", () => {
    for (const v of callBundles) {
      it(`round-trips ${v.name}`, () => {
        const first = deserializeCallBundle(v.bundle);
        const serialized = serializeCallBundle(first);
        const second = deserializeCallBundle(serialized);
        expect(second).toEqual(first);
      });
    }
  });

  describe("builder tests", () => {
    it("builds minimal bundle", () => {
      const bundle = SignetCallBundleBuilder.new()
        .withTx("0x02f8test")
        .withBlockNumber(12345678n)
        .withStateBlockNumber(12345677n)
        .build();

      expect(bundle.txs).toEqual(["0x02f8test"]);
      expect(bundle.blockNumber).toBe(12345678n);
      expect(bundle.stateBlockNumber).toBe(12345677n);
    });

    it("builds bundle with overrides", () => {
      const bundle = SignetCallBundleBuilder.new()
        .withTx("0x02f8test")
        .withBlockNumber(12345678n)
        .withStateBlockNumber(12345677n)
        .withTimestamp(1700000000n)
        .withGasLimit(30000000n)
        .withBaseFee(1000000000n)
        .build();

      expect(bundle.timestamp).toBe(1700000000n);
      expect(bundle.gasLimit).toBe(30000000n);
      expect(bundle.baseFee).toBe(1000000000n);
    });

    it("builds bundle with coinbase", () => {
      const bundle = SignetCallBundleBuilder.new()
        .withTx("0x02f8test")
        .withBlockNumber(12345678n)
        .withStateBlockNumber("latest")
        .withCoinbase("0x4242424242424242424242424242424242424242" as Address)
        .withTimeout(5)
        .build();

      expect(bundle.stateBlockNumber).toBe("latest");
      expect(bundle.coinbase).toBe(
        "0x4242424242424242424242424242424242424242"
      );
      expect(bundle.timeout).toBe(5);
    });

    it("throws without blockNumber", () => {
      expect(() =>
        SignetCallBundleBuilder.new()
          .withTx("0x02f8test")
          .withStateBlockNumber(12345677n)
          .build()
      ).toThrow("SignetCallBundle requires a blockNumber");
    });

    it("throws without stateBlockNumber", () => {
      expect(() =>
        SignetCallBundleBuilder.new()
          .withTx("0x02f8test")
          .withBlockNumber(12345678n)
          .build()
      ).toThrow("SignetCallBundle requires a stateBlockNumber");
    });

    it("throws without transactions", () => {
      expect(() =>
        SignetCallBundleBuilder.new()
          .withBlockNumber(12345678n)
          .withStateBlockNumber(12345677n)
          .build()
      ).toThrow("SignetCallBundle requires at least one transaction");
    });
  });
});

describe("SignetCallBundleResponse", () => {
  const responses = vectors.callBundleResponses as CallBundleResponseVector[];

  describe("deserialization", () => {
    for (const v of responses) {
      it(`deserializes ${v.name}`, () => {
        const deserialized = deserializeCallBundleResponse(v.response);

        expect(deserialized.bundleHash).toBe(v.response.bundleHash);
        expect(deserialized.bundleGasPrice).toBe(
          BigInt(v.response.bundleGasPrice)
        );
        expect(deserialized.coinbaseDiff).toBe(BigInt(v.response.coinbaseDiff));
        expect(deserialized.stateBlockNumber).toBe(v.response.stateBlockNumber);
        expect(deserialized.totalGasUsed).toBe(v.response.totalGasUsed);
        expect(deserialized.results).toHaveLength(v.response.results.length);

        for (let i = 0; i < deserialized.results.length; i++) {
          const result = deserialized.results[i];
          const rawResult = v.response.results[i];
          expect(result.gasUsed).toBe(rawResult.gasUsed);
          expect(result.fromAddress).toBe(rawResult.fromAddress);
          expect(result.txHash).toBe(rawResult.txHash);
        }
      });
    }
  });

  it("deserializes response with value", () => {
    const minimalResponse = responses.find(
      (r) => r.name === "minimal_response"
    )?.response;
    if (!minimalResponse) throw new Error("minimal_response not found");

    const deserialized = deserializeCallBundleResponse(minimalResponse);
    expect(deserialized.results[0].value).toBe("0x726573756c745f64617461");
    expect(deserialized.results[0].revert).toBeUndefined();
  });

  it("deserializes response with revert", () => {
    const revertedResponse = responses.find(
      (r) => r.name === "reverted_response"
    )?.response;
    if (!revertedResponse) throw new Error("reverted_response not found");

    const deserialized = deserializeCallBundleResponse(revertedResponse);
    expect(deserialized.results[0].value).toBeUndefined();
    expect(deserialized.results[0].revert).toBe(
      "0x657865637574696f6e207265766572746564"
    );
  });
});
