import { ActionProvider, CreateAction, Network } from "@coinbase/agentkit";
import type { z } from "zod";
import { swapActionSchema } from "./schema";
import { ViemWalletProvider } from "@coinbase/agentkit";
import { createPublicClient, http, parseUnits, getContract, type Address } from "viem";
import { sepolia } from "viem/chains";
import { TRADE_HANDLER_ABI, type PoolKey, type TradeHandlerV4Contract } from "./types";

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
      // Create public client for contract interaction
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(),
      });

      // Get the TradeHandlerV4 contract address from your configuration
      const tradeHandlerAddress = "0x00116c0965D08f284A50EcCbCB0bDDC7A9E75b08" as Address; // Replace with actual address

      // Create contract instance
      const tradeHandler = getContract({
        address: tradeHandlerAddress,
        abi: TRADE_HANDLER_ABI,
        client: publicClient,
      }) as unknown as TradeHandlerV4Contract;

      // Parse amounts
      const amountInParsed = parseUnits(amountIn, 18); // Adjust decimals as needed
      const minAmountOutParsed = parseUnits(minAmountOut, 18); // Adjust decimals as needed

      // Get pool key
      const poolKey = await tradeHandler.read.getPoolKey([
        tokenIn as Address,
        tokenOut as Address,
        fee
      ]);

      // Determine swap direction
      const zeroForOne = tokenIn < tokenOut;

      // Execute swap
      const tx = await tradeHandler.write.conductTradeExactInputSingle([
        poolKey,
        wallet.getAddress() as Address,
        amountInParsed,
        minAmountOutParsed,
        BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour deadline
        zeroForOne
      ]);

      // Wait for transaction
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

      return `Successfully swapped ${amountIn} ${tokenIn} for ${minAmountOut} ${tokenOut}. Transaction hash: ${receipt.transactionHash}`;
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