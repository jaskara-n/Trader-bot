import mongoose, { Schema, Document } from "mongoose";
import type { Transaction } from "@/app/types/transactions";
// Connect to MongoDB
export interface WalletDataDoc extends Document {
  wallet?: string | null;
  transactions: Transaction[];
}
// Schema for storing wallet transactions
const WalletDataSchema = new Schema<WalletDataDoc>({
  wallet: { type: String, required: false, index: true }, // not required for stake
  transactions: { type: Schema.Types.Mixed, default: [] },
});

// Use "walletdata" collection (third param)
export default mongoose.models.WalletData ||
  mongoose.model<WalletDataDoc>("WalletData", WalletDataSchema, "walletdata");
