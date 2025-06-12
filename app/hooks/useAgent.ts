// app/hooks/useAgent.ts
import { useState, useRef } from "react";
import { AgentRequest, StreamEvent, StreamMessageType } from "../types/api";

// The messageAgent function is no longer needed as we are streaming responses.
// It will be removed.

export function useAgent() {
  const [messages, setMessages] = useState<
    { text: string; sender: "user" | "agent" }[]
  >([]);
  const [isThinking, setIsThinking] = useState(false);
  const [swapStatus, setSwapStatus] = useState<string | null>(null);
  const [detailedSwapLogs, setDetailedSwapLogs] = useState<string[]>([]); // New state for detailed logs
  const [showCelebration, setShowCelebration] = useState(false); // New state for celebration overlay
  const currentAgentResponse = useRef<string>(""); // Ref to accumulate agent response chunks
  const swapCompletedSuccessfully = useRef<boolean>(false); // Ref to track if swap finished successfully

  const sendMessage = async (input: string) => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { text: input, sender: "user" }]);
    setIsThinking(true);
    setSwapStatus(null);
    setDetailedSwapLogs([]); // Clear detailed logs for new message
    setShowCelebration(false); // Hide celebration on new message
    currentAgentResponse.current = ""; // Reset accumulated response for new message
    swapCompletedSuccessfully.current = false; // Reset swap success flag

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: input } as AgentRequest),
      });

      if (!response.body) {
        throw new Error("Response body is null.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        const chunk = decoder.decode(value, { stream: true });

        // SSE messages are prefixed with 'data: '
        const lines = chunk.split('\n').filter(line => line.startsWith('data: ')).map(line => line.substring(6));

        for (const line of lines) {
          try {
            const event: StreamEvent = JSON.parse(line);
            if (event.type === StreamMessageType.AGENT_RESPONSE) {
              currentAgentResponse.current += event.content;
            } else if (event.type === StreamMessageType.SWAP_STATUS) {
              setSwapStatus(event.status);
              if (event.status === "Swap completed successfully!") {
                swapCompletedSuccessfully.current = true;
              }
            } else if (event.type === StreamMessageType.DETAILED_STATUS) {
              setDetailedSwapLogs((prev) => [...prev, event.message]); // Add detailed message
            }
          } catch (parseError) {
            console.error("Error parsing SSE event:", parseError, "Line:", line);
          }
        }

        if (done) {
          // When the stream is done, process the final agent response
          if (currentAgentResponse.current.trim() !== "") {
            setMessages((prev) => [
              ...prev,
              { text: currentAgentResponse.current, sender: "agent" },
            ]);
          } else if (swapCompletedSuccessfully.current) {
            // If swap completed successfully but no agent response, add a default message
            setMessages((prev) => [
              ...prev,
              { text: "Swap completed successfully!", sender: "agent" },
            ]);
          } else {
            // Fallback for general cases where no meaningful response came back
            setMessages((prev) => [
              ...prev,
              { text: "No response received.", sender: "agent" },
            ]);
          }
          break; // Exit the loop
        }
      }
    } catch (error) {
      console.error("Error communicating with agent:", error);
      setMessages((prev) => [
        ...prev,
        { text: "Sorry, there was an error processing your request.", sender: "agent" },
      ]);
    } finally {
      setIsThinking(false);
      setSwapStatus(null); // Clear main swap status
      setDetailedSwapLogs([]); // Clear detailed logs when process ends
      if (swapCompletedSuccessfully.current) {
        setShowCelebration(true); // Show celebration if swap was successful
      }
    }
  };

  return { messages, sendMessage, isThinking, swapStatus, setSwapStatus, detailedSwapLogs, showCelebration, setShowCelebration }; // Export new state
}
