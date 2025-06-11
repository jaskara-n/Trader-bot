import connectDB from './db';
import WalletData, { WalletDataDoc } from '@/app/models/WalletData';
import type { Transaction } from '@/app/types/transactions';

export async function recordTransaction(wallet: string, tx: Transaction): Promise<void> {
  if (!wallet) throw new Error("Wallet address is required for logging transaction");
  await connectDB();
  await WalletData.findOneAndUpdate(
    { wallet },
    { $push: { transactions: tx } },
    { upsert: true, new: true }
  );
}

export async function getTransactions(wallet: string): Promise<Transaction[]> {
  await connectDB();
  const data: WalletDataDoc | null = await WalletData.findOne({ wallet });
  return data?.transactions || [];
}