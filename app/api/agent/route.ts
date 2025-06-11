// app/api/agent/route.ts
import { AgentRequest, AgentResponse } from "@/app/types/api";
import { NextResponse } from "next/server";
import { createAgent } from "./create-agent";
// import { recordConversation} from "@/app/utils/conversationLogger";

// Initialize XMTP in background (non-blocking)
async function initializeXmtp() {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/xmtp`
    );
  } catch (error) {
    console.log("XMTP initialization in progress...");
  }
}

// Call this once when server starts
initializeXmtp();

/**
 * Original HTTP endpoint - works as before
 */

export async function POST(
  req: Request & { json: () => Promise<AgentRequest> }
): Promise<NextResponse<AgentResponse>> {
  try {
    const { userMessage} = await req.json(); 
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

    // const safeWallet = wallet?.toLowerCase();

    // await recordConversation(safeWallet, {
    //   userInput: userMessage,
    //   response: agentResponse,
    //   timestamp: Date.now(),
    // });

    return NextResponse.json({ response: agentResponse });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Failed to process message" });
  }
}