/**
 * WETH9 deposit/withdraw ABI. For standard ERC20 methods, use viem's erc20Abi.
 */
export const wethAbi = [
  {
    type: "function",
    name: "deposit",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [{ name: "wad", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Deposit",
    inputs: [
      {
        name: "dst",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "wad",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Withdrawal",
    inputs: [
      {
        name: "src",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "wad",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
] as const;
