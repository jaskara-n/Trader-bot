import { AgentRequest, AgentResponse } from "@/app/types/api";
import { NextResponse } from "next/server";
import { createAgent } from "./create-agent";
import { recordStakeConversation } from "@/app/utils/transactionStore";

// Helper: Detect stake with amount (stake 1, stake 2 ETH, etc.)
function isStakeWithAmount(message: string): boolean {
  const stakeRegex = /\bstake\b\s+([\d,.]+)\s*\w*/i;
  return stakeRegex.test(message);
}

// (Optional: Keep this if you need XMTP background init)
async function initializeXmtp() {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/xmtp`
    );
  } catch (error) {
    console.log("XMTP initialization in progress...");
  }
}
initializeXmtp();

export async function POST(
  req: Request & { json: () => Promise<AgentRequest> }
): Promise<NextResponse<AgentResponse>> {
  try {
    const { userMessage } = await req.json();
    const agent = await createAgent();

    let agentResponse = "";
    const stream = await agent.stream(
      { messages: [{ content: userMessage, role: "user" }] },
      { configurable: { thread_id: "AgentKit Discussion" } }
    );
    for await (const chunk of stream) {
      if ("agent" in chunk) {
        agentResponse += chunk.agent.messages[0].content;
      }
    }

    // Only for staking commands with amount, log conversation (without wallet)
    if (isStakeWithAmount(userMessage)) {
      await recordStakeConversation(userMessage, agentResponse);
    }

    return NextResponse.json({ response: agentResponse });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Failed to process message" });
  }
}
