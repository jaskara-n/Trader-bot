import connectDB from './db';
import WalletData, { WalletDataDoc } from '@/app/models/WalletData';
import type { Transaction, StakeConversationTransaction } from '@/app/types/transactions';

// --- Existing function: swap (with wallet) ---
export async function recordTransaction(wallet: string, tx: Transaction): Promise<void> {
  if (!wallet) throw new Error("Wallet address is required for logging transaction");
  await connectDB();
  await WalletData.findOneAndUpdate(
    { wallet },
    { $push: { transactions: tx } },
    { upsert: true, new: true }
  );
}

// --- NEW: Staking conversations (NO wallet) ---
export async function recordStakeConversation(userInput: string, response: string): Promise<void> {
  await connectDB();
  const tx: StakeConversationTransaction = {
    id: `stake-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'stake',
    details: {
      userInput,
      response,
      timestamp: Date.now(),
    }
  };
  // Store in a general "stake" document, no wallet needed
  await WalletData.findOneAndUpdate(
    { wallet: null }, // filter: store all stake logs together
    { $push: { transactions: tx } },
    { upsert: true, new: true }
  );
}

export async function getTransactions(wallet: string): Promise<Transaction[]> {
  await connectDB();
  const data: WalletDataDoc | null = await WalletData.findOne({ wallet });
  return data?.transactions || [];
}

export async function getStakeConversations(): Promise<StakeConversationTransaction[]> {
  await connectDB();
  const data: WalletDataDoc | null = await WalletData.findOne({ wallet: null });
  if (!data) return [];
  // Only return transactions that look like StakeConversationTransaction
  return (data.transactions || []).filter(
    (tx: any): tx is StakeConversationTransaction =>
      tx.type === 'stake' &&
      tx.details &&
      typeof tx.details.userInput === 'string' &&
      typeof tx.details.response === 'string'
  );
}

