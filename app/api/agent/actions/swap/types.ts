import { Address, Hex } from "viem";

export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

export const TRADE_HANDLER_ABI = [
  {
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "fee", type: "uint24" }
    ],
    name: "getPoolKey",
    outputs: [
      { name: "currency0", type: "address" },
      { name: "currency1", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "tickSpacing", type: "int24" },
      { name: "hooks", type: "address" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "key", type: "tuple", components: [
        { name: "currency0", type: "address" },
        { name: "currency1", type: "address" },
        { name: "fee", type: "uint24" },
        { name: "tickSpacing", type: "int24" },
        { name: "hooks", type: "address" }
      ]},
      { name: "payer", type: "address" },
      { name: "amountIn", type: "uint128" },
      { name: "minAmountOut", type: "uint128" },
      { name: "deadline", type: "uint256" },
      { name: "zeroForOne", type: "bool" }
    ],
    name: "conductTradeExactInputSingle",
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function"
  }
] as const;

export type TradeHandlerV4Contract = {
  read: {
    getPoolKey: (args: [Address, Address, number]) => Promise<PoolKey>;
  };
  write: {
    conductTradeExactInputSingle: (args: [
      PoolKey,
      Address,
      bigint,
      bigint,
      bigint,
      boolean
    ]) => Promise<Hex>;
  };
}; 