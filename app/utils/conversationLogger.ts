import connectDB from "./db";
import WalletData from "@/app/models/WalletData";

export interface ConversationEntry {
  userInput: string;
  response: string;
  timestamp: number;
}
/* * Records a conversation entry for a specific wallet.
 * @param wallet - The wallet address to log the conversation against.
  * @param entry - The conversation entry to log, containing user input, response, and timestamp.
  * @returns A promise that resolves when the conversation entry is recorded.
  * This function updates the wallet's conversation history in the database.
  * If the wallet does not exist, it will create a new entry.
  * This is useful for tracking user interactions and responses in a conversational context.
  * If no wallet is provided, it will log a general conversation entry.
  */
export async function recordConversation(wallet: string, entry: ConversationEntry): Promise<void> {
  await connectDB();
  await WalletData.findOneAndUpdate(
    { wallet },
    { $push: { conversations: entry } },
    { upsert: true, new: true }
  );
}
// Fetches all conversations for a specific wallet
export async function getConversations(wallet: string): Promise<ConversationEntry[]> {
  await connectDB();
  const doc = await WalletData.findOne({ wallet });
  return doc?.conversations || [];
}
