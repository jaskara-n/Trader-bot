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
  type TransactionReceipt,
  type PublicClient,
  type Hash,
  formatUnits,
} from "viem";
import { baseSepolia } from "viem/chains";
import { TRADE_HANDLER_ABI } from "./types";
import { recordTransaction } from "@/app/utils/transactionStore";
import { Transaction } from "@/app/types/transactions";
import { TOKEN_ADDRESSES, CONTRACT_ADDRESSES, POOL_CONFIGS } from "./config";

// ERC20 ABI for approvals
const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
] as const;

class SwapActionProvider extends ActionProvider {
  private publicClient: PublicClient;

  constructor() {
    super("swap-action-provider", []);
    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
      batch: {
        multicall: true,
      },
    }) as PublicClient;
  }

  private async verifyTransaction(
    hash: Hash,
    expectedStatus: "success" | "reverted" = "success"
  ): Promise<TransactionReceipt> {
    console.log(`Waiting for transaction ${hash}...`);
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    console.log(`Transaction status: ${receipt.status === "success" ? "success" : "failed"}`);
    
    if (receipt.status !== expectedStatus) {
      throw new Error(`Transaction ${expectedStatus === "success" ? "failed" : "succeeded"} unexpectedly. Hash: ${hash}`);
    }
    
    return receipt;
  }

  private async getTokenBalance(tokenAddress: Address, walletAddress: Address): Promise<bigint> {
    const balance = await this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress],
    }) as bigint;
    return balance;
  }

  private async approveToken(
    wallet: ViemWalletProvider,
    tokenAddress: Address,
    spenderAddress: Address,
    amount: bigint
  ): Promise<void> {
    try {
      const walletAddress = wallet.getAddress() as Address;
      console.log(`Checking allowance for token ${tokenAddress}...`);
      
      // Check current allowance
      const currentAllowance = await this.publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [walletAddress, spenderAddress],
      }) as bigint;

      console.log(`Current allowance: ${formatUnits(currentAllowance, 18)}`);

      // If allowance is sufficient, no need to approve
      if (currentAllowance >= amount) {
        console.log("Token already approved");
        return;
      }

      console.log(`Approving token ${tokenAddress} for amount ${formatUnits(amount, 18)}...`);
      
      // Approve token
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spenderAddress, amount],
      });

      const hash = await wallet.sendTransaction({
        to: tokenAddress,
        data: approveData,
      });

      console.log(`Approval transaction sent: ${hash}`);

      // Wait for approval transaction and verify it succeeded
      await this.verifyTransaction(hash as Hash);
      
      // Verify the allowance was actually updated
      const newAllowance = await this.publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [walletAddress, spenderAddress],
      }) as bigint;

      if (newAllowance < amount) {
        throw new Error(`Approval failed. New allowance (${formatUnits(newAllowance, 18)}) is less than required amount (${formatUnits(amount, 18)})`);
      }

      console.log("Token approval successful");
    } catch (error) {
      console.error("Error in token approval:", error);
      throw new Error(`Failed to approve token: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    const walletAddress = wallet.getAddress() as Address;
    console.log("Wallet address:", walletAddress);

    const { tokenIn, tokenOut, amountIn, minAmountOut, fee = 3000 } = args;

    try {
      // Get token addresses from symbols
      const tokenInAddress = TOKEN_ADDRESSES[tokenIn];
      const tokenOutAddress = TOKEN_ADDRESSES[tokenOut];

      console.log(`Swapping ${amountIn} ${tokenIn} for ${tokenOut}`);
      console.log(`Token addresses - In: ${tokenInAddress}, Out: ${tokenOutAddress}`);

      // Get balances BEFORE swap
      const balanceBeforeInput = await this.getTokenBalance(tokenInAddress, walletAddress);
      const balanceBeforeOutput = await this.getTokenBalance(tokenOutAddress, walletAddress);
      console.log(`Balance before swap (${tokenIn}): ${formatUnits(balanceBeforeInput, 18)}`);
      console.log(`Balance before swap (${tokenOut}): ${formatUnits(balanceBeforeOutput, 18)}`);

      const amountInParsed = parseUnits(amountIn, 18);
      if (balanceBeforeInput < amountInParsed) {
        throw new Error(`Insufficient ${tokenIn} balance. Required: ${amountIn}, Available: ${formatUnits(balanceBeforeInput, 18)}`);
      }

      // Parse amounts
      const minAmountOutParsed = parseUnits(minAmountOut, 18);

      // Get pool configuration
      const poolKey = POOL_CONFIGS.USDC_UNI;

      // Determine swap direction
      const zeroForOne = tokenIn === "USDC";
      console.log(`Swap direction: ${zeroForOne ? "USDC to UNI" : "UNI to USDC"}`);

      // Approve token before swap
      await this.approveToken(
        wallet,
        tokenInAddress,
        CONTRACT_ADDRESSES.TRADE_HANDLER,
        amountInParsed
      );

      // Encode the function data
      const data = encodeFunctionData({
        abi: TRADE_HANDLER_ABI,
        functionName: "conductTradeExactInputSingle",
        args: [
          poolKey,
          walletAddress,
          amountInParsed,
          minAmountOutParsed,
          BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour deadline
          zeroForOne,
        ],
      });

      console.log("Sending swap transaction...");
      // Use wallet's sendTransaction method
      const txHash = await wallet.sendTransaction({
        to: CONTRACT_ADDRESSES.TRADE_HANDLER,
        data: data,
      });

      console.log(`Swap transaction sent: ${txHash}`);

      // Wait for transaction and verify it succeeded
      const receipt = await this.verifyTransaction(txHash as Hash);
      const actualTxHash = receipt.transactionHash;
      console.log(`Actual transaction hash: ${actualTxHash}`);

      // Get balances AFTER swap
      const balanceAfterInput = await this.getTokenBalance(tokenInAddress, walletAddress);
      const balanceAfterOutput = await this.getTokenBalance(tokenOutAddress, walletAddress);
      console.log(`Balance after swap (${tokenIn}): ${formatUnits(balanceAfterInput, 18)}`);
      console.log(`Balance after swap (${tokenOut}): ${formatUnits(balanceAfterOutput, 18)}`);

      // Calculate actual amounts
      const actualInputAmount = balanceBeforeInput - balanceAfterInput;
      const actualOutputAmount = balanceAfterOutput - balanceBeforeOutput;
      
      console.log(`Actual input amount: ${formatUnits(actualInputAmount, 18)} ${tokenIn}`);
      console.log(`Actual output amount: ${formatUnits(actualOutputAmount, 18)} ${tokenOut}`);

      // Record transaction with actual amounts
      const txRecord: Transaction = {
        id: `swap-${Date.now()}`,
        type: 'swap',
        details: {
          tokens: [tokenIn, tokenOut],
          amounts: [
            formatUnits(actualInputAmount, 18),
            formatUnits(actualOutputAmount, 18)
          ],
          balances: {
            before: {
              [tokenIn]: formatUnits(balanceBeforeInput, 18),
              [tokenOut]: formatUnits(balanceBeforeOutput, 18)
            },
            after: {
              [tokenIn]: formatUnits(balanceAfterInput, 18),
              [tokenOut]: formatUnits(balanceAfterOutput, 18)
            }
          },
          timestamp: Date.now(),
          txHash: actualTxHash,
        }
      };
      
      await recordTransaction(walletAddress, txRecord);

      return `Successfully swapped ${formatUnits(actualInputAmount, 18)} ${tokenIn} for ${formatUnits(actualOutputAmount, 18)} ${tokenOut}. Transaction hash: ${actualTxHash}`;
    } catch (error: unknown) {
      console.error("Error in swap:", error);
      throw new Error(`Swap failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  supportsNetwork(network: Network): boolean {
    return true;
  }
}

export const swapActionProvider = () => {
  return new SwapActionProvider();
};