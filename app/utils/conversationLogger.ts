import connectDB from "./mongo";
import TraderBotEntry from "@/app/models/TraderBotEntry";

export interface ConversationLogEntry {
  id: string;
  timestamp: number;
  userInput: string;
  response: string;
}

export async function recordConversationLog(entry: ConversationLogEntry): Promise<void> {
  await connectDB();
  await TraderBotEntry.create({
    ...entry,
    type: "conversation",
  });
}
