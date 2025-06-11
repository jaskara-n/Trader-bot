// app/api/agent/route.ts
import { AgentRequest, AgentResponse, StreamEvent, StreamMessageType, AgentStreamResponse, SwapStatusStreamResponse } from "@/app/types/api";
import { NextResponse } from "next/server";
import { createAgent } from "./create-agent";
import { swapActionProvider } from "./actions/swap"; // Correct import for the instance creator

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
        // The callback from createAgent will now handle both detailed and main statuses.
        // We keep this line to ensure the instance's own setStatusCallback is used if the agent was cached.
        swapActionProviderInstance.setStatusCallback(
          (status: string, isDetailed: boolean = false) => {
            if (isDetailed) {
              sendEvent({ type: StreamMessageType.DETAILED_STATUS, message: status });
            } else {
              sendEvent({ type: StreamMessageType.SWAP_STATUS, status });
            }
          }
        );

        const agentStream = await agent.stream(
          { messages: [{ content: userMessage, role: "user" }] },
          { configurable: { thread_id: "AgentKit Discussion" } }
        );

        for await (const chunk of agentStream) {
          if ("agent" in chunk) {
            const agentResponse: AgentStreamResponse = {
              type: StreamMessageType.AGENT_RESPONSE,
              content: chunk.agent.messages[0].content,
            };
            sendEvent(agentResponse);
          }
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
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
