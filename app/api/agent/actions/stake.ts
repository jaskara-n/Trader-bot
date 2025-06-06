// import { z } from "zod";
// import { ActionProvider, WalletProvider } from "@coinbase/agentkit";
// import {
//   Coinbase,
//   ExternalAddress,
//   StakeOptionsMode,
// } from "@coinbase/coinbase-sdk";

// const StakeInputSchema = z.object({
//   amount: z.number().positive().describe("Amount of ETH to stake"),
//   walletAddress: z.string().describe("Wallet address to stake from"),
// });

// type StakeInput = z.infer<typeof StakeInputSchema>;

// interface StakeResponse {
//   success: boolean;
//   message: string;
//   data?: {
//     operationId: string;
//     amount: number;
//     stakeableBalance: number;
//   };
// }

// /**
//  * Provider for staking ETH on the ethereum-holesky testnet network
//  */
// export class StakeActionProvider extends ActionProvider<WalletProvider> {
//   readonly name = "stake";
//   readonly inputSchema = StakeInputSchema;

//   constructor() {
//     super("stake", []);
//   }

//   supportsNetwork(): boolean {
//     return true;
//   }

//   async act(
//     walletProvider: WalletProvider,
//     input: StakeInput
//   ): Promise<StakeResponse> {
//     const { amount, walletAddress } = input;

//     try {
//       if (!process.env.COINBASE_API_KEY_FILE) {
//         throw new Error(
//           "COINBASE_API_KEY_FILE environment variable is not set"
//         );
//       }

//       Coinbase.configureFromJson({
//         filePath: process.env.COINBASE_API_KEY_FILE,
//       });

//       const address = new ExternalAddress(
//         Coinbase.networks.BaseSepolia,
//         walletAddress
//       );

//       const stakeableBalance = await address.stakeableBalance(
//         Coinbase.assets.Eth,
//         StakeOptionsMode.PARTIAL
//       );

//       const stakeableBalanceNum = parseFloat(stakeableBalance.toString());
//       if (amount > stakeableBalanceNum) {
//         return {
//           success: false,
//           message: `Insufficient stakeable balance. Available: ${stakeableBalanceNum} ETH`,
//         };
//       }

//       const stakingOperation = await address.buildStakeOperation(
//         amount,
//         Coinbase.assets.Eth,
//         StakeOptionsMode.PARTIAL
//       );

//       return {
//         success: true,
//         message: `Successfully initiated staking operation for ${amount} ETH`,
//         data: {
//           operationId: stakingOperation.getID(),
//           amount,
//           stakeableBalance: stakeableBalanceNum,
//         },
//       };
//     } catch (error) {
//       return {
//         success: false,
//         message:
//           error instanceof Error
//             ? error.message
//             : "Unknown error occurred during staking",
//       };
//     }
//   }
// }

// export const stakeActionProvider = () => new StakeActionProvider();
