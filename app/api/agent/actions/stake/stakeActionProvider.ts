// @ts-ignore
import { ActionProvider, CreateAction, Network } from "@coinbase/agentkit";
import type { z } from "zod";
import fs from "fs";
import path from "path";
import { swapActionSchema } from "./schema";
import { ChatDeepSeek } from "@langchain/deepseek";
import {
  Coinbase,
  ExternalAddress,
  StakeOptionsMode,
} from "@coinbase/coinbase-sdk";
import { ViemWalletProvider } from "@coinbase/agentkit";
/**
 * Frontend generator using contract analysis, metrics, and optional ABI data.
 */
class SwapActionProvider extends ActionProvider {
  constructor() {
    super("stake-action-provider", []);
  }

  @CreateAction({
    name: "stake-action-provider",
    description:
      "Stakes a user's given token address using coinbase stake api ",
    schema: swapActionSchema,
  })
  public async stakeAction(
    wallet: ViemWalletProvider,
    args: z.infer<typeof swapActionSchema>
  ): Promise<string> {
    console.log("staking action triggered");
    console.log("wallet address:", wallet.getAddress());

    const { token } = args;
    try {
      // Coinbase.configureFromJson({
      //   filePath: process.env.COINBASE_API_KEY_FILE,
      // });
      Coinbase.configure({
        apiKeyName: process.env.CDP_API_KEY_NAME || "",
        privateKey: process.env.CDP_API_KEY_PRIVATE_KEY || "",
      });

      const address = new ExternalAddress(
        Coinbase.networks.BaseSepolia,
        wallet.getAddress()
      );

      const stakeableBalance = await address.stakeableBalance(
        Coinbase.assets.Eth,
        StakeOptionsMode.PARTIAL
      );

      console.log("stakeableBalance:", stakeableBalance.toString());

      // const stakeableBalanceNum = parseFloat(stakeableBalance.toString());
      // if (amount > stakeableBalanceNum) {
      //   return {
      //     success: false,
      //     message: `Insufficient stakeable balance. Available: ${stakeableBalanceNum} ETH`,
      //   };
      // }

      // const stakingOperation = await address.buildStakeOperation(
      //   amount,
      //   Coinbase.assets.Eth,
      //   StakeOptionsMode.PARTIAL
      // );

      // return {
      //   success: true,
      //   message: `Successfully initiated staking operation for ${amount} ETH`,
      //   data: {
      //     operationId: stakingOperation.getID(),
      //     amount,
      //     stakeableBalance: stakeableBalanceNum,
      //   },
      // };
    } catch (error: unknown) {
      console.error("Error in staking:", error);
    }
    return "staking action invoked with token: " + token;
  }
  supportsNetwork(network: Network): boolean {
    return true;
  }
}

export const stakeActionProvider = () => {
  return new SwapActionProvider();
};
