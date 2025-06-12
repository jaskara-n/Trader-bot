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
  type Chain,
  type Transport,
} from "viem";
import { baseSepolia } from "viem/chains";
import { TRADE_HANDLER_ABI } from "./types";
import { recordTransaction } from "@/app/utils/transactionStore";
import { Transaction } from "@/app/types/transactions";
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

class SwapActionProvider extends ActionProvider<ViemWalletProvider> {
  private publicClient: PublicClient<Transport, typeof baseSepolia>;
  private statusCallback: ((status: string, isDetailed?: boolean) => void) | null = null;

  constructor(statusCallback?: (status: string, isDetailed?: boolean) => void) {
    super("swap-action-provider", []);
    if (statusCallback) {
      this.statusCallback = statusCallback;
    }
    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
      batch: {
        multicall: true,
      },
    }) as PublicClient<Transport, typeof baseSepolia>;
  }

  setStatusCallback(callback: (status: string, isDetailed?: boolean) => void) {
    this.statusCallback = callback;
  }

  private updateStatus(status: string, isDetailed: boolean = false) {
    if (this.statusCallback) {
      this.statusCallback(status, isDetailed);
    }
  }

  private async verifyTransaction(
    hash: Hash,
    walletAddress: Address,
    expectedStatus: "success" | "reverted" = "success"
  ): Promise<TransactionReceipt> {
    this.updateStatus(`Waiting for transaction ${hash}...`, true);
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    this.updateStatus(`Transaction status: ${receipt.status === "success" ? "success" : "failed"}`, true);
    
    if (receipt.status !== expectedStatus) {
      throw new Error(`Transaction ${expectedStatus === "success" ? "failed" : "succeeded"} unexpectedly. Hash: ${hash}`);
    }

    const newTransaction: Transaction = {
      id: `tx-${Date.now()}`,
      type: "swap",
      details: {
        txHash: hash,
        timestamp: Date.now(),
        status: receipt.status,
      }
    };
    recordTransaction(walletAddress, newTransaction);
    
    return receipt;
  }

  private async getTokenBalance(tokenAddress: Address, walletAddress: Address): Promise<bigint> {
    this.updateStatus(`Fetching balance for ${tokenAddress}...`, true);
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
  ): Promise<Hash | undefined> {
    this.updateStatus("Checking token approval..."); // Main status
    this.updateStatus(`Checking allowance for token ${tokenAddress}...`, true);
    try {
      const walletAddress = wallet.getAddress() as Address;
      
      // Check current allowance
      const currentAllowance = await this.publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [walletAddress, spenderAddress],
      }) as bigint;

      this.updateStatus(`Current allowance: ${formatUnits(currentAllowance, 18)}`, true);

      // If allowance is sufficient, no need to approve
      if (currentAllowance >= amount) {
        this.updateStatus("Token already approved", true);
        this.updateStatus("Token approved successfully"); // Main status
        return undefined; // Return undefined if no approval tx was sent
      }

      this.updateStatus("Approving token..."); // Main status
      this.updateStatus("Preparing approval transaction...", true);
      
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

      this.updateStatus(`Approval transaction sent: ${hash}`, true);

      // Wait for approval transaction and verify it succeeded
      const receipt = await this.verifyTransaction(hash as Hash, walletAddress);
      
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

      this.updateStatus("Token approved successfully"); // Main status
      return hash as Hash; // Return the approval transaction hash
    } catch (error) {
      console.error("Error in token approval:", error);
      throw new Error(`Failed to approve token: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
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
    this.updateStatus("Initializing swap...");
    console.log("Swap action triggered");
    const walletAddress = wallet.getAddress() as Address;
    this.updateStatus(`Wallet address: ${walletAddress}`, true);

    const { tokenIn, tokenOut, amountIn, minAmountOut, fee = 3000 } = args;
    let approvalTxHash: Hash | undefined; // Declared here
    let swapTxHash: Hash | undefined; // Declared here

    try {
      // Get token addresses from symbols
      const tokenInAddress = TOKEN_ADDRESSES[tokenIn];
      const tokenOutAddress = TOKEN_ADDRESSES[tokenOut];

      this.updateStatus(`Swapping ${amountIn} ${tokenIn} for ${tokenOut}`); // Main status
      this.updateStatus(`Token addresses - In: ${tokenInAddress}, Out: ${tokenOutAddress}`, true);

      // Get balances BEFORE swap
      const balanceBeforeInput = await this.getTokenBalance(tokenInAddress, walletAddress);
      const balanceBeforeOutput = await this.getTokenBalance(tokenOutAddress, walletAddress);
      this.updateStatus(`Balance before swap (${tokenIn}): ${formatUnits(balanceBeforeInput, 18)}`, true);
      this.updateStatus(`Balance before swap (${tokenOut}): ${formatUnits(balanceBeforeOutput, 18)}`, true);

      const amountInParsed = parseUnits(amountIn, 18);
      if (balanceBeforeInput < amountInParsed) {
        throw new Error(`Insufficient ${tokenIn} balance. Required: ${amountIn}, Available: ${formatUnits(balanceBeforeInput, 18)}`);
      }

      // Parse amounts
      const minAmountOutParsed = parseUnits(minAmountOut, 18);

      // Get pool configuration
      const poolKey: PoolKey = POOL_CONFIGS.USDC_UNI; // Explicitly type PoolKey

      // Determine swap direction
      const zeroForOne = tokenIn === "USDC";
      this.updateStatus(`Swap direction: ${zeroForOne ? "USDC to UNI" : "UNI to USDC"}`, true);

      // Approve token before swap
      approvalTxHash = await this.approveToken(
        wallet,
        tokenInAddress,
        CONTRACT_ADDRESSES.TRADE_HANDLER,
        amountInParsed
      ); // Capture the returned hash

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

      this.updateStatus("Sending swap transaction..."); // Main status
      // Use wallet's sendTransaction method
      swapTxHash = await wallet.sendTransaction({
        to: CONTRACT_ADDRESSES.TRADE_HANDLER,
        data: data,
      }) as Hash;

      this.updateStatus(`Swap transaction sent: ${swapTxHash}`, true);
      const receipt = await this.verifyTransaction(swapTxHash, walletAddress, "success");

      // Get balances AFTER swap
      const balanceAfterInput = await this.getTokenBalance(tokenInAddress, walletAddress);
      const balanceAfterOutput = await this.getTokenBalance(tokenOutAddress, walletAddress);

      this.updateStatus(`Balance after swap (${tokenIn}): ${formatUnits(balanceAfterInput, 18)}`, true);

      if (balanceAfterInput >= balanceBeforeInput) {
        throw new Error(`Swap transaction succeeded but token balance did not decrease. Before: ${formatUnits(balanceBeforeInput, 18)}, After: ${formatUnits(balanceAfterInput, 18)}`);
      }

      const balanceChange = balanceBeforeInput - balanceAfterInput;
      this.updateStatus(`Balance change: ${formatUnits(balanceChange, 18)} ${tokenIn}`, true);

      // Check if we received the output token
      this.updateStatus(`Output token balance: ${formatUnits(balanceAfterOutput, 18)} ${tokenOut}`, true);

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
            url: approvalTxHash ? `https://base-sepolia.blockscout.com/tx/${approvalTxHash}` : undefined
          },
          swap: {
            hash: swapTxHash,
            url: swapTxHash ? `https://base-sepolia.blockscout.com/tx/${swapTxHash}` : undefined
          }
        }
      };

      // Store swap transaction with balances and response
      await recordTransaction(walletAddress, {
        id: `tx-${Date.now()}`,
        type: "swap",
        details: {
          tokens: [tokenIn, tokenOut],
          amounts: [amountIn, minAmountOut],
          balances: {
            before: {
              [tokenIn]: formatUnits(balanceBeforeInput, 18),
              [tokenOut]: formatUnits(balanceBeforeOutput, 18),
            },
            after: {
              [tokenIn]: formatUnits(balanceAfterInput, 18),
              [tokenOut]: formatUnits(balanceAfterOutput, 18),
            }
          },
          timestamp: Date.now(),
          txHash: swapTxHash,
          status: receipt.status,
          response, // Store the full response object
        }
      });

      this.updateStatus("Swap completed successfully!"); // Main status
      return JSON.stringify(response);
    } catch (error: unknown) {
      console.error("Error in swap action:", error);
      throw new Error(`Failed to perform swap: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  supportsNetwork(network: Network): boolean {
    return network.networkId === "base-sepolia";
  }
}

export const swapActionProvider = (statusCallback?: (status: string, isDetailed?: boolean) => void) => {
  return new SwapActionProvider(statusCallback);
};