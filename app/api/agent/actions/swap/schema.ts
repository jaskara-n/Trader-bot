import { z } from "zod";

export const swapActionSchema = z.object({
  tokenIn: z.enum(["USDC", "UNI"]).describe("Input token symbol (USDC or UNI)"),
  tokenOut: z.enum(["USDC", "UNI"]).describe("Output token symbol (USDC or UNI)"),
  amountIn: z.string().describe("Amount of input token to swap"),
  minAmountOut: z.string().describe("Minimum amount of output token to receive"),
  fee: z.number().optional().describe("Fee tier for the swap (default: 3000)"),
}); 