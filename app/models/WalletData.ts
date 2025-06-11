import mongoose, { Schema, Document } from "mongoose";
import type { Transaction } from "@/app/types/transactions";

// export interface ConversationEntry {
//   userInput: string;
//   response: string;
//   timestamp: number;
// }

export interface WalletDataDoc extends Document {
  wallet: string;
  transactions: Transaction[];
//   conversations: ConversationEntry[];
}

const WalletDataSchema = new Schema<WalletDataDoc>({
  wallet: { type: String, required: true, unique: true, index: true },
  transactions: { type: Schema.Types.Mixed, default: [] }, 
//   conversations: [
//     {
//       userInput: String,
//       response: String,
//       timestamp: Number,
//     },
//   ],
});

export default mongoose.models.WalletData ||
  mongoose.model<WalletDataDoc>("WalletData", WalletDataSchema, "walletdata");