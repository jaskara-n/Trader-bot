import connectDB from './db';
import WalletData from '@/app/models/WalletData';
import type { Transaction } from '@/app/types/transactions';

/** Retrieves all transactions across all wallets from the database.
 * 
 * @returns A promise that resolves to an array of all transactions across all wallets.
 * This function retrieves all transactions stored in the database, regardless of the wallet.
 * This is useful for aggregating insights or analytics across all user transactions.
 * If no transactions are found, it returns an empty array.
 */
export async function getAllTransactions(): Promise<Transaction[]> {
  await connectDB();
  // Find all docs in the walletdata collection
  const docs = await WalletData.find({});
  // Flatten all transactions from all docs
  const allTxs: Transaction[] = docs.flatMap(doc => doc.transactions || []);
  return allTxs;
}
