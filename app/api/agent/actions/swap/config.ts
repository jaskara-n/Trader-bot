import { type Address } from "viem";

// Token addresses on Base Sepolia
export const TOKEN_ADDRESSES = {
  USDC: "0x10CEA50486207f88AbC954690fE80783E73c3BfE" as Address,
  UNI: "0x8b39C6b0FB43D18Bf2b82f9D6BfD966c173dA42A" as Address,
} as const;

// Contract addresses
export const CONTRACT_ADDRESSES = {
  TRADE_HANDLER: "0x00116c0965D08f284A50EcCbCB0bDDC7A9E75b08" as Address,
} as const;

// Pool configurations
export const POOL_CONFIGS = {
  USDC_UNI: {
    currency0: TOKEN_ADDRESSES.USDC,
    currency1: TOKEN_ADDRESSES.UNI,
    fee: 3000,
    tickSpacing: 60,
    hooks: "0x0000000000000000000000000000000000000000" as Address,
  },
} as const;

// Token decimals (for future use)
export const TOKEN_DECIMALS = {
  USDC: 18,
  UNI: 18,
} as const;

// Type for token symbols
export type TokenSymbol = keyof typeof TOKEN_ADDRESSES;

// Type for pool keys
export type PoolKey = {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}; 