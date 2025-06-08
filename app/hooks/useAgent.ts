// app/hooks/useAgent.ts - IMMEDIATE FIX (no XMTP imports)
import { useState } from "react";
import { AgentRequest, AgentResponse } from "../types/api";

async function messageAgent(userMessage: string): Promise<string | null> {
  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage } as AgentRequest),
    });

    const data = (await response.json()) as AgentResponse;
    return data.response ?? data.error ?? null;
  } catch (error) {
    console.error("Error communicating with agent:", error);
    return null;
  }
}

export function useAgent() {
  const [messages, setMessages] = useState<
    { text: string; sender: "user" | "agent" }[]
  >([]);
  const [isThinking, setIsThinking] = useState(false);

  const sendMessage = async (input: string) => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { text: input, sender: "user" }]);
    setIsThinking(true);

    const responseMessage = await messageAgent(input);

    if (responseMessage) {
      setMessages((prev) => [
        ...prev,
        { text: responseMessage, sender: "agent" },
      ]);
    }

    setIsThinking(false);
  };

  return { messages, sendMessage, isThinking };
}
