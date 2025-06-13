// app/api/agent/route.ts
import { AgentRequest, StreamEvent, StreamMessageType, AgentStreamResponse } from "@/app/types/api";
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
    console.error("Error initializing XMTP:", error);
    return NextResponse.json({ error: "Failed to initialize XMTP" }, { status: 500 });
  }
}
initializeXmtp();

export async function POST(
  req: Request & { json: () => Promise<AgentRequest> }
): Promise<NextResponse> {
  try {
    const { userMessage } = await req.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: StreamEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        const { agent, swapActionProviderInstance } = await createAgent(
          (status: string, isDetailed: boolean = false) => {
            if (isDetailed) {
              sendEvent({ type: StreamMessageType.DETAILED_STATUS, message: status });
            } else {
              sendEvent({ type: StreamMessageType.SWAP_STATUS, status });
            }
          }
        );

        // Set status callback on the returned instance (this is already set via createAgent now, but for clarity)
        swapActionProviderInstance.setStatusCallback(
          (status: string, isDetailed: boolean = false) => {
            if (isDetailed) {
              sendEvent({ type: StreamMessageType.DETAILED_STATUS, message: status });
            } else {
              sendEvent({ type: StreamMessageType.SWAP_STATUS, status });
            }
          }
        );

        let agentResponse = ""; // Accumulate agent response here for recordStakeConversation
        const agentStream = await agent.stream(
          { messages: [{ content: userMessage, role: "user" }] },
          { configurable: { thread_id: "AgentKit Discussion" } }
        );

        for await (const chunk of agentStream) {
          if ("agent" in chunk) {
            const content = chunk.agent.messages[0].content;
            agentResponse += content; // Accumulate content
            const agentStreamResponse: AgentStreamResponse = {
              type: StreamMessageType.AGENT_RESPONSE,
              content: content,
            };
            sendEvent(agentStreamResponse);
          }
        }

        // Only for staking commands with amount, log conversation (without wallet)
        if (isStakeWithAmount(userMessage)) {
          await recordStakeConversation(userMessage, agentResponse);
        }

        controller.close();
      },
      cancel() {
        console.log("Client disconnected.");
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Error in agent route:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

