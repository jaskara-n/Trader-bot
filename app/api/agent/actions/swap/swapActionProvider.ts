import { ActionProvider, CreateAction, Network } from "@coinbase/agentkit";
import type { z } from "zod";
import { swapActionSchema } from "./schema";
import { ViemWalletProvider } from "@coinbase/agentkit";
import {
  createPublicClient,
  http,
  parseUnits,
  encodeFunctionData,
  type Address,
} from "viem";
import { baseSepolia } from "viem/chains";
import { TRADE_HANDLER_ABI, type PoolKey } from "./types";

class SwapActionProvider extends ActionProvider {
  constructor() {
    super("swap-action-provider", []);
  }

  @CreateAction({
    name: "swap-action-provider",
    description: "Swaps tokens using Uniswap V4",
    schema: swapActionSchema,
  })
  public async swapAction(
    wallet: ViemWalletProvider,
    args: z.infer<typeof swapActionSchema>
  ): Promise<string> {
    console.log("Swap action triggered");
    console.log("Wallet address:", wallet.getAddress());

    const { tokenIn, tokenOut, amountIn, minAmountOut, fee = 3000 } = args;

    try {
      // Create public client for reading
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      });

      const tradeHandlerAddress =
        "0x00116c0965D08f284A50EcCbCB0bDDC7A9E75b08" as Address;

      // Parse amounts
      const amountInParsed = parseUnits(amountIn, 18);
      const minAmountOutParsed = parseUnits(minAmountOut, 18);

      // Create PoolKey directly
      const poolKey: PoolKey = {
        currency0: "0x10cea50486207f88abc954690fe80783e73c3bfe" as Address,
        currency1: "0x8b39c6b0fb43d18bf2b82f9d6bfd966c173da42a" as Address,
        fee: fee,
        tickSpacing: 60,
        hooks: "0x0000000000000000000000000000000000000000" as Address,
      };

      // Determine swap direction
      const zeroForOne = tokenIn.toLowerCase() < tokenOut.toLowerCase();

      // Encode the function data
      const data = encodeFunctionData({
        abi: TRADE_HANDLER_ABI,
        functionName: "conductTradeExactInputSingle",
        args: [
          poolKey,
          wallet.getAddress() as Address,
          amountInParsed,
          minAmountOutParsed,
          BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour deadline
          zeroForOne,
        ],
      });

      // Use wallet's sendTransaction method
      const hash = await wallet.sendTransaction({
        to: tradeHandlerAddress,
        data: data,
        // Add value if swapping from ETH
        // value: tokenIn === "ETH" ? amountInParsed : undefined,
      });

      // Wait for transaction
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
      });

      return `Successfully swapped ${amountIn} ${tokenIn} for ${tokenOut}. Transaction hash: ${receipt.transactionHash}`;
    } catch (error: unknown) {
      console.error("Error in swap:", error);
      throw error;
    }
  }

  supportsNetwork(network: Network): boolean {
    return true;
  }
}

export const swapActionProvider = () => {
  return new SwapActionProvider();
};
