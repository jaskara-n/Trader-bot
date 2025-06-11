import mongoose, { Schema, Document } from "mongoose";

export interface TraderBotEntry extends Document {
  type: "conversation" | "transaction";
  // Conversation fields
  userInput?: string;
  response?: string;
  // Common fields
  timestamp: number;
  id: string;
}

const TraderBotEntrySchema = new Schema<TraderBotEntry>({
  type: { type: String, enum: ["conversation"], required: true },
  userInput: String,
  response: String,
  timestamp: { type: Number, required: true },
  id: { type: String, required: true, unique: true },
});

export default mongoose.models.TraderBotEntry ||
  mongoose.model<TraderBotEntry>("TraderBotEntry", TraderBotEntrySchema, "traderbot");