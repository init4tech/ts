import type { Address, Hex, PublicClient } from "viem";
import type { Output } from "../types/primitives.js";
import { rollupOrdersAbi } from "../abi/rollupOrders.js";

export async function getOutputWitness(
  client: PublicClient,
  outputs: readonly Output[],
  contractAddress: Address
): Promise<{ witnessHash: Hex; witnessTypeString: string }> {
  return client.readContract({
    address: contractAddress,
    abi: rollupOrdersAbi,
    functionName: "outputWitness",
    args: [outputs],
  });
}
