import connectDB from "./db";
import WalletData from "@/app/models/WalletData";

export interface ConversationEntry {
  userInput: string;
  response: string;
  timestamp: number;
}

export async function recordConversation(wallet: string, entry: ConversationEntry): Promise<void> {
  await connectDB();
  await WalletData.findOneAndUpdate(
    { wallet },
    { $push: { conversations: entry } },
    { upsert: true, new: true }
  );
}

export async function getConversations(wallet: string): Promise<ConversationEntry[]> {
  await connectDB();
  const doc = await WalletData.findOne({ wallet });
  return doc?.conversations || [];
}
