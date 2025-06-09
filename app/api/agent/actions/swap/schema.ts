import { z } from "zod";

export const swapActionSchema = z.object({
  tokenIn: z.string().describe("Address of the input token to swap from"),
  tokenOut: z.string().describe("Address of the output token to swap to"),
  amountIn: z.string().describe("Amount of input token to swap"),
  minAmountOut: z.string().describe("Minimum amount of output token to receive"),
  fee: z.number().optional().describe("Fee tier for the swap (default: 3000)"),
}); 