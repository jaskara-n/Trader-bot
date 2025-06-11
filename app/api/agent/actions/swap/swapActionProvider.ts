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
  type Chain,
  type Transport,
  type Client,
  type PublicActions,
  type WalletClient,
  type Account,
  formatUnits,
} from "viem";
import { baseSepolia } from "viem/chains";
import { TRADE_HANDLER_ABI } from "./types";
import { TOKEN_ADDRESSES, CONTRACT_ADDRESSES, POOL_CONFIGS, type PoolKey } from "./config";

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
    let approvalTxHash: Hash | undefined;
    let swapTxHash: Hash | undefined;

    try {
      // Get token addresses from symbols
      const tokenInAddress = TOKEN_ADDRESSES[tokenIn];
      const tokenOutAddress = TOKEN_ADDRESSES[tokenOut];

      console.log(`Swapping ${amountIn} ${tokenIn} for ${tokenOut}`);
      console.log(`Token addresses - In: ${tokenInAddress}, Out: ${tokenOutAddress}`);

      // Check token balances before swap
      const balanceBefore = await this.getTokenBalance(tokenInAddress, walletAddress);
      console.log(`Balance before swap: ${formatUnits(balanceBefore, 18)} ${tokenIn}`);

      const amountInParsed = parseUnits(amountIn, 18);
      if (balanceBefore < amountInParsed) {
        throw new Error(`Insufficient ${tokenIn} balance. Required: ${amountIn}, Available: ${formatUnits(balanceBefore, 18)}`);
      }

      // Parse amounts
      const minAmountOutParsed = parseUnits(minAmountOut, 18);

      // Get pool configuration
      const poolKey = POOL_CONFIGS.USDC_UNI;

      // Determine swap direction
      const zeroForOne = tokenIn === "USDC";
      console.log(`Swap direction: ${zeroForOne ? "USDC to UNI" : "UNI to USDC"}`);

      // Approve token before swap
      try {
        const approvalData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CONTRACT_ADDRESSES.TRADE_HANDLER, amountInParsed],
        });

        approvalTxHash = await wallet.sendTransaction({
          to: tokenInAddress,
          data: approvalData,
        }) as Hash;

        console.log(`Approval transaction sent: ${approvalTxHash}`);
        await this.verifyTransaction(approvalTxHash);
        console.log("Token approval successful");
      } catch (error) {
        console.error("Error in approval:", error);
        throw new Error(`Token approval failed: ${error instanceof Error ? error.message : String(error)}`);
      }

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
      swapTxHash = await wallet.sendTransaction({
        to: CONTRACT_ADDRESSES.TRADE_HANDLER,
        data: data,
      }) as Hash;

      console.log(`Swap transaction sent: ${swapTxHash}`);

      // Wait for transaction and verify it succeeded
      const receipt = await this.verifyTransaction(swapTxHash);

      // Verify the swap actually happened by checking balances
      const balanceAfter = await this.getTokenBalance(tokenInAddress, walletAddress);
      console.log(`Balance after swap: ${formatUnits(balanceAfter, 18)} ${tokenIn}`);

      if (balanceAfter >= balanceBefore) {
        throw new Error(`Swap transaction succeeded but token balance did not decrease. Before: ${formatUnits(balanceBefore, 18)}, After: ${formatUnits(balanceAfter, 18)}`);
      }

      const balanceChange = balanceBefore - balanceAfter;
      console.log(`Balance change: ${formatUnits(balanceChange, 18)} ${tokenIn}`);

      // Check if we received the output token
      const outputBalance = await this.getTokenBalance(tokenOutAddress, walletAddress);
      console.log(`Output token balance: ${formatUnits(outputBalance, 18)} ${tokenOut}`);

      // Construct response with transaction hashes and network information
      const response = {
        success: true,
        message: `Successfully swapped ${amountIn} ${tokenIn} for ${tokenOut}`,
        network: {
          name: "Base Sepolia",
          chainId: baseSepolia.id,
          explorer: "https://base-sepolia.blockscout.com/tx/"
        },
        transactions: {
          approval: {
            hash: approvalTxHash,
            url: `https://base-sepolia.blockscout.com/tx/${approvalTxHash}`
          },
          swap: {
            hash: swapTxHash,
            url: `https://base-sepolia.blockscout.com/tx/${swapTxHash}`
          }
        }
      };

      // Return a formatted string that includes all transaction hashes and network info
      return JSON.stringify(response);
    } catch (error: unknown) {
      console.error("Error in swap:", error);
      const errorResponse = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        network: {
          name: "Base Sepolia",
          chainId: baseSepolia.id,
          explorer: "https://base-sepolia.blockscout.com/tx/"
        },
        transactions: {
          approval: approvalTxHash ? {
            hash: approvalTxHash,
            url: `https://base-sepolia.blockscout.com/tx/${approvalTxHash}`
          } : undefined,
          swap: swapTxHash ? {
            hash: swapTxHash,
            url: `https://base-sepolia.blockscout.com/tx/${swapTxHash}`
          } : undefined
        }
      };
      throw new Error(JSON.stringify(errorResponse));
    }
  }

  supportsNetwork(network: Network): boolean {
    return true;
  }
}

export const swapActionProvider = () => {
  return new SwapActionProvider();
};
