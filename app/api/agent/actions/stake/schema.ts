import { z } from "zod";

/**
 * Zod schema for frontend generation parameters
 */
export const swapActionSchema = z.object({
  token: z.string().describe("User's specific token address to swap"),
});
