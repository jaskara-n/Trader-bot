import connectDB from "../utils/db";
// import TraderBotEntryModel from "@/app/models/TraderBotEntry";

// export async function getConversationSummaries(): Promise<string[]> {
//   await connectDB();

//   const entries = await TraderBotEntryModel.find({ type: "conversation" })
    // .sort({ timestamp: 1 })
    // .select("userInput response -_id");

//   return entries.map(
    // entry =>
    //   `User: ${entry.userInput?.trim()}\nAgent: ${entry.response?.trim()}`
//   );
// }